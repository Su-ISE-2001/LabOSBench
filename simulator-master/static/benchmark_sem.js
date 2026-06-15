// SEM Benchmark Frontend Logger
// 负责在 SEM Web 模拟器中记录一次 episode 的详细日志，
// 用于评估 GUI Agent 在 SEM 扫描任务中的 grounding 能力和任务完成能力。

(function () {
  // 仅在 SEM 模拟器页面生效
  if (typeof window === "undefined") return;
  const path = window.location.pathname || "";
  if (!/SEM_simulator/i.test(path || "")) {
    return;
  }

  const _semUrlParams = new URLSearchParams(window.location.search || "");
  const mosaicRoiMode =
    _semUrlParams.get("sem_subtask_mosaic") === "1" ||
    window.SEM_BENCHMARK_MOSAIC_ROI === true;

  // ---- 基础工具 ----
  function nowIso() {
    return new Date().toISOString();
  }

  function genEpisodeId() {
    return "sem_ep_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1e6).toString(36);
  }

  const t0 = performance.now();

  // ---- 日志主结构（与 schema.json 对齐）----
  const episode = {
    task_id: mosaicRoiMode ? "SEM-Mosaic-ROI-01" : "SEM-Scan-And-Save-01",
    episode_id: genEpisodeId(),
    env: "SEM_Simulator",
    agent_name: null,
    success: false,
    _t0: t0,
    timestamps: {
      start_time: nowIso(),
      end_time: null,
      duration_sec: 0
    },
    summary: {
      optimal_steps: mosaicRoiMode ? 1 : 12,
      actual_steps: 0,
      step_efficiency: 0
    },
    grounding_metrics: {
      widget_grounding_accuracy: 0,
      text_grounding_accuracy: 0,
      state_grounding_accuracy: 0
    },
    quality_metrics: {
      local_compare_method: mosaicRoiMode ? "roi_export_match" : "reference_center_crop",
      evaluations: 0,
      latest_score: null,
      best_score: null,
      average_score: null
    },
    _subtask_map: mosaicRoiMode
      ? {
          S12: {
            subtask_id: "S12",
            name: "MosaicRoiRegionSave",
            success: false,
            attempts: 0,
            phase: "acquisition",
            grounding_focus: ["widget", "state"],
            success_criteria:
              "On the 2×2 seam-smoothed mosaic, pan/zoom so SAVE IMAGE exports the annotated ROI (matched to reference export)."
          }
        }
      : {
          S1: { subtask_id: "S1", name: "VentChamber", success: false, attempts: 0, phase: "chamber_prep", grounding_focus: ["widget", "state"], success_criteria: "VENT is executed and the chamber enters the vented state." },
          S2: { subtask_id: "S2", name: "OpenChamber", success: false, attempts: 0, phase: "chamber_prep", grounding_focus: ["widget", "state"], success_criteria: "The chamber is opened and the OPEN control changes to CLOSE." },
          S3: { subtask_id: "S3", name: "CloseChamber", success: false, attempts: 0, phase: "chamber_prep", grounding_focus: ["widget", "state"], success_criteria: "The chamber is closed after loading and the interface returns to the closed state." },
          S4: { subtask_id: "S4", name: "EvacuateChamber", success: false, attempts: 0, phase: "chamber_prep", grounding_focus: ["widget", "state"], success_criteria: "EVACUATE completes and the SEM is ready for sample selection." },
          S5: { subtask_id: "S5", name: "SelectSample", success: false, attempts: 0, phase: "sample_selection", grounding_focus: ["widget", "text"], success_criteria: "A valid sample is selected from the available sample list." },
          S6: { subtask_id: "S6", name: "TurnOnHT", success: false, attempts: 0, phase: "beam_setup", grounding_focus: ["widget", "state"], success_criteria: "The HT button is switched on and high tension becomes active." },
          S7: { subtask_id: "S7", name: "SetAccVoltage", success: false, attempts: 0, phase: "beam_setup", grounding_focus: ["widget", "state"], success_criteria: "The accelerating voltage slider is adjusted to the 10kV operating point." },
          S8: { subtask_id: "S8", name: "SetContrast", success: false, attempts: 0, phase: "image_tuning", grounding_focus: ["widget", "state"], success_criteria: "The CONTRAST knob is adjusted and the image tuning workflow advances." },
          S9: { subtask_id: "S9", name: "AdjustClarity", success: false, attempts: 0, phase: "image_tuning", grounding_focus: ["widget", "state"], success_criteria: "The COARSE knob is adjusted to improve clarity and prepare for scan." },
          S10: { subtask_id: "S10", name: "StartScan", success: false, attempts: 0, phase: "acquisition", grounding_focus: ["widget", "state"], success_criteria: "A slow scan mode is started and the SEM enters scan acquisition." },
          S11: { subtask_id: "S11", name: "SaveImage", success: false, attempts: 0, phase: "finalization", grounding_focus: ["widget", "state"], success_criteria: "SAVE IMAGE exports the acquired SEM image." }
        },
    subtasks: [],
    steps: []
  };

  let stepIndex = 0;

  // ---- 状态快照：从 SEM_simulator.js 的全局变量和 DOM 推断当前状态 ----
  function getStateSnapshot() {
    const snap = {
      chamber_open: null,
      sample_placed: null,
      ht_on: null,
      acc_voltage_kv: null,
      spot_size_nm: null,
      working_distance: null,
      scanning: null,
      last_scan_mode: null
    };

    try {
      if (typeof window.chamberOpen === "boolean") snap.chamber_open = window.chamberOpen;
      if (typeof window.samplePlaced === "boolean") snap.sample_placed = window.samplePlaced;
      if (typeof window.htOn === "boolean") snap.ht_on = window.htOn;
      if (typeof window.kVs === "number") snap.acc_voltage_kv = window.kVs;
      if (typeof window.brightNms === "number") snap.spot_size_nm = window.brightNms;
      if (typeof window.zBlur === "number") snap.working_distance = window.zBlur;
      if (typeof window.lastScanUsed === "string") snap.last_scan_mode = window.lastScanUsed;

      const chamberBtn = document.querySelector("#btn-chamber");
      if (chamberBtn) {
        const text = (chamberBtn.innerText || "").trim();
        snap.chamber_btn_text = text;
      }
    } catch (e) {
      console.warn("SEM benchmark: failed to read internal state", e);
    }

    return snap;
  }

  function evaluateLocalImageQuality() {
    try {
      if (
        typeof window.SEM_IMAGE_QUALITY_API !== "undefined" &&
        window.SEM_IMAGE_QUALITY_API &&
        typeof window.SEM_IMAGE_QUALITY_API.evaluateCurrentFrame === "function"
      ) {
        const result = window.SEM_IMAGE_QUALITY_API.evaluateCurrentFrame();
        if (result && typeof result.score === "number") {
          return {
            score: result.score,
            mse: typeof result.mse === "number" ? result.mse : null,
            psnr: typeof result.psnr === "number" ? result.psnr : null,
            ssim_approx: typeof result.ssim_approx === "number" ? result.ssim_approx : null,
            sharpness_ratio: typeof result.sharpness_ratio === "number" ? result.sharpness_ratio : null
          };
        }
      }
    } catch (e) {
      console.warn("SEM benchmark: quality evaluation failed", e);
    }
    return null;
  }

  function updateQualityMetrics(quality) {
    if (!quality || typeof quality.score !== "number") return;
    const qm = episode.quality_metrics;
    qm.evaluations += 1;
    qm.latest_score = quality.score;
    if (qm.best_score === null || quality.score > qm.best_score) {
      qm.best_score = quality.score;
    }
    const prevCount = qm.evaluations - 1;
    const prevAvg = qm.average_score === null ? 0 : qm.average_score;
    qm.average_score = ((prevAvg * prevCount) + quality.score) / qm.evaluations;
  }

  /** S9 调焦：记录相对参考图的 PSNR / score（每次旋钮或滑条变化触发） */
  function recordFocusQuality(subtaskId) {
    const quality = evaluateLocalImageQuality();
    if (!quality) return null;
    const st = SUBTASKS[subtaskId];
    if (!st) return quality;
    if (!Array.isArray(st.focus_quality_history)) {
      st.focus_quality_history = [];
    }
    const entry = {
      timestamp: nowIso(),
      psnr: quality.psnr,
      score: quality.score,
      mse: quality.mse,
      ssim_approx: quality.ssim_approx,
      sharpness_ratio: quality.sharpness_ratio
    };
    st.focus_quality_history.push(entry);
    st.focus_quality = quality;
    st.focus_psnr_latest = quality.psnr;
    st.focus_score_latest = quality.score;
    if (
      st.focus_psnr_best === undefined ||
      st.focus_psnr_best === null ||
      (typeof quality.psnr === "number" && quality.psnr > st.focus_psnr_best)
    ) {
      st.focus_psnr_best = quality.psnr;
      st.focus_score_best = quality.score;
    }
    updateQualityMetrics(quality);
    const qm = episode.quality_metrics;
    if (!qm.focus_evaluations) qm.focus_evaluations = 0;
    qm.focus_evaluations += 1;
    if (typeof quality.psnr === "number") {
      qm.focus_latest_psnr = quality.psnr;
      if (qm.focus_best_psnr === undefined || qm.focus_best_psnr === null || quality.psnr > qm.focus_best_psnr) {
        qm.focus_best_psnr = quality.psnr;
      }
    }
    return quality;
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
      image_quality: params.image_quality ?? null,
      state_snapshot: getStateSnapshot(),
      reward: null,
      agent_comment: null
    };

    episode.steps.push(step);
    episode.summary.actual_steps = episode.steps.length;
  }

  // ---- 子任务判定 ----
  const SUBTASKS = episode._subtask_map;

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

  function markSubtaskSuccessOnly(id) {
    const st = SUBTASKS[id];
    if (!st) return;
    st.success = true;
  }

  function recomputeGroundingMetrics() {
    const metricFocuses = {
      widget_grounding_accuracy: "widget",
      text_grounding_accuracy: "text",
      state_grounding_accuracy: "state"
    };
    const attempted = Object.values(SUBTASKS).filter(function (st) {
      return (st.attempts || 0) > 0;
    });
    Object.keys(metricFocuses).forEach(function (metricKey) {
      const focus = metricFocuses[metricKey];
      const relevant = attempted.filter(function (st) {
        return Array.isArray(st.grounding_focus) && st.grounding_focus.includes(focus);
      });
      if (!relevant.length) {
        episode.grounding_metrics[metricKey] = 0;
        return;
      }
      const hits = relevant.filter(function (st) { return st.success === true; }).length;
      episode.grounding_metrics[metricKey] = hits / relevant.length;
    });
  }

  // ---- 控件包装：记录步骤 + 更新子任务 ----
  function instrumentClick(selector, subtaskId, logicalName) {
    const el = document.querySelector(selector);
    if (!el) return;

    const recordClickStep = function (event) {
      const quality = selector === "#btn-save" ? evaluateLocalImageQuality() : null;
      if (quality) {
        updateQualityMetrics(quality);
      }
      recordStep({
        subtask_id: subtaskId,
        action_type: "click",
        dom_selector: selector,
        text: (el.innerText || el.value || "").trim(),
        hit_expected_target: true,
        relies_on_text: false,
        image_quality: quality
      });

      if (subtaskId && SUBTASKS[subtaskId]) {
        markSubtaskSuccess(subtaskId);  // 点击即视为完成该子任务（内部会递增 attempts）
      }
    };

    if (typeof $ !== "undefined") {
      $(el).on("click", function (event) {
        recordClickStep(event);
      });
    } else {
      const origOnClick = el.onclick;
      el.onclick = function (event) {
        recordClickStep(event);
        if (typeof origOnClick === "function") {
          origOnClick.call(this, event);
        }
      };
    }
  }

  // 旋钮：支持点击与拖动（mousedown 可捕获两种交互）
  function instrumentKnob(selector, subtaskId, logicalName) {
    const el = document.querySelector(selector);
    if (!el) return;

    const recordKnobStep = function (event) {
      recordStep({
        subtask_id: subtaskId,
        action_type: "input",
        dom_selector: selector,
        text: logicalName || "",
        hit_expected_target: true,
        relies_on_text: false
      });
      if (subtaskId && SUBTASKS[subtaskId]) {
        markSubtaskSuccess(subtaskId);
      }
    };

    el.addEventListener("mousedown", function (event) {
      if (event.target === el || el.contains(event.target)) {
        recordKnobStep(event);
      }
    }, true);

    // 旋钮所在容器（含 LED 等）：点击该区域也计为成功（整个 knob-base 均为该旋钮控件）
    const container = el.closest(".knob-base");
    if (container && container !== el) {
      container.addEventListener("mousedown", function (event) {
        if (event.target !== el && !el.contains(event.target)) {
          recordKnobStep(event);
        }
      }, true);
    }
  }

  //  chamber 按钮：根据状态动态判断是开门(S2)还是关门(S3)
  function instrumentChamber(selector) {
    const el = document.querySelector(selector);
    if (!el) return;

    const recordChamberStep = function (event) {
      const text = (el.innerText || "").trim();
      const isOpening = text === "OPEN";
      const subtaskId = isOpening ? "S2" : "S3";

      recordStep({
        subtask_id: subtaskId,
        action_type: "click",
        dom_selector: selector,
        text: text,
        hit_expected_target: true,
        relies_on_text: true
      });

      if (SUBTASKS[subtaskId]) {
        markSubtaskSuccess(subtaskId);
      }
    };

    if (typeof $ !== "undefined") {
      $(el).on("click", function (event) {
        recordChamberStep(event);
      });
    } else {
      const origOnClick = el.onclick;
      el.onclick = function (event) {
        recordChamberStep(event);
        if (typeof origOnClick === "function") {
          origOnClick.call(this, event);
        }
      };
    }
  }

  // 样品下拉框 #sem-sample-select（选项 value 为样品 id，与 SEM_SAMPLE_CONFIG 一致）
  function instrumentSampleSelect() {
    const sel = document.querySelector("#sem-sample-select");
    if (!sel) return;

    const recordSampleStep = function () {
      const id = sel.value || "";
      if (!id) return;
      const opt = sel.options[sel.selectedIndex];
      const sampleName = opt ? (opt.text || "").trim() : id;
      recordStep({
        subtask_id: "S5",
        action_type: "input",
        dom_selector: "#sem-sample-select",
        text: sampleName || id,
        hit_expected_target: true,
        relies_on_text: true,
        chosen_text: sampleName || id
      });
      markSubtaskSuccess("S5");
    };

    if (typeof $ !== "undefined") {
      $(sel).on("change", recordSampleStep);
    } else {
      sel.addEventListener("change", recordSampleStep);
    }
  }

  // 滑块监听：捕获阶段 mousedown 计尝试（含禁用时）；stop 计成功并再计一次尝试（成功拖动时）
  function instrumentSlider(selector, subtaskId) {
    const el = document.querySelector(selector);
    if (!el) return;

    el.addEventListener("mousedown", function (event) {
      if (event.target === el || el.contains(event.target)) {
        markSubtaskAttempt(subtaskId, {});
      }
    }, true);

    if (typeof $ !== "undefined" && $.fn.slider) {
      var markSliderSuccess = function (event, ui) {
        if (ui && ui.value !== undefined) {
          var sliderQ = subtaskId === "S9" ? recordFocusQuality("S9") : null;
          recordStep({
            subtask_id: subtaskId,
            action_type: "input",
            dom_selector: selector,
            text: "value: " + ui.value,
            hit_expected_target: true,
            relies_on_text: false,
            image_quality: sliderQ
          });
          markSubtaskAttempt(subtaskId, {});
          markSubtaskSuccessOnly(subtaskId);
        }
      };
      $(el).on("stop", markSliderSuccess);
      // slide 作为 fallback：stop 可能未触发（如 Playwright 模拟拖动时）
      $(el).on("slide", markSliderSuccess);
    }
  }

  // 在父容器上按「区域」计尝试，便于统计未成功子任务的尝试次数（点到标签/指示器或滑块被禁用时也计）
  function instrumentSliderRegion(containerSelector, sliderIdToSubtask) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    container.addEventListener("mousedown", function (event) {
      const target = event.target;
      const x = event.clientX;
      const y = event.clientY;
      function pointInEl(el) {
        if (!el) return false;
        var r = el.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      }
      for (var i = 0; i < sliderIdToSubtask.length; i++) {
        var slider = document.querySelector(sliderIdToSubtask[i].id);
        if (!slider) continue;
        var label = slider.previousElementSibling;
        var indicators = slider.nextElementSibling;
        var onLabel = label && (label === target || label.contains(target));
        var onSlider = slider === target || slider.contains(target);
        var onIndicators = indicators && (indicators === target || indicators.contains(target));
        if (onLabel || onIndicators) {
          markSubtaskAttempt(sliderIdToSubtask[i].subtaskId, {});
          return;
        }
        if (onSlider) return;
        if (pointInEl(label) || pointInEl(slider) || pointInEl(indicators)) {
          markSubtaskAttempt(sliderIdToSubtask[i].subtaskId, {});
          return;
        }
      }
    }, true);
  }

  // 扫描/保存按钮区域：按坐标落在哪个按钮内计该子任务尝试（解决禁用时点击不触发按钮监听的问题）
  // 仅当 event.target 不是按钮本身时计数，避免与 instrumentClick 重复
  // S10 仅 SLOW SCAN 1/2 算成功，TV RATE 不算
  function instrumentScanSaveRegion() {
    var btnSave = document.querySelector("#btn-save");
    var btnScan1 = document.querySelector("#btn-scan1");
    var btnScan2 = document.querySelector("#btn-scan2");
    if (!btnSave || !btnScan1) return;
    var parent = btnSave.parentElement;
    if (!parent) return;
    parent.addEventListener("mousedown", function (event) {
      var target = event.target;
      if (target.closest && (target.closest("#btn-save") || target.closest("#btn-tvrate") || target.closest("#btn-scan1") || target.closest("#btn-scan2"))) return;
      var x = event.clientX, y = event.clientY;
      function inRect(el) {
        if (!el) return false;
        var r = el.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      }
      if (inRect(btnSave)) {
        if (mosaicRoiMode) markSubtaskAttempt("S12", {});
        else markSubtaskAttempt("S11", {});
      } else if (inRect(btnScan1) || inRect(btnScan2)) {
        if (!mosaicRoiMode) markSubtaskAttempt("S10", {});
      }
    }, true);
  }

  function setupMosaicRoiInstrumentation() {
    var el = document.querySelector("#btn-save");
    if (!el) return;

    var recordMosaicSaveStep = function () {
      var cmp =
        typeof window.semMosaicRoiEvaluateSaveSuccess === "function"
          ? window.semMosaicRoiEvaluateSaveSuccess()
          : { ok: false, score: 0, reason: "no_eval_fn" };
      var quality = evaluateLocalImageQuality();
      if (quality) {
        updateQualityMetrics(quality);
      }
      var iq = quality ? Object.assign({}, quality) : {};
      iq.roi_gate = true;
      iq.roi_match = !!cmp.ok;
      iq.roi_score = cmp.score;
      iq.roi_min = cmp.minMatchScore;
      if (window.SEM_LAST_ROI_COMPARE) {
        iq.roi_ssim_approx = window.SEM_LAST_ROI_COMPARE.ssim_approx;
        iq.roi_psnr = window.SEM_LAST_ROI_COMPARE.psnr;
      }
      recordStep({
        subtask_id: "S12",
        action_type: "click",
        dom_selector: "#btn-save",
        text: (el.innerText || el.value || "").trim(),
        hit_expected_target: !!cmp.ok,
        relies_on_text: false,
        image_quality: iq
      });
      markSubtaskAttempt("S12", { success: !!cmp.ok, note: cmp.ok ? "roi_export_match" : "roi_export_mismatch" });
    };

    if (typeof $ !== "undefined") {
      $(el).on("click", recordMosaicSaveStep);
    } else {
      var origOnClick = el.onclick;
      el.onclick = function (event) {
        recordMosaicSaveStep(event);
        if (typeof origOnClick === "function") {
          origOnClick.call(this, event);
        }
      };
    }
  }

  function setupInstrumentation() {
    if (mosaicRoiMode) {
      instrumentScanSaveRegion();
      setupMosaicRoiInstrumentation();
      return;
    }
    // 按钮：VENT / OPEN-CLOSE / EVACUATE / HT / 扫描 / 保存
    instrumentClick("#btn-vent", "S1", "Vent");
    instrumentChamber("#btn-chamber");
    instrumentClick("#btn-evacuate", "S4", "Evacuate");
    instrumentClick("#ht-btn", "S6", "HT");
    // 点击「HT」文字也计为 S6 一次尝试（便于区分误点文字 vs 未操作）
    (function () {
      const htBtn = document.querySelector("#ht-btn");
      if (!htBtn) return;
      const htText = htBtn.previousElementSibling;
      if (!htText || !/HT/i.test(htText.textContent || "")) return;
      const recordAttemptOnly = function () {
        recordStep({ subtask_id: "S6", action_type: "click", dom_selector: "HT text", note: "clicked HT text, not button" });
        markSubtaskAttempt("S6", {});
      };
      if (typeof $ !== "undefined") {
        $(htText).on("click", recordAttemptOnly);
      } else {
        htText.addEventListener("click", recordAttemptOnly);
      }
    })();
    // S10 仅 SLOW SCAN 1/2 算成功，TV RATE 不算
    instrumentClick("#btn-scan1", "S10", "SlowScan1");
    instrumentClick("#btn-scan2", "S10", "SlowScan2");
    instrumentClick("#btn-save", "S11", "SaveImage");

    // 样品选择
    instrumentSampleSelect();

    // 滑块：加速电压
    instrumentSlider("#acc-volt", "S7");
    instrumentSliderRegion("#sliders-controls", [
      { id: "#acc-volt", subtaskId: "S7" }
    ]);

    // S8 / S9：对比度、COARSE 清晰度 — 使用与电压滑条相同的拖动滑块
    instrumentSlider("#slider-contrast", "S8");
    instrumentSlider("#slider-focus-c", "S9");
    instrumentSliderRegion("#knob-sliders-controls", [
      { id: "#slider-contrast", subtaskId: "S8" },
      { id: "#slider-focus-c", subtaskId: "S9" }
    ]);

    instrumentScanSaveRegion();

    // 旋钮成功判定：钩住 onRotateKnob，无论拖动还是键盘旋转，只要旋钮实际旋转即计为成功
    // （mousedown 可能被 Draggable 等库拦截，导致无法可靠触发）
    if (typeof onRotateKnob === "function") {
      const origOnRotateKnob = onRotateKnob;
      window.onRotateKnob = function (me) {
        if (me === "contrast" && SUBTASKS["S8"]) {
          recordStep({
            subtask_id: "S8",
            action_type: "input",
            dom_selector: "#slider-contrast",
            text: "CONTRAST",
            hit_expected_target: true,
            relies_on_text: false
          });
          markSubtaskSuccess("S8");
        }
        if (me === "focus-c" && SUBTASKS["S9"]) {
          const focusQ = recordFocusQuality("S9");
          recordStep({
            subtask_id: "S9",
            action_type: "input",
            dom_selector: "#slider-focus-c",
            text: "COARSE",
            hit_expected_target: true,
            relies_on_text: false,
            image_quality: focusQ
          });
          markSubtaskSuccess("S9");
        }
        return origOnRotateKnob.apply(this, arguments);
      };
    }
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

    episode.subtasks = Object.values(episode._subtask_map);
    if (mosaicRoiMode) {
      const st12 = SUBTASKS["S12"];
      episode.success = !!(st12 && st12.success);
    } else {
      episode.success = episode.subtasks.every(st => st.success);
    }
    // 未跑完基准路径（未全部成功）时步骤效率为 0
    s.step_efficiency = episode.success && s.optimal_steps > 0 && total > 0
      ? Math.min(1, s.optimal_steps / Math.max(total, 1))
      : 0;
    recomputeGroundingMetrics();
    delete episode._t0;
    delete episode._subtask_map;
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

  window.SEM_BENCHMARK = {
    episode: episode,
    recordStep: recordStep,
    finalize: function () {
      finalizeEpisode();
      return episode;
    },
    exportLog: function () {
      finalizeEpisode();
      downloadJson(episode.episode_id + ".json", episode);
    }
  };

  window.SEM_BENCHMARK_API = {
    markSubtaskAttempt: markSubtaskAttempt,
    markSubtaskSuccess: markSubtaskSuccess
  };

  console.log("[SEM Benchmark] logger initialized for", episode.task_id, "episode:", episode.episode_id);
})();
