// SPM Benchmark Frontend Logger
// 在 SPM (Scanning Probe Microscopy / AFM) Web 模拟器中记录一次 episode 的详细日志，
// 任务：Tapping 模式下完成一次完整 AFM 扫描并保存图像。

(function () {
  if (typeof window === "undefined") return;
  const path = window.location.pathname || "";
  if (!path.includes("SPM_simulator.html")) {
    return;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function genEpisodeId() {
    return "spm_ep_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1e6).toString(36);
  }

  function inferActionType(actionText) {
    const lower = String(actionText || "").toLowerCase();
    if (lower.includes("drag")) return "custom";
    if (lower.includes("typewrite") || lower.includes("keyboard.type") || lower.includes("press(")) return "input";
    return "click";
  }

  const SUBTASK_ORDER = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "S11", "S12", "S13", "S14"];
  const t0 = performance.now();
  window._SPM_BENCHMARK_t0 = t0;

  const episode = {
    _t0: t0,
    task_id: "SPM-Tapping-Scan-01",
    episode_id: genEpisodeId(),
    env: "SPM_Simulator",
    agent_name: null,
    success: false,
    timestamps: {
      start_time: nowIso(),
      end_time: null,
      duration_sec: 0
    },
    summary: {
      optimal_steps: 20,
      actual_steps: 0,
      step_efficiency: 0
    },
    grounding_metrics: {
      widget_grounding_accuracy: 0,
      text_grounding_accuracy: 0,
      state_grounding_accuracy: 0
    },
    _subtask_map: {
      S1: { subtask_id: "S1", name: "SelectTappingMode", success: false, attempts: 0, phase: "mode_selection", grounding_focus: ["widget", "text"], success_criteria: "MODE is switched to TAPPING and the tapping workflow becomes active." },
      S2: { subtask_id: "S2", name: "LaserAlignment", success: false, attempts: 0, phase: "optical_alignment", grounding_focus: ["widget", "state"], success_criteria: "The laser spot is aligned to the cantilever tip and the photodiode controls become relevant." },
      S3: { subtask_id: "S3", name: "PhotodiodeAlignment", success: false, attempts: 0, phase: "optical_alignment", grounding_focus: ["widget", "state"], success_criteria: "The laser is centered on the photodiode and signal setup is complete." },
      S4: { subtask_id: "S4", name: "SetTargetAmplitude", success: false, attempts: 0, phase: "oscillation_setup", grounding_focus: ["widget", "text"], success_criteria: "Target amplitude is set to 500mV." },
      S5: { subtask_id: "S5", name: "SetFrequency", success: false, attempts: 0, phase: "oscillation_setup", grounding_focus: ["widget", "text"], success_criteria: "Frequency range is set from 200KHz to 500KHz." },
      S6: { subtask_id: "S6", name: "AutoTune", success: false, attempts: 0, phase: "oscillation_setup", grounding_focus: ["widget", "state"], success_criteria: "AUTO TUNE completes and scan parameter controls become available." },
      S7: { subtask_id: "S7", name: "SetScanSize", success: false, attempts: 0, phase: "scan_parameter_setup", grounding_focus: ["widget", "text"], success_criteria: "A valid SCAN SIZE option is selected." },
      S8: { subtask_id: "S8", name: "SetIntegralGain", success: false, attempts: 0, phase: "feedback_setup", grounding_focus: ["widget", "state"], success_criteria: "INTEGRAL GAIN is adjusted to a valid operating region." },
      S9: { subtask_id: "S9", name: "SetScanRate", success: false, attempts: 0, phase: "scan_parameter_setup", grounding_focus: ["widget", "text"], success_criteria: "A valid SCAN RATE option is selected." },
      S10: { subtask_id: "S10", name: "SetSetPoint", success: false, attempts: 0, phase: "feedback_setup", grounding_focus: ["widget", "state"], success_criteria: "SET POINT is adjusted to the operating position that unlocks approach." },
      S11: { subtask_id: "S11", name: "MotorApproach", success: false, attempts: 0, phase: "approach", grounding_focus: ["widget", "state"], success_criteria: "The MOTOR slider brings the probe close enough to the sample for ENGAGE." },
      S12: { subtask_id: "S12", name: "Engage", success: false, attempts: 0, phase: "engagement", grounding_focus: ["widget", "state"], success_criteria: "ENGAGE is clicked and the scan workflow advances to SCAN." },
      S13: { subtask_id: "S13", name: "Scan", success: false, attempts: 0, phase: "acquisition", grounding_focus: ["widget", "state"], success_criteria: "SCAN starts and the SAVE control becomes available." },
      S14: { subtask_id: "S14", name: "Save", success: false, attempts: 0, phase: "finalization", grounding_focus: ["widget", "state"], success_criteria: "SAVE exports the AFM image and the save dialog is shown." }
    },
    subtasks: [],
    steps: []
  };

  let stepIndex = 0;
  const SUBTASKS = episode._subtask_map;

  function getStateSnapshot() {
    const snap = {
      tapping: null,
      signal_bool: null,
      start_scan_bool: null,
      motor_bool: null,
      set_point_bool: null
    };
    try {
      if (typeof tapping === "boolean") snap.tapping = tapping;
      if (typeof signal_bool === "boolean") snap.signal_bool = signal_bool;
      if (typeof start_scan_bool === "boolean") snap.start_scan_bool = start_scan_bool;
      if (typeof motor_bool === "boolean") snap.motor_bool = motor_bool;
      if (typeof set_point_bool === "boolean") snap.set_point_bool = set_point_bool;
    } catch (e) {
      console.warn("SPM benchmark: failed to read state", e);
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
      hit_expected_target: params.hit_expected_target ?? true,
      relies_on_text: params.relies_on_text ?? !!(subtask && Array.isArray(subtask.grounding_focus) && subtask.grounding_focus.includes("text")),
      chosen_text: params.chosen_text ?? null,
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
    if (opts && typeof opts.note === "string") st.notes = opts.note;
  }

  function markSubtaskSuccess(id) {
    const st = SUBTASKS[id];
    if (!st) return;
    st.success = true;
  }

  function markSubtaskFailure(id) {
    const st = SUBTASKS[id];
    if (!st) return;
    st.success = false;
  }

  function inferCurrentSubtaskId() {
    for (let i = 0; i < SUBTASK_ORDER.length; i++) {
      const id = SUBTASK_ORDER[i];
      if (SUBTASKS[id] && SUBTASKS[id].success !== true) {
        return id;
      }
    }
    return SUBTASK_ORDER[SUBTASK_ORDER.length - 1];
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

  function recomputeGroundingMetrics() {
    const relevantByFocus = {
      widget_grounding_accuracy: "widget",
      text_grounding_accuracy: "text",
      state_grounding_accuracy: "state"
    };
    const attempted = Object.values(SUBTASKS).filter(function (st) {
      return (st.attempts || 0) > 0;
    });
    Object.keys(relevantByFocus).forEach(function (metricKey) {
      const focus = relevantByFocus[metricKey];
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

  function finalizeEpisode() {
    const now = nowIso();
    const tNow = performance.now();
    episode.timestamps.end_time = now;
    episode.timestamps.duration_sec = (tNow - t0) / 1000.0;

    const s = episode.summary;
    const total = s.actual_steps || 0;
    s.step_efficiency = s.optimal_steps > 0 && total > 0
      ? s.optimal_steps / Math.max(total, 1)
      : 0;

    recomputeGroundingMetrics();
    episode.subtasks = Object.values(SUBTASKS);
    episode.success = !!(SUBTASKS.S14 && SUBTASKS.S14.success);
    delete episode._t0;
    delete episode._subtask_map;
    return episode;
  }

  window.SPM_BENCHMARK = {
    episode: episode,
    finalize: finalizeEpisode,
    exportLog: function () {
      const finalized = finalizeEpisode();
      var dataStr = "data:application/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(finalized, null, 2));
      var link = document.createElement("a");
      link.setAttribute("href", dataStr);
      link.setAttribute("download", finalized.episode_id + ".json");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return finalized;
    }
  };

  window.SPM_BENCHMARK_API = {
    markSubtaskAttempt: markSubtaskAttempt,
    markSubtaskSuccess: markSubtaskSuccess,
    markSubtaskFailure: markSubtaskFailure,
    inferCurrentSubtaskId: inferCurrentSubtaskId,
    recordAgentAction: recordAgentAction
  };

  console.log("[SPM Benchmark] logger initialized for", episode.task_id, "episode:", episode.episode_id);
})();
