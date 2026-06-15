// APT Benchmark Frontend Logger
// 在 APT Web 模拟器中记录一次 episode 的详细日志。

(function () {
  if (typeof window === "undefined") return;
  const path = window.location.pathname || "";
  if (!path.includes("APT_simulator.html")) {
    return;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function genEpisodeId() {
    return "apt_ep_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1e6).toString(36);
  }

  function inferActionType(actionText) {
    const lower = String(actionText || "").toLowerCase();
    if (lower.includes("drag")) return "custom";
    if (lower.includes("typewrite") || lower.includes("keyboard.type") || lower.includes("press(")) return "input";
    return "click";
  }

  const REQUIRED_SUBTASK_ORDER = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "S11", "S12"];
  const t0 = performance.now();

  const episode = {
    _t0: t0,
    task_id: "APT-Run-And-Reconstruct-01",
    episode_id: genEpisodeId(),
    env: "APT_Simulator",
    agent_name: null,
    success: false,
    timestamps: {
      start_time: nowIso(),
      end_time: null,
      duration_sec: 0
    },
    summary: {
      optimal_steps: 18,
      actual_steps: 0,
      step_efficiency: 0
    },
    grounding_metrics: {
      widget_grounding_accuracy: 0,
      text_grounding_accuracy: 0,
      state_grounding_accuracy: 0
    },
    _subtask_map: {
      S1:  { subtask_id: "S1",  name: "SelectSample", success: false, attempts: 0, difficulty: "easy", phase: "setup", grounding_focus: ["widget", "text"], success_criteria: "A valid sample is selected." },
      S2:  { subtask_id: "S2",  name: "AlignSample", success: false, attempts: 0, difficulty: "medium", phase: "alignment", grounding_focus: ["widget", "state"], success_criteria: "The sample alignment step is completed." },
      S3:  { subtask_id: "S3",  name: "SelectTemperature", success: false, attempts: 0, difficulty: "easy", phase: "setup", grounding_focus: ["widget", "text", "state"], success_criteria: "A specimen temperature is selected." },
      S4:  { subtask_id: "S4",  name: "SelectDetectionRate", success: false, attempts: 0, difficulty: "easy", phase: "setup", grounding_focus: ["widget", "text", "state"], success_criteria: "A detection rate is selected." },
      S5:  { subtask_id: "S5",  name: "SelectPulseFreq", success: false, attempts: 0, difficulty: "easy", phase: "setup", grounding_focus: ["widget", "text", "state"], success_criteria: "A pulse frequency is selected." },
      S6:  { subtask_id: "S6",  name: "SelectPulseEnergy", success: false, attempts: 0, difficulty: "easy", phase: "setup", grounding_focus: ["widget", "text", "state"], success_criteria: "A pulse energy or fraction is selected." },
      S7:  { subtask_id: "S7",  name: "StartExperiment", success: false, attempts: 0, difficulty: "medium", phase: "acquisition", grounding_focus: ["widget", "state"], success_criteria: "The experiment starts running." },
      S8:  { subtask_id: "S8",  name: "StopExperiment", success: false, attempts: 0, difficulty: "medium", phase: "acquisition", grounding_focus: ["widget", "state"], success_criteria: "The running experiment is stopped." },
      S9:  { subtask_id: "S9",  name: "Reconstruct", success: false, attempts: 0, difficulty: "medium", phase: "reconstruction", grounding_focus: ["widget", "state"], success_criteria: "The reconstruction panel is opened." },
      S10: { subtask_id: "S10", name: "SetICF", success: false, attempts: 0, difficulty: "easy", phase: "reconstruction", grounding_focus: ["widget", "text", "state"], success_criteria: "A valid ICF parameter is selected." },
      S11: { subtask_id: "S11", name: "SetKFactor", success: false, attempts: 0, difficulty: "easy", phase: "reconstruction", grounding_focus: ["widget", "text", "state"], success_criteria: "A valid K factor parameter is selected." },
      S12: { subtask_id: "S12", name: "Finish", success: false, attempts: 0, difficulty: "easy", phase: "finish", grounding_focus: ["widget", "state"], success_criteria: "The workflow is finished (FINISH clicked)." }
    },
    subtasks: [],
    steps: [],
    /** 分步/单子任务评测时非 null：只对这些 subtask_id 统计 grounding，并忽略范围外计数 */
    _grounding_scope_ids: null
  };

  let stepIndex = 0;
  const SUBTASKS = episode._subtask_map;

  function getControlLabel(selector, fallbackSelector) {
    const el = document.querySelector(selector);
    let text = el ? (el.innerText || el.textContent || "").trim() : "";
    if (!text && fallbackSelector) {
      const fallback = document.querySelector(fallbackSelector);
      text = fallback ? (fallback.innerText || fallback.textContent || "").trim() : "";
    }
    return text || null;
  }

  function getStateSnapshot() {
    const snap = {
      sample_chosen: null,
      temperature_chosen: null,
      detection_rate_chosen: null,
      pulse_freq_chosen: null,
      pulse_energy_chosen: null,
      sample_aligned: null,
      laser_aligned: null,
      experiment_running: null,
      reconstruct_done: null,
      icf: null,
      k_factor: null
    };

    try {
      const sample = document.querySelector("#sample");
      const temp = document.querySelector("#specimen-temp");
      const rate = document.querySelector("#detection-rate");
      const pulseFreq = document.querySelector("#pulse-freq");
      const pulseEnergy = document.querySelector("#pulse-energy");
      const icfEl = document.querySelector("#icf");
      const kEl = document.querySelector("#k-factor");
      if (sample && sample.value) snap.sample_chosen = sample.value;
      if (temp && temp.value) snap.temperature_chosen = temp.value;
      if (rate && rate.value) snap.detection_rate_chosen = rate.value;
      if (pulseFreq && pulseFreq.value) snap.pulse_freq_chosen = pulseFreq.value;
      if (pulseEnergy && pulseEnergy.value) snap.pulse_energy_chosen = pulseEnergy.value;
      if (icfEl && icfEl.value && icfEl.value !== "0") snap.icf = icfEl.value;
      if (kEl && kEl.value && kEl.value !== "0") snap.k_factor = kEl.value;

      const alignSampleBtn = document.querySelector("#align-sample-btn");
      if (alignSampleBtn) snap.sample_aligned = alignSampleBtn.classList.contains("controls-btn-active") || alignSampleBtn.disabled;
      const alignLaserBtn = document.querySelector("#align-laser-btn");
      if (alignLaserBtn) snap.laser_aligned = alignLaserBtn.classList.contains("controls-btn-active") || alignLaserBtn.disabled;

      const startStopLabel = getControlLabel("#start-stop-btn", "#start-stop-label");
      if (startStopLabel === "STOP") snap.experiment_running = true;
      if (startStopLabel === "START") snap.experiment_running = false;

      const reconPanel = document.querySelector("#reconstruction-panel");
      snap.reconstruct_done = !!(reconPanel && !reconPanel.classList.contains("totally-hidden"));
    } catch (e) {
      console.warn("APT benchmark: failed to read state", e);
    }
    return snap;
  }

  function recordStep(params) {
    const now = performance.now();
    const offset = (now - t0) / 1000.0;
    const subtaskId = params.subtask_id || null;
    const subtask = subtaskId && SUBTASKS[subtaskId] ? SUBTASKS[subtaskId] : null;
    const step = {
      index: stepIndex++,
      timestamp_offset_sec: offset,
      subtask_id: subtaskId,
      action_type: params.action_type || inferActionType(params.text),
      target: {
        dom_selector: params.dom_selector || null,
        bbox: params.bbox || [],
        text: params.text || null
      },
      hit_expected_target: params.hit_expected_target !== false,
      relies_on_text: params.relies_on_text ?? !!(subtask && Array.isArray(subtask.grounding_focus) && subtask.grounding_focus.includes("text")),
      chosen_text: params.chosen_text || null,
      state_snapshot: params.state_snapshot || getStateSnapshot(),
      reward: null,
      agent_comment: null
    };
    episode.steps.push(step);
    episode.summary.actual_steps = episode.steps.length;
  }

  function markSubtaskAttempt(id, opts) {
    const st = SUBTASKS[id];
    if (!st) return;
    st.attempts += 1;
    if (opts && opts.note) st.notes = opts.note;
  }

  function markSubtaskSuccess(id) {
    const st = SUBTASKS[id];
    if (!st) return;
    st.success = true;
  }

  function inferCurrentSubtaskId() {
    for (let i = 0; i < REQUIRED_SUBTASK_ORDER.length; i++) {
      const id = REQUIRED_SUBTASK_ORDER[i];
      if (SUBTASKS[id] && SUBTASKS[id].success !== true) {
        return id;
      }
    }
    return REQUIRED_SUBTASK_ORDER[REQUIRED_SUBTASK_ORDER.length - 1];
  }

  function recordAgentAction(subtaskId, actionText) {
    const targetId = subtaskId || inferCurrentSubtaskId();
    if (targetId && SUBTASKS[targetId]) {
      markSubtaskAttempt(targetId, {});
    }
    recordStep({
      subtask_id: targetId,
      text: String(actionText || "").slice(0, 300)
    });
  }

  function setGroundingScope(ids) {
    if (!ids || !ids.length) {
      episode._grounding_scope_ids = null;
      recomputeGroundingMetrics();
      return;
    }
    const allow = {};
    ids.forEach(function (id) {
      if (SUBTASKS[id]) allow[id] = true;
    });
    const allowedKeys = Object.keys(allow);
    if (!allowedKeys.length) {
      episode._grounding_scope_ids = null;
      recomputeGroundingMetrics();
      return;
    }
    Object.keys(SUBTASKS).forEach(function (id) {
      if (!allow[id]) {
        SUBTASKS[id].attempts = 0;
        SUBTASKS[id].success = false;
      }
    });
    episode._grounding_scope_ids = allowedKeys;
    recomputeGroundingMetrics();
  }

  function recomputeGroundingMetrics() {
    const metricFocuses = {
      widget_grounding_accuracy: "widget",
      text_grounding_accuracy: "text",
      state_grounding_accuracy: "state"
    };
    // 原先只统计 attempts>0；但 instrumentClick/instrumentSelect 只调 markSubtaskSuccess，
    // 不会增加 attempts，导致「子任务已成功」仍被排除，三项 grounding 恒为 0。
    let pool = Object.values(SUBTASKS);
    if (episode._grounding_scope_ids && episode._grounding_scope_ids.length) {
      const allow = {};
      episode._grounding_scope_ids.forEach(function (id) {
        allow[id] = true;
      });
      pool = pool.filter(function (st) {
        return allow[st.subtask_id];
      });
    }
    const attempted = pool.filter(function (st) {
      return (st.attempts || 0) > 0 || st.success === true;
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

  function instrumentClick(selector, subtaskId) {
    const el = document.querySelector(selector);
    if (!el) return;
    const mark = function () {
      markSubtaskSuccess(subtaskId);
    };
    if (typeof $ !== "undefined") {
      $(el).on("click", mark);
    } else {
      el.addEventListener("click", mark);
    }
  }

  function instrumentStartStop(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    const mark = function () {
      const labelEl = document.querySelector("#start-stop-label");
      const label = labelEl ? (labelEl.innerText || labelEl.textContent || "").trim() : "";
      if (label === "START") markSubtaskSuccess("S7");
      else if (label === "STOP") markSubtaskSuccess("S8");
    };
    // 捕获阶段先于 APT_simulator.js 里 $("#start-stop-btn").click 的冒泡处理；
    // 否则 stopExperiment() 先把标签改成 START，后跑的 mark 会误记成 S7，S8 永远不成功。
    el.addEventListener("click", mark, true);
  }

  function instrumentSelect(selector, subtaskId) {
    const el = document.querySelector(selector);
    if (!el) return;
    const mark = function () {
      markSubtaskSuccess(subtaskId);
    };
    if (typeof $ !== "undefined") {
      $(el).on("selectmenuselect", mark);
      $(el).on("change", mark);
    } else {
      el.addEventListener("change", mark);
    }
  }

  function setupInstrumentation() {
    instrumentSelect("#sample", "S1");
    instrumentClick("#align-sample-btn", "S2");
    instrumentSelect("#specimen-temp", "S3");
    instrumentSelect("#detection-rate", "S4");
    instrumentSelect("#pulse-freq", "S5");
    instrumentSelect("#pulse-energy", "S6");
    instrumentStartStop("#start-stop-btn");
    instrumentClick("#reconstruct-btn", "S9");
    instrumentSelect("#icf", "S10");
    instrumentSelect("#k-factor", "S11");
    instrumentClick("#finish-btn", "S12");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupInstrumentation);
  } else {
    setupInstrumentation();
  }

  function finalizeEpisode() {
    episode.timestamps.end_time = nowIso();
    episode.timestamps.duration_sec = (performance.now() - t0) / 1000.0;
    const total = episode.summary.actual_steps || 0;
    episode.summary.step_efficiency = episode.summary.optimal_steps > 0 && total > 0
      ? episode.summary.optimal_steps / Math.max(total, 1)
      : 0;
    if (episode._grounding_scope_ids && episode._grounding_scope_ids.length) {
      episode.grounding_scope_subtask_ids = episode._grounding_scope_ids.slice();
    }
    recomputeGroundingMetrics();
    episode.subtasks = Object.keys(SUBTASKS).map(function (k) { return SUBTASKS[k]; });
    episode.success = REQUIRED_SUBTASK_ORDER.every(function (id) {
      return SUBTASKS[id] && SUBTASKS[id].success;
    });
    delete episode._t0;
    delete episode._grounding_scope_ids;
    delete episode._subtask_map;
    return episode;
  }

  function downloadJson(filename, obj) {
    const dataStr = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  window.APT_BENCHMARK = {
    episode: episode,
    finalize: finalizeEpisode,
    setGroundingScope: setGroundingScope,
    exportLog: function () {
      const finalized = finalizeEpisode();
      downloadJson(finalized.episode_id + ".json", finalized);
      return finalized;
    }
  };

  window.APT_BENCHMARK_API = {
    markSubtaskAttempt: markSubtaskAttempt,
    markSubtaskSuccess: markSubtaskSuccess,
    inferCurrentSubtaskId: inferCurrentSubtaskId,
    recordAgentAction: recordAgentAction
  };

  (function hideTopInstructionsForBenchmark() {
    try {
      const hide = function () {
        const bar = document.getElementById("top-instructions");
        const txt = document.getElementById("top-instructions-txt");
        if (txt) txt.innerText = "";
        if (bar) bar.style.display = "none";
      };
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", hide);
      } else {
        hide();
      }
    } catch (e) {
      console.warn("APT benchmark: failed to hide instructions", e);
    }
  })();

  console.log("[APT Benchmark] logger initialized for", episode.task_id, "episode:", episode.episode_id);
})();
