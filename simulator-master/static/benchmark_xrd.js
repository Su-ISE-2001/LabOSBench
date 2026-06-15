// XRD Benchmark Frontend Logger
// 负责在 XRD Web 模拟器中记录一次 episode 的详细日志，
// 并生成符合 xrd_benchmark/schema.json 的 JSON 对象。

(function () {
  // 仅在 XRD 模拟器页面生效（简单通过 URL 路径判断）
  if (typeof window === "undefined") return;
  const path = window.location.pathname || "";
  if (!path.includes("XRD_simulator.html")) {
    // 不是 XRD 主界面则不初始化
    return;
  }

  // ---- 基础工具 ----
  function nowIso() {
    return new Date().toISOString();
  }

  function genEpisodeId() {
    // 简单基于时间戳的 episode id
    return "xrd_ep_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1e6).toString(36);
  }

  // 全局基准时间（用于 steps 中的 timestamp_offset_sec）
  const t0 = performance.now();

  // ---- 日志主结构（与 schema.json 对齐的最小子集）----
  const episode = {
    _t0: t0,
    task_id: "XRD-Scan-And-Save-01",
    episode_id: genEpisodeId(),
    env: "XRD_Simulator",
    agent_name: null,
    success: false,
    timestamps: {
      start_time: nowIso(),
      end_time: null,
      duration_sec: 0
    },
    summary: {
      optimal_steps: 12,          
      actual_steps: 0,
      step_efficiency: 0
    },
    grounding_metrics: {
      widget_grounding_accuracy: 0,
      text_grounding_accuracy: 0,
      state_grounding_accuracy: 0
    },
    // 按 schema 要求，subtasks 是数组；我们内部用一个 map 来管理，再导出数组
    _subtask_map: {
      S1: { subtask_id: "S1", name: "SelectSpecimen", success: false, attempts: 0, phase: "setup", grounding_focus: ["widget", "text"], success_criteria: "Specimen dropdown is set to a non-empty valid sample." },
      S2: { subtask_id: "S2", name: "OpenDoors",      success: false, attempts: 0, phase: "chamber_transition", grounding_focus: ["widget", "state"], success_criteria: "The chamber door opens and the sample-loading transition begins." },
      S2a: { subtask_id: "S2a", name: "CloseDoors",   success: false, attempts: 0, phase: "chamber_transition", grounding_focus: ["widget", "state"], success_criteria: "The chamber door closes after loading and the system returns to a closed state." },
      S3: { subtask_id: "S3", name: "PowerUp",        success: false, attempts: 0, phase: "power_prep", grounding_focus: ["widget", "state"], success_criteria: "Standby is engaged and power reaches the ready state." },
      S4: { subtask_id: "S4", name: "SetAngles",      success: false, attempts: 0, phase: "parameter_setup", grounding_focus: ["widget", "state"], success_criteria: "Start/end angles remain within bounds and satisfy start_angle < end_angle - 5." },
      S5: { subtask_id: "S5", name: "SetStepSize",    success: false, attempts: 0, phase: "parameter_setup", grounding_focus: ["widget", "text"], success_criteria: "A legal non-empty STEP SIZE option is selected." },
      S6: { subtask_id: "S6", name: "SetScanRate",    success: false, attempts: 0, phase: "parameter_setup", grounding_focus: ["widget", "text"], success_criteria: "A legal non-empty SCAN RATE option is selected." },
      S7: { subtask_id: "S7", name: "RunScan",        success: false, attempts: 0, phase: "execution", grounding_focus: ["widget", "state"], success_criteria: "Scan starts only after parameters are ready and completes until Save becomes available." },
      S8: { subtask_id: "S8", name: "SaveResult",     success: false, attempts: 0, phase: "finalization", grounding_focus: ["widget", "state"], success_criteria: "The diffraction result is exported only after scan completion." }
    },
    subtasks: [],
    steps: []
  };

  // 下一个 step 索引
  let stepIndex = 0;

  // ---- 状态快照：从 XRD_simulator.js 的全局变量和 DOM 推断当前环境状态 ----
  function getStateSnapshot() {
    const snap = {
      specimen_selected: null,
      doors_open: null,    // 门是否打开
      standby_on: null,    // standby 是否开启   // 电源是否就绪（kV/mA 拉满）
      power_ready: null,
      start_angle: null,   // 起始角度
      end_angle: null,     // 终止角度
      step_val: null,      // 步长
      steptime_val: null,  // 扫描速率
      scanning: null,      // 是否正在扫描
      angle_range_valid: null,
      step_configured: null,
      scan_rate_configured: null,
      scan_ready: null,
      save_enabled: null
    };

    try {
      // 角度 & 扫描参数：直接读 XRD_simulator.js 定义的全局变量
      if (typeof window.start_angle === "number") snap.start_angle = window.start_angle;
      if (typeof window.end_angle === "number") snap.end_angle = window.end_angle;
      if (typeof window.step_val === "number") snap.step_val = window.step_val;
      if (typeof window.steptime_val === "number") snap.steptime_val = window.steptime_val;
      if (typeof window.chosen_specimen === "number") {
        snap.specimen_selected = window.chosen_specimen !== 0;
      }

      // 门状态：根据按钮 value / 文案推断
      const doorsBtn = document.querySelector("#btn-doors");
      if (doorsBtn) {
        const val = doorsBtn.value; // "on" / "off"
        const text = (doorsBtn.innerText || "").trim(); // "OPEN" / "CLOSE"
        snap.doors_open = (val === "on") || (text === "CLOSE");
      }

      // standby / power 状态：看 standby 按钮 value 和类名
      const standbyBtn = document.querySelector("#btn-standby");
      if (standbyBtn) {
        const val = standbyBtn.value;
        snap.standby_on = (val === "on");
        // 在 increasePower_fn 里，电源就绪时会给 standby 加 green-halo
        snap.power_ready = standbyBtn.classList.contains("green-halo");
      }

      // 扫描状态：看 start-scan 按钮文案
      const startScanBtn = document.querySelector("#btn-start-scan");
      if (startScanBtn) {
        const text = (startScanBtn.innerText || "").trim();
        snap.scanning = (text === "SCANNING");
        snap.scan_ready = !startScanBtn.disabled;
      }

      const saveBtn = document.querySelector("#btn-save-dff");
      if (saveBtn) {
        snap.save_enabled = !saveBtn.disabled;
      }

      snap.angle_range_valid =
        typeof snap.start_angle === "number" &&
        typeof snap.end_angle === "number" &&
        snap.start_angle >= 5 &&
        snap.end_angle <= 110 &&
        snap.start_angle < (snap.end_angle - 5);
      snap.step_configured = typeof snap.step_val === "number" && snap.step_val > 0;
      snap.scan_rate_configured = typeof snap.steptime_val === "number" && snap.steptime_val > 0;
    } catch (e) {
      console.warn("XRD benchmark: failed to read internal state", e);
    }

    return snap;
  }

  // ---- 记录一步操作 ----
  function recordStep(params) {
    const now = performance.now();
    const offset = (now - t0) / 1000.0;

    const step = {
      index: stepIndex++,
      timestamp_offset_sec: offset,
      subtask_id: params.subtask_id || null,
      action_type: params.action_type || "click",
      target: {
        dom_selector: params.dom_selector || null,
        bbox: params.bbox || [],
        text: params.text || null
      },
      hit_expected_target: params.hit_expected_target ?? true,
      relies_on_text: params.relies_on_text ?? false,
      chosen_text: params.chosen_text ?? null,
      state_snapshot: params.state_snapshot || getStateSnapshot(),
      reward: null,
      agent_comment: null
    };

    episode.steps.push(step);
    episode.summary.actual_steps = episode.steps.length;
  }

  // ---- grounding 计数器的简单更新函数 ----
  function updateGroundingMetric(metricName, isCorrect) {
    const gm = episode.grounding_metrics;
    const totalKey = "_" + metricName + "_total";
    const hitKey = "_" + metricName + "_hits";
    const accuracyKey = metricName + "_accuracy";

    gm[totalKey] = (gm[totalKey] || 0) + 1;
    if (isCorrect) {
      gm[hitKey] = (gm[hitKey] || 0) + 1;
    }
    gm[accuracyKey] = (gm[hitKey] || 0) / Math.max(gm[totalKey], 1);
  }

  function updateWidgetGrounding(isCorrect) {
    updateGroundingMetric("widget_grounding", isCorrect);
  }

  function updateTextGrounding(isCorrect) {
    updateGroundingMetric("text_grounding", isCorrect);
  }

  function updateStateGrounding(isCorrect) {
    updateGroundingMetric("state_grounding", isCorrect);
  }

  function recomputeTextGroundingMetric() {
    const subtasks = Object.values(episode._subtask_map || {});
    const relevant = subtasks.filter(function (st) {
      return (st.attempts || 0) > 0 && Array.isArray(st.grounding_focus) && st.grounding_focus.includes("text");
    });
    if (!relevant.length) {
      episode.grounding_metrics.text_grounding_accuracy = 0;
      return;
    }
    const hits = relevant.filter(function (st) { return st.success === true; }).length;
    episode.grounding_metrics.text_grounding_accuracy = hits / relevant.length;
  }

  function isLegalStepText(text) {
    return ["0.005", "0.01", "0.02"].some(function (token) {
      return String(text || "").includes(token);
    });
  }

  function isLegalScanRateText(text) {
    return ["0.2", "0.08", "0.04"].some(function (token) {
      return String(text || "").includes(token);
    });
  }

  function evaluateClickGrounding(subtaskId, beforeSnap, afterSnap) {
    updateWidgetGrounding(true);

    switch (subtaskId) {
      case "S2":
        updateStateGrounding(beforeSnap.specimen_selected === true && beforeSnap.doors_open === false);
        break;
      case "S2a":
        updateStateGrounding(beforeSnap.doors_open === true);
        break;
      case "S3":
        updateStateGrounding(
          beforeSnap.specimen_selected === true &&
          beforeSnap.doors_open === false &&
          beforeSnap.power_ready !== true
        );
        break;
      case "S4": {
        const angleChanged =
          beforeSnap.start_angle !== afterSnap.start_angle ||
          beforeSnap.end_angle !== afterSnap.end_angle;
        updateStateGrounding(beforeSnap.power_ready === true && angleChanged && afterSnap.angle_range_valid === true);
        break;
      }
      case "S7":
        updateStateGrounding(
          beforeSnap.scan_ready === true &&
          beforeSnap.scanning === false &&
          beforeSnap.angle_range_valid === true &&
          beforeSnap.step_configured === true &&
          beforeSnap.scan_rate_configured === true
        );
        break;
      case "S8":
        updateStateGrounding(beforeSnap.scanning === false && beforeSnap.save_enabled === true);
        break;
      default:
        break;
    }
  }

  function evaluateSelectGrounding(subtaskId, afterSnap, selectedText) {
    updateWidgetGrounding(true);

    if (subtaskId === "S1") {
      const ok = afterSnap.specimen_selected === true;
      updateTextGrounding(ok);
      return;
    }

    if (subtaskId === "S5") {
      const legalText = isLegalStepText(selectedText);
      updateTextGrounding(legalText);
      updateStateGrounding(afterSnap.angle_range_valid === true && afterSnap.step_configured === true && legalText);
      return;
    }

    if (subtaskId === "S6") {
      const legalText = isLegalScanRateText(selectedText);
      updateTextGrounding(legalText);
      updateStateGrounding(
        afterSnap.angle_range_valid === true &&
        afterSnap.step_configured === true &&
        afterSnap.scan_rate_configured === true &&
        legalText
      );
    }
  }

  // ---- 子任务判定：内部默认实现 + 对外暴露的轻量 API ----
  const SUBTASKS = episode._subtask_map;

  // 通用的子任务更新函数：提供给内部和 XRD_steps.js / XRD_simulator.js 调用
  function markSubtaskAttempt(id, opts) {
    const st = SUBTASKS[id];
    if (!st) return;
    st.attempts += 1;
    if (opts && opts.success === true) {
      st.success = true;
    }
    if (opts && typeof opts.note === "string") {
      st.notes = opts.note;
    }
  }

  function markSubtaskSuccess(id) {
    markSubtaskAttempt(id, { success: true });
  }

  // ---- 控件包装：记录步骤 + 调用原有逻辑 + 更新子任务 ----
  function instrumentClick(selector, subtaskId, logicalName) {
    const el = document.querySelector(selector);
    if (!el) return;
    if (el.dataset.xrdBenchmarkClickBound === "1") return;
    el.dataset.xrdBenchmarkClickBound = "1";

    const recordClickStep = function (event) {
      const beforeSnap = getStateSnapshot();
      recordStep({
        subtask_id: subtaskId,
        action_type: "click",
        dom_selector: selector,
        text: (el.innerText || el.value || "").trim(),
        hit_expected_target: true,
        relies_on_text: false,
        state_snapshot: beforeSnap
      });

      if (subtaskId && SUBTASKS[subtaskId]) {
        markSubtaskAttempt(subtaskId, {});
      }

      // Let the simulator update synchronously, then evaluate the resulting state.
      setTimeout(function () {
        evaluateClickGrounding(subtaskId, beforeSnap, getStateSnapshot());
      }, 0);
    };
    el.addEventListener("click", recordClickStep, true);
  }

  // 专门处理门的函数：根据按钮状态动态判断是开门（S2）还是关门（S2a）
  function instrumentDoors(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    if (el.dataset.xrdBenchmarkDoorsBound === "1") return;
    el.dataset.xrdBenchmarkDoorsBound = "1";

    const recordDoorsStep = function (event) {
      const beforeSnap = getStateSnapshot();
      const isOpening = beforeSnap.doors_open === false;
      const subtaskId = isOpening ? "S2" : "S2a";

      recordStep({
        subtask_id: subtaskId,
        action_type: "click",
        dom_selector: selector,
        text: (el.innerText || el.value || "").trim(),
        hit_expected_target: true,
        relies_on_text: false,
        state_snapshot: beforeSnap
      });

      if (SUBTASKS[subtaskId]) {
        markSubtaskAttempt(subtaskId, {});
      }

      setTimeout(function () {
        evaluateClickGrounding(subtaskId, beforeSnap, getStateSnapshot());
      }, 0);
    };
    el.addEventListener("click", recordDoorsStep, true);
  }

  function instrumentSelect(selector, subtaskId, reliesOnText) {
    const el = document.querySelector(selector);
    if (!el) return;
    if (el.dataset.xrdBenchmarkSelectBound === "1") return;
    el.dataset.xrdBenchmarkSelectBound = "1";

    // 记录步骤的通用函数
    const recordSelectStep = function (text) {
      const afterSnap = getStateSnapshot();
      recordStep({
        subtask_id: subtaskId,
        action_type: "select",
        dom_selector: selector,
        text,
        hit_expected_target: true,
        relies_on_text: !!reliesOnText,
        chosen_text: text,
        state_snapshot: afterSnap
      });

      if (subtaskId && SUBTASKS[subtaskId]) {
        markSubtaskAttempt(subtaskId, {});
      }
      evaluateSelectGrounding(subtaskId, afterSnap, text);
    };

    // 如果 jQuery 存在，使用 jQuery 事件监听 selectmenuselect（jQuery UI selectmenu 触发的事件）
    // 即使 selectmenu 还没初始化，jQuery 的事件系统也会在初始化后生效
    if (typeof $ !== "undefined") {
      $(el).on("selectmenuselect", function (event, ui) {
        // ui.item.label 是 jQuery UI selectmenu 提供的选中项文本
        const text = ui.item ? ui.item.label : (el.options && el.selectedIndex >= 0
          ? el.options[el.selectedIndex].text
          : (el.value || "").trim());
        recordSelectStep(text);
      });
    } else {
      // 如果没有 jQuery，使用原生 change 事件
      el.addEventListener("change", function () {
        const text = el.options && el.selectedIndex >= 0
          ? el.options[el.selectedIndex].text
          : (el.value || "").trim();
        recordSelectStep(text);
      });
    }
  }

  function setupInstrumentation() {
    // 下拉框：样品 / 步长 / 扫描速率
    instrumentSelect("#specimen", "S1", true);
    instrumentSelect("#step", "S5", true);
    instrumentSelect("#time-step", "S6", true);

    // 按钮：门（使用特殊处理，根据状态动态判断 S2/S2a）/ standby / 扫描 / 保存
    instrumentDoors("#btn-doors");
    instrumentClick("#btn-standby", "S3", "Standby");
    instrumentClick("#btn-start-scan", "S7", "StartScan");
    instrumentClick("#btn-save-dff", "S8", "SaveDiffactogram");

    // 角度设置按钮（S4）：起始角度和终止角度的增减
    instrumentClick("#btn-start-up", "S4", "StartAngleUp");
    instrumentClick("#btn-start-dw", "S4", "StartAngleDown");
    instrumentClick("#btn-end-up", "S4", "EndAngleUp");
    instrumentClick("#btn-end-dw", "S4", "EndAngleDown");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupInstrumentation);
  } else {
    setupInstrumentation();
  }

  // ---- 结束 & 导出 ----
  function finalizeEpisode() {
    const now = nowIso();
    const tNow = performance.now();
    episode.timestamps.end_time = now;
    episode.timestamps.duration_sec = (tNow - t0) / 1000.0;

    const s = episode.summary;
    const total = episode.summary.actual_steps || 0;
    s.step_efficiency = s.optimal_steps > 0 && total > 0
      ? s.optimal_steps / Math.max(total, 1)
      : 0;

    // 汇总 subtasks
    if (episode._subtask_map) {
      episode.subtasks = Object.values(episode._subtask_map);
      episode.success = episode.subtasks.every(st => st.success);
    }

    // text grounding 改为子任务级 0/1 成功率，避免多步文本子任务被动作数稀释
    recomputeTextGroundingMetric();

    // 将内部计数字段去掉（_widget_grounding_total 等），以免污染 schema
    delete episode._t0;
    delete episode._subtask_map;
    delete episode.grounding_metrics._widget_grounding_total;
    delete episode.grounding_metrics._widget_grounding_hits;
    delete episode.grounding_metrics._text_grounding_total;
    delete episode.grounding_metrics._text_grounding_hits;
    delete episode.grounding_metrics._state_grounding_total;
    delete episode.grounding_metrics._state_grounding_hits;
  }

  function downloadJson(filename, obj) {
    const dataStr = "data:application/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(obj, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 暴露到全局，供自动化脚本调用：
  // window.XRD_BENCHMARK.exportLog()
  window.XRD_BENCHMARK = {
    episode,
    finalize: function () {
      finalizeEpisode();
      return episode;
    },
    exportLog: function () {
      finalizeEpisode();
      downloadJson(episode.episode_id + ".json", episode);
    }
  };

  // 额外暴露一个轻量 API，供 XRD_steps.js / XRD_simulator.js 显式标记子任务完成情况：
  // 例如：XRD_BENCHMARK_API.markSubtaskSuccess("S2")
  window.XRD_BENCHMARK_API = {
    markSubtaskAttempt,
    markSubtaskSuccess
  };

  console.log("[XRD Benchmark] logger initialized for", episode.task_id, "episode:", episode.episode_id);
})();


