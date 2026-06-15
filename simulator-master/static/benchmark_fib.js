// FIB Benchmark Frontend Logger
// 在 FIB Web 模拟器中记录一次 episode 的详细日志，
// 并生成符合 fib_benchmark/schema.json 的 JSON 对象。

(function () {
  if (typeof window === "undefined") return;
  const path = window.location.pathname || "";
  if (!path.includes("FIB_simulator.html")) {
    return;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function genEpisodeId() {
    return "fib_ep_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1e6).toString(36);
  }

  function inferActionType(actionText) {
    const lower = String(actionText || "").toLowerCase();
    if (lower.includes("drag")) return "custom";
    if (lower.includes("typewrite") || lower.includes("keyboard.type") || lower.includes("press(")) return "input";
    return "click";
  }

  const SUBTASK_ORDER = [
    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10",
    "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19", "F20"
  ];
  const t0 = performance.now();
  window._FIB_BENCHMARK_t0 = t0;

  const episode = {
    _t0: t0,
    task_id: "FIB-Full-Workflow-01",
    episode_id: genEpisodeId(),
    env: "FIB_Simulator",
    agent_name: null,
    success: false,
    timestamps: {
      start_time: nowIso(),
      end_time: null,
      duration_sec: 0
    },
    summary: {
      optimal_steps: 35,
      actual_steps: 0,
      step_efficiency: 0
    },
    grounding_metrics: {
      widget_grounding_accuracy: 0,
      text_grounding_accuracy: 0,
      state_grounding_accuracy: 0
    },
    _subtask_map: {
      F1: { subtask_id: "F1", name: "VentChamber", difficulty: "easy", success: false, attempts: 0, phase: "load_lock", grounding_focus: ["widget", "state"], success_criteria: "The chamber is vented successfully." },
      F2: { subtask_id: "F2", name: "PumpDown", difficulty: "easy", success: false, attempts: 0, phase: "load_lock", grounding_focus: ["widget", "state"], success_criteria: "The chamber is pumped down after venting." },
      F3: { subtask_id: "F3", name: "SelectSample", difficulty: "easy", success: false, attempts: 0, phase: "sample_setup", grounding_focus: ["widget", "text"], success_criteria: "Si Wafer is selected from the sample dropdown." },
      F4: { subtask_id: "F4", name: "EbeamOn", difficulty: "medium", success: false, attempts: 0, phase: "ebeam_setup", grounding_focus: ["widget", "text", "state"], success_criteria: "Electron beam parameters are set and the electron beam HT is turned on." },
      F5: { subtask_id: "F5", name: "EbeamLiveFocus", difficulty: "hard", success: false, attempts: 0, phase: "ebeam_setup", grounding_focus: ["widget", "state"], success_criteria: "Electron live view, focus, brightness/contrast, and center feature alignment are completed." },
      F6: { subtask_id: "F6", name: "WD7mm", difficulty: "medium", success: false, attempts: 0, phase: "ebeam_setup", grounding_focus: ["widget", "text", "state"], success_criteria: "Electron beam magnification is set to 3000x and WD is set to 7 mm." },
      F7: { subtask_id: "F7", name: "Tilt10deg", difficulty: "easy", success: false, attempts: 0, phase: "stage_alignment", grounding_focus: ["widget", "text", "state"], success_criteria: "Stage tilt is set to 10 degrees." },
      F8: { subtask_id: "F8", name: "StageZCenter", difficulty: "hard", success: false, attempts: 0, phase: "stage_alignment", grounding_focus: ["widget", "state"], success_criteria: "Stage Z and related electron-beam preparation steps complete the pre-ion-beam alignment." },
      F9: { subtask_id: "F9", name: "IonBeamLiveCenter", difficulty: "hard", success: false, attempts: 0, phase: "ion_beam_setup", grounding_focus: ["widget", "text", "state"], success_criteria: "Ion beam settings are applied, ion live view is used, and the feature is centered." },
      F10: { subtask_id: "F10", name: "FirstRectStart", difficulty: "hard", success: false, attempts: 0, phase: "rough_milling", grounding_focus: ["widget", "state"], success_criteria: "The first rectangular silicon milling pattern is placed and started." },
      F11: { subtask_id: "F11", name: "DeletePattern", difficulty: "easy", success: false, attempts: 0, phase: "rough_milling", grounding_focus: ["widget", "state"], success_criteria: "The completed first milling pattern is deleted." },
      F12: { subtask_id: "F12", name: "SecondRectStart", difficulty: "hard", success: false, attempts: 0, phase: "rough_milling", grounding_focus: ["widget", "text", "state"], success_criteria: "The second rectangular milling pattern is created and started with the higher current." },
      F13: { subtask_id: "F13", name: "BeamCurrent10pA", difficulty: "medium", success: false, attempts: 0, phase: "rough_milling", grounding_focus: ["widget", "text", "state"], success_criteria: "After the second milling, the ion beam current is restored to 10 pA." },
      F14: { subtask_id: "F14", name: "PtNeedleIn", difficulty: "easy", success: false, attempts: 0, phase: "pt_deposition", grounding_focus: ["widget", "text"], success_criteria: "The Pt needle is inserted." },
      F15: { subtask_id: "F15", name: "PtDepositionStart", difficulty: "hard", success: false, attempts: 0, phase: "pt_deposition", grounding_focus: ["widget", "state"], success_criteria: "A Pt deposition pattern is placed and started." },
      F16: { subtask_id: "F16", name: "IonSnapshot5000x", difficulty: "medium", success: false, attempts: 0, phase: "imaging", grounding_focus: ["widget", "text", "state"], success_criteria: "Ion beam magnification is set to 5000x and a snapshot is captured." },
      F17: { subtask_id: "F17", name: "CrossSectionCutStart", difficulty: "hard", success: false, attempts: 0, phase: "cross_section", grounding_focus: ["widget", "text", "state"], success_criteria: "Cross Section Cutting pattern is configured and started at 3 nA." },
      F18: { subtask_id: "F18", name: "CleaningCrossSectionStart", difficulty: "hard", success: false, attempts: 0, phase: "cross_section", grounding_focus: ["widget", "text", "state"], success_criteria: "Cleaning Cross Section Cutting is configured and started at 0.1 nA." },
      F19: { subtask_id: "F19", name: "Tilt0deg", difficulty: "medium", success: false, attempts: 0, phase: "final_imaging", grounding_focus: ["widget", "state"], success_criteria: "Cross-section imaging is performed and the tilt is returned to 0 degrees." },
      F20: { subtask_id: "F20", name: "TaskComplete", difficulty: "easy", success: false, attempts: 0, phase: "final_imaging", grounding_focus: ["widget", "state"], success_criteria: "The final centering or completion confirmation step finishes the full FIB workflow." }
    },
    subtasks: [],
    steps: []
  };

  let stepIndex = 0;
  function getStateSnapshot() {
    const snap = {
      sample_selected: null,
      ebeam_ht_on: null,
      wd_mm: null,
      tilt_deg: null,
      ion_beam_ht_on: null,
      pattern_started: null
    };
    try {
      const wdEl = document.querySelector("#wd-val");
      if (wdEl && wdEl.innerText) snap.wd_mm = wdEl.innerText.trim();
      const tEl = document.querySelector("#ebeam-t-val");
      if (tEl && tEl.innerText) snap.tilt_deg = tEl.innerText.trim();
    } catch (e) {
      console.warn("FIB benchmark: failed to read state", e);
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

  const SUBTASKS = episode._subtask_map;

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
    episode.success = episode.subtasks.every(function (st) { return st.success; });
    delete episode._t0;
    delete episode._subtask_map;
    return episode;
  }

  window.FIB_BENCHMARK = {
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

  window.FIB_BENCHMARK_API = {
    markSubtaskAttempt: markSubtaskAttempt,
    markSubtaskSuccess: markSubtaskSuccess,
    inferCurrentSubtaskId: inferCurrentSubtaskId,
    recordAgentAction: recordAgentAction
  };

  console.log("[FIB Benchmark] logger initialized for", episode.task_id, "episode:", episode.episode_id);
})();
