// LFM Benchmark Frontend Logger
// 在 LFM (Light & Fluorescence Microscopy) Web 模拟器中记录一次 episode 的详细日志，
// 任务范围：从开始到使用 BF capture 按钮获取一张标准明场图像（步骤 1-18）。

(function () {
  if (typeof window === "undefined") return;
  const path = window.location.pathname || "";
  if (!path.includes("LM_simulator.html")) {
    return;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function genEpisodeId() {
    return "lfm_ep_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1e6).toString(36);
  }

  function inferActionType(actionText) {
    const lower = String(actionText || "").toLowerCase();
    if (lower.includes("drag")) return "custom";
    if (lower.includes("typewrite") || lower.includes("keyboard.type") || lower.includes("press(")) return "input";
    return "click";
  }

  const SUBTASK_ORDER = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11", "L12"];
  const t0 = performance.now();
  window._LFM_BENCHMARK_t0 = t0;

  const episode = {
    _t0: t0,
    task_id: "LFM-BF-Capture-01",
    episode_id: genEpisodeId(),
    env: "LFM_Simulator",
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
      L1: { subtask_id: "L1", name: "DragSample", difficulty: "easy", success: false, attempts: 0, phase: "sample_prep", grounding_focus: ["widget", "state"], success_criteria: "The stained kidney sample is dragged onto the microscope stage." },
      L2: { subtask_id: "L2", name: "SelectBrightfield", difficulty: "easy", success: false, attempts: 0, phase: "illumination_setup", grounding_focus: ["widget", "text"], success_criteria: "SETUP & BRIGHTFIELD mode is selected." },
      L3: { subtask_id: "L3", name: "SelectHalogen", difficulty: "easy", success: false, attempts: 0, phase: "illumination_setup", grounding_focus: ["widget", "text"], success_criteria: "Halogen lamp illumination is selected." },
      L4: { subtask_id: "L4", name: "Select10xFocus", difficulty: "medium", success: false, attempts: 0, phase: "objective_focus", grounding_focus: ["widget", "state"], success_criteria: "The 10X objective is selected and focus adjustment completes." },
      L5: { subtask_id: "L5", name: "FieldDiaphragmClose", difficulty: "easy", success: false, attempts: 0, phase: "kohler_setup", grounding_focus: ["widget", "state"], success_criteria: "The field diaphragm is closed to begin Kohler illumination." },
      L6: { subtask_id: "L6", name: "FieldDiaphragmFocus", difficulty: "medium", success: false, attempts: 0, phase: "kohler_setup", grounding_focus: ["widget", "state"], success_criteria: "Condenser focus is adjusted until the field diaphragm edge is sharp." },
      L7: { subtask_id: "L7", name: "FieldDiaphragmCenter", difficulty: "hard", success: false, attempts: 0, phase: "kohler_setup", grounding_focus: ["widget", "state"], success_criteria: "Condenser positioning centers the field diaphragm in the view." },
      L8: { subtask_id: "L8", name: "FieldDiaphragmOpen", difficulty: "easy", success: false, attempts: 0, phase: "kohler_setup", grounding_focus: ["widget", "state"], success_criteria: "The field diaphragm is reopened to the proper imaging boundary." },
      L9: { subtask_id: "L9", name: "ApertureDiaphragm", difficulty: "medium", success: false, attempts: 0, phase: "kohler_setup", grounding_focus: ["widget", "state"], success_criteria: "Condenser aperture is adjusted to the recommended field fraction." },
      L10: { subtask_id: "L10", name: "WhiteBalance", difficulty: "medium", success: false, attempts: 0, phase: "software_prep", grounding_focus: ["widget", "state"], success_criteria: "Imaging software white balance is completed from a blank region." },
      L11: { subtask_id: "L11", name: "ExposureAdjust", difficulty: "medium", success: false, attempts: 0, phase: "software_prep", grounding_focus: ["widget", "state"], success_criteria: "Exposure time is adjusted to a usable level for capture." },
      L12: { subtask_id: "L12", name: "BFCapture", difficulty: "hard", success: false, attempts: 0, phase: "capture", grounding_focus: ["widget", "state"], success_criteria: "LUT is checked and BF capture acquires the brightfield image." }
    },
    subtasks: [],
    steps: []
  };

  let stepIndex = 0;
  const SUBTASKS = episode._subtask_map;

  function getStateSnapshot() {
    const snap = {
      LFM_step_num: null,
      mode: null
    };
    try {
      if (typeof window.LFM_step_num === "number") snap.LFM_step_num = window.LFM_step_num;
    } catch (e) {
      console.warn("LFM benchmark: failed to read state", e);
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
    episode.success = !!(SUBTASKS.L12 && SUBTASKS.L12.success);
    delete episode._t0;
    delete episode._subtask_map;
    return episode;
  }

  window.LFM_BENCHMARK = {
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

  window.LFM_BENCHMARK_API = {
    markSubtaskAttempt: markSubtaskAttempt,
    markSubtaskSuccess: markSubtaskSuccess,
    inferCurrentSubtaskId: inferCurrentSubtaskId,
    recordAgentAction: recordAgentAction
  };

  function hideSimulatorInstructions() {
    var top = document.getElementById("top-instructions");
    if (top) top.style.display = "none";
    var bf = document.getElementById("bf-instructions");
    if (bf) bf.style.display = "none";
    var modal = document.getElementById("instructions-modal");
    if (modal) modal.classList.add("totally-hidden");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hideSimulatorInstructions);
  } else {
    hideSimulatorInstructions();
  }

  console.log("[LFM Benchmark] logger initialized for", episode.task_id, "episode:", episode.episode_id);
})();
