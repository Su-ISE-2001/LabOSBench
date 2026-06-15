// EDS Benchmark Frontend Logger
// 负责在 EDS Web 模拟器中记录一次 episode 的详细日志，
// 仅在 EDS_simulator 页面生效。

(function () {
  if (typeof window === "undefined") return;
  const path = window.location.pathname || "";
  if (!path.includes("EDS_simulator.html")) {
    return;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function genEpisodeId() {
    return "eds_ep_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1e6).toString(36);
  }

  function inferActionType(actionText) {
    const lower = String(actionText || "").toLowerCase();
    if (lower.includes("drag")) return "custom";
    if (lower.includes("typewrite") || lower.includes("keyboard.type") || lower.includes("press(")) return "input";
    return "click";
  }

  function getSelector(element) {
    if (!element) return null;
    if (element.id) return "#" + element.id;
    if (element.className && typeof element.className === "string") {
      const firstClass = element.className.split(" ").filter(Boolean)[0];
      if (firstClass) return "." + firstClass;
    }
    return element.tagName ? element.tagName.toLowerCase() : null;
  }

  const SUBTASK_ORDER = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];
  const t0 = performance.now();

  const episode = {
    _t0: t0,
    task_id: "EDS-Microanalysis-01",
    episode_id: genEpisodeId(),
    env: "EDS_Simulator",
    agent_name: null,
    success: false,
    timestamps: {
      start_time: nowIso(),
      end_time: null,
      duration_sec: 0
    },
    summary: {
      optimal_steps: 8,
      actual_steps: 0,
      step_efficiency: 0
    },
    grounding_metrics: {
      widget_grounding_accuracy: 0,
      text_grounding_accuracy: 0,
      state_grounding_accuracy: 0
    },
    _subtask_map: {
      S1: { subtask_id: "S1", name: "SelectPointMode", difficulty: "easy", success: false, attempts: 0, phase: "mode_selection", grounding_focus: ["widget", "text"], success_criteria: "Point mode is selected." },
      S2: { subtask_id: "S2", name: "PickSamplePoint", difficulty: "medium", success: false, attempts: 0, phase: "point_selection", grounding_focus: ["widget", "state"], success_criteria: "A sample point is selected on the BSE micrograph." },
      S3: { subtask_id: "S3", name: "OpenLabel", difficulty: "easy", success: false, attempts: 0, phase: "spectral_review", grounding_focus: ["widget", "text"], success_criteria: "The LABEL view is opened." },
      S4: { subtask_id: "S4", name: "OpenSemiQuant", difficulty: "easy", success: false, attempts: 0, phase: "spectral_review", grounding_focus: ["widget", "text"], success_criteria: "The SEMI-QUANT view is opened." },
      S5: { subtask_id: "S5", name: "OpenMaps", difficulty: "easy", success: false, attempts: 0, phase: "mapping", grounding_focus: ["widget", "text"], success_criteria: "The MAPS view is opened." },
      S6: { subtask_id: "S6", name: "ToggleSiMapping", difficulty: "medium", success: false, attempts: 0, phase: "mapping", grounding_focus: ["widget", "text", "state"], success_criteria: "The Si element map is toggled or displayed in the elements-of-interest workflow." },
      S7: { subtask_id: "S7", name: "OpenComposite", difficulty: "easy", success: false, attempts: 0, phase: "mapping", grounding_focus: ["widget", "text"], success_criteria: "The composite map view is opened." },
      S8: { subtask_id: "S8", name: "ReturnToMain", difficulty: "easy", success: false, attempts: 0, phase: "return", grounding_focus: ["widget", "state"], success_criteria: "The workflow returns to the main BSE image view." }
    },
    subtasks: [],
    steps: []
  };

  let stepIndex = 0;
  const SUBTASKS = episode._subtask_map;

  function getStateSnapshot() {
    const snap = {
      point_mode_active: null,
      current_screen: null,
      elements_button_label: null
    };
    try {
      const pointBtn = document.getElementById("point-btn");
      const bottomRight = document.getElementById("bottom-right");
      const elementsBtn = document.getElementById("btn-elements");
      if (pointBtn) snap.point_mode_active = pointBtn.classList.contains("btn-clickable") || pointBtn.classList.contains("current-control");
      if (bottomRight && bottomRight.innerText) snap.current_screen = bottomRight.innerText.trim();
      if (elementsBtn) snap.elements_button_label = (elementsBtn.innerText || "").trim();
    } catch (e) {
      console.warn("EDS benchmark: failed to read internal state", e);
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

  function inferSubtaskIdFromTarget(target) {
    const selector = getSelector(target);
    const text = String((target && (target.innerText || target.value || target.id)) || "").toLowerCase();
    if (!selector && !text) return null;
    if (selector && selector.includes("#point-btn")) return "S1";
    if (selector && selector.includes("#btn-label")) return "S3";
    if (selector && selector.includes("#btn-semiquant")) return "S4";
    if (selector && selector.includes("#btn-maps")) return "S5";
    if ((selector && selector.includes("#btn-elements")) || (selector && selector.includes("#Si")) || text.includes("si")) return "S6";
    if (selector && selector.includes("#btn-composite")) return "S7";
    if (selector && selector.includes("#bottom-right")) return "S8";
    return null;
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

  function markSuccessFromEventTarget(target) {
    const subtaskId = inferSubtaskIdFromTarget(target);
    if (subtaskId) {
      markSubtaskSuccess(subtaskId);
    }
  }

  // micrograph：模拟器在 mousedown 里立刻切屏并隐藏 canvas，同一指针的 click 往往落在 screen-2 上，
  // 若用 click 推断 S2 会失败；若在 click 上仍用「含 micrograph」的推断，又可能误标 S3 等。
  // 因此 S2 仅在 mousedown 捕获阶段、且 target 为 canvas 时标记；其它子任务仍用 click/change。
  document.addEventListener("mousedown", function (e) {
    const t = e.target;
    if (t && t.id === "micrograph-canvas") {
      markSubtaskSuccess("S2");
    }
  }, true);

  document.addEventListener("click", function (e) {
    markSuccessFromEventTarget(e.target);
  }, true);

  document.addEventListener("change", function (e) {
    markSuccessFromEventTarget(e.target);
  }, true);

  function getScopeLastSubtaskId() {
    var v = window.EDS_BENCHMARK_SCOPE_LAST_SUBTASK;
    if (typeof v === "string" && SUBTASK_ORDER.indexOf(v) >= 0) {
      return v;
    }
    return "S8";
  }

  function finalizeEpisode() {
    episode.timestamps.end_time = nowIso();
    episode.timestamps.duration_sec = (performance.now() - t0) / 1000.0;
    const scopeLast = getScopeLastSubtaskId();
    const scopeIdx = SUBTASK_ORDER.indexOf(scopeLast);
    if (scopeIdx >= 0) {
      episode.summary.optimal_steps = scopeIdx + 1;
    }
    const total = episode.summary.actual_steps || 0;
    episode.summary.step_efficiency = episode.summary.optimal_steps > 0 && total > 0
      ? episode.summary.optimal_steps / Math.max(total, 1)
      : 0;
    recomputeGroundingMetrics();
    episode.subtasks = Object.values(SUBTASKS);
    episode.scope_last_subtask = scopeLast;
    episode.success = !!(SUBTASKS[scopeLast] && SUBTASKS[scopeLast].success);
    delete episode._t0;
    delete episode._subtask_map;
    return episode;
  }

  window.EDS_BENCHMARK = {
    episode: episode,
    finalize: finalizeEpisode
  };

  window.EDS_BENCHMARK_API = {
    markSubtaskAttempt: markSubtaskAttempt,
    markSubtaskSuccess: markSubtaskSuccess,
    inferCurrentSubtaskId: inferCurrentSubtaskId,
    recordAgentAction: recordAgentAction
  };

  /**
   * Agent / 单子任务评估：隐藏顶部教学提示条与教学侧栏，避免显著文字与发光框干扰模型。
   */
  window.EDS_setAgentEvalUi = function (enabled) {
    window.__eds_benchmark_hide_instructions = !!enabled;
    var styleId = "eds-benchmark-agent-ui-style";
    var existing = document.getElementById(styleId);
    if (existing) {
      existing.parentNode.removeChild(existing);
    }
    if (!enabled) {
      return;
    }
    var st = document.createElement("style");
    st.id = styleId;
    st.textContent = [
      "#top-instructions { display: none !important; visibility: hidden !important; pointer-events: none !important;",
      "  box-shadow: none !important; opacity: 0 !important; height: 0 !important; overflow: hidden !important; }",
      "#top-instructions-txt { display: none !important; }",
      "#modal-area { display: none !important; }",
      "#modal-init.any-modal { box-shadow: none !important; -webkit-box-shadow: none !important; }",
    ].join("\n");
    document.head.appendChild(st);
    try {
      var ta = document.getElementById("top-instructions-txt");
      if (ta) ta.innerHTML = "";
      var info = document.getElementById("info-area");
      if (info) info.innerHTML = "";
    } catch (e) {}
  };

  console.log("EDS Benchmark Logger initialized");
})();


