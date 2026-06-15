"""
TEM Benchmark 轻量级测试脚本（带 Agent）

- 使用与 APT/XRD 相同的 UITars Agent（uitars15_v2）
- 使用 Playwright 控制 TEM 模拟器页面
- 支持分子任务准确率测试（通过 stop_after_subtask 与 subtask_success）

供以下脚本调用：
  - test_tem_subtask_demos.py（单子任务测试）
  - test_tem_agent_lightweight.py（完整流程，CLI 直接调用）
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from datetime import datetime
from typing import Any, Dict, List, Optional

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BENCHMARKS = os.path.dirname(_SCRIPT_DIR)
ROOT = os.path.dirname(_BENCHMARKS)
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "OSWorld-main"))
sys.path.insert(0, _BENCHMARKS)
from benchmarks.paths import get_results_dir

if "DOUBAO_API_KEY" not in os.environ:
    os.environ["DOUBAO_API_KEY"] = "sk-ui-tars-asd1231hascx12"
if "DOUBAO_API_URL" not in os.environ:
    os.environ["DOUBAO_API_URL"] = "http://180.184.148.133:11149/v1/chat/completions"

from playwright.sync_api import Page, sync_playwright

from apt_benchmark.test_apt_agent_lightweight import get_agent, page_to_observation
from fib_benchmark.test_fib_agent_lightweight import execute_action_on_page, should_skip_coord_convert

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# TEM 任务指令（与 set_tem_state_for_subtask 一致）
TEM_TASK_INSTRUCTION = """在 TEM（透射电镜）模拟器中完成一次完整的样品成像流程。具体步骤：
1. 从 SAMPLE 下拉框中选择一个样品（如 NANOPARTICLES、ZEBRAFISH、METAL、MINERAL）
2. 在示意图中点击 REMOVE，将空样品杆移出
3. 点击 AIRLOCK 面板中的 PUMP 按钮，对气锁抽真空
4. 点击 SPECIMEN 面板中的 INSERT 按钮，将样品插入电镜
5. 在 ACC. VOLTAGE 下拉框中选择120 kV
6. 点击 BEAM 面板中的 ON 按钮，打开电子束，并使用 FILAMENT CURRENT 滑块调节电子强度
7. 在 MAGNIFICATION 下拉框中选择一个倍率（如 LOW、MEDIUM、HIGH），并使用 BRIGHTNESS 滑块调节图像明暗
8. 使用 SPECIMEN STAGE POSITION 的 X/Y/Z 按钮调整样品台位置，使感兴趣区域位于视野中心
9. 使用 OBJECTIVE LENS FOCUS 滑块调节物镜焦距，使图像清晰
10. 在 CAMERA 面板中点击 INSERT 插入相机，然后点击 ACQUIRE 采集 TEM 图像

请按照以上步骤顺序完成整个任务。"""


TEM_SUBTASK_INSTRUCTIONS: List[str] = [
    "1. 从 SAMPLE 下拉框中选择一个样品（如 NANOPARTICLES、ZEBRAFISH、METAL、MINERAL）",
    "2. 在示意图中点击 REMOVE，将空样品杆移出",
    "3. 点击 AIRLOCK 面板中的 PUMP 按钮，对气锁抽真空",
    "4. 点击 SPECIMEN 面板中的 INSERT 按钮，将样品插入电镜",
    "5. 在 ACC. VOLTAGE 下拉框中选择120 kV",
    "6. 点击 BEAM 面板中的 ON 按钮，打开电子束，并使用 FILAMENT CURRENT 滑块调节电子强度",
    "7. 在 MAGNIFICATION 下拉框中选择一个倍率（如 LOW、MEDIUM、HIGH），并使用 BRIGHTNESS 滑块调节图像明暗",
    "8. 使用 SPECIMEN STAGE POSITION 的 X/Y/Z 按钮调整样品台位置，使感兴趣区域位于视野中心",
    "9. 使用 OBJECTIVE LENS FOCUS 滑块调节物镜焦距，使图像清晰",
    "10. 在 CAMERA 面板中点击 INSERT 插入相机，然后点击 ACQUIRE 采集 TEM 图像",
]


TEM_SUBTASK_DEFINITIONS: List[Dict[str, Any]] = [
    {"subtask_id": "T1", "name": "SelectSample", "phase": "setup", "grounding_focus": ["widget", "text"], "success_criteria": "A valid sample is selected from the SAMPLE dropdown."},
    {"subtask_id": "T2", "name": "RemoveHolder", "phase": "holder_prep", "grounding_focus": ["widget", "state"], "success_criteria": "The empty holder is removed and the specimen diagram shows INSERT."},
    {"subtask_id": "T3", "name": "PumpAirlock", "phase": "holder_prep", "grounding_focus": ["widget", "state"], "success_criteria": "The AIRLOCK pump completes and the button enters the evacuated state."},
    {"subtask_id": "T4", "name": "InsertSpecimen", "phase": "holder_prep", "grounding_focus": ["widget", "state"], "success_criteria": "The specimen is inserted into the microscope."},
    {"subtask_id": "T5", "name": "SetAccelerationVoltage", "phase": "beam_setup", "grounding_focus": ["widget", "text"], "success_criteria": "Acceleration voltage is set to 120 kV."},
    {"subtask_id": "T6", "name": "TurnBeamOn", "phase": "beam_setup", "grounding_focus": ["widget", "state"], "success_criteria": "The beam is turned on and filament current control is engaged."},
    {"subtask_id": "T7", "name": "SetMagnification", "phase": "imaging_setup", "grounding_focus": ["widget", "text"], "success_criteria": "A magnification level is selected and brightness adjustment becomes meaningful."},
    {"subtask_id": "T8", "name": "AdjustStagePosition", "phase": "imaging_setup", "grounding_focus": ["widget", "state"], "success_criteria": "Specimen stage positioning controls are enabled and the region is positioned."},
    {"subtask_id": "T9", "name": "AdjustFocus", "phase": "imaging_setup", "grounding_focus": ["widget", "state"], "success_criteria": "Objective focus slider is adjusted and the workflow advances to unlock the camera controls."},
    {"subtask_id": "T10", "name": "AcquireImage", "phase": "acquisition", "grounding_focus": ["widget", "state"], "success_criteria": "The camera is inserted and image acquisition dialog appears."},
]

TEM_SUBTASK_BY_ID: Dict[str, Dict[str, Any]] = {
    item["subtask_id"]: item for item in TEM_SUBTASK_DEFINITIONS
}


def _subtask_id_for_num(subtask_num: int) -> str:
    return f"T{subtask_num}"


def _clean_acc_voltage(raw_value: str) -> Optional[str]:
    value = (raw_value or "").strip().lower()
    if not value:
        return None
    if value == "a":
        return "120 kV"
    return raw_value


def to_tem_state_snapshot(state: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "sample_chosen": (state.get("sample_value") or None),
        "airlock_pumped": bool(state.get("airlock_disabled")) if "airlock_disabled" in state else None,
        "specimen_inserted": (
            "IN" in (state.get("specimen_html") or "") or
            (state.get("specimen_value") or "").lower() == "on"
        ) if state else None,
        "acc_voltage": _clean_acc_voltage(state.get("acc_volt_value") or ""),
        "beam_on": ((state.get("filament_value") or "").lower() == "on") if state else None,
        "magnification": (state.get("magnification_value") or None),
        "camera_inserted": None,
        "image_acquired": (not state.get("save_modal_hidden")) if "save_modal_hidden" in state else None,
        "current_step": state.get("current_step"),
    }


def init_tem_benchmark_log(agent_name: str) -> Dict[str, Any]:
    return {
        "_t0": time.time(),
        "task_id": "TEM-Load-And-Acquire-01",
        "episode_id": "tem_ep_" + datetime.now().strftime("%Y%m%d_%H%M%S_%f"),
        "env": "TEM_Simulator",
        "agent_name": agent_name,
        "success": False,
        "timestamps": {
            "start_time": datetime.utcnow().isoformat() + "Z",
            "end_time": None,
            "duration_sec": 0.0,
        },
        "summary": {
            "optimal_steps": len(TEM_SUBTASK_DEFINITIONS),
            "actual_steps": 0,
            "step_efficiency": 0.0,
        },
        "grounding_metrics": {
            "widget_grounding_accuracy": 0.0,
            "text_grounding_accuracy": 0.0,
            "state_grounding_accuracy": 0.0,
        },
        "_subtask_map": {
            item["subtask_id"]: {
                "subtask_id": item["subtask_id"],
                "name": item["name"],
                "success": False,
                "attempts": 0,
                "phase": item["phase"],
                "grounding_focus": item["grounding_focus"],
                "success_criteria": item["success_criteria"],
            }
            for item in TEM_SUBTASK_DEFINITIONS
        },
        "subtasks": [],
        "steps": [],
    }


def recompute_tem_grounding_metrics(benchmark_log: Dict[str, Any]) -> None:
    """按子任务级 0/1 成功率重算 grounding 指标。"""
    subtasks = list((benchmark_log.get("_subtask_map") or {}).values())
    metrics = benchmark_log["grounding_metrics"]
    metric_focuses = {
        "widget_grounding_accuracy": "widget",
        "text_grounding_accuracy": "text",
        "state_grounding_accuracy": "state",
    }

    attempted_subtasks = [
        st for st in subtasks
        if int(st.get("attempts", 0) or 0) > 0
    ]

    for metric_key, focus in metric_focuses.items():
        relevant = [
            st for st in attempted_subtasks
            if focus in (st.get("grounding_focus") or [])
        ]
        if not relevant:
            metrics[metric_key] = 0.0
            continue
        metrics[metric_key] = sum(1.0 if st.get("success", False) else 0.0 for st in relevant) / len(relevant)


def infer_action_type(action: Any) -> str:
    action_str = str(action)
    lower = action_str.lower()
    if "drag" in lower:
        return "custom"
    if "typewrite" in lower or "keyboard.type" in lower:
        return "input"
    if "press(" in lower:
        return "input"
    return "click"


def record_tem_step(
    benchmark_log: Dict[str, Any],
    subtask_id: str,
    action: Any,
    before_state: Dict[str, Any],
) -> None:
    step_idx = len(benchmark_log["steps"])
    benchmark_log["steps"].append({
        "index": step_idx,
        "timestamp_offset_sec": round(time.time() - benchmark_log["_t0"], 4),
        "subtask_id": subtask_id,
        "action_type": infer_action_type(action),
        "target": {
            "dom_selector": None,
            "bbox": [],
            "text": str(action)[:300],
        },
        "hit_expected_target": True,
        "relies_on_text": "text" in TEM_SUBTASK_BY_ID[subtask_id]["grounding_focus"],
        "chosen_text": None,
        "state_snapshot": to_tem_state_snapshot(before_state),
        "reward": None,
        "agent_comment": None,
    })
    benchmark_log["summary"]["actual_steps"] = len(benchmark_log["steps"])


def finalize_tem_benchmark_log(benchmark_log: Dict[str, Any], completed_step: int, status_success: bool) -> Dict[str, Any]:
    benchmark_log["timestamps"]["end_time"] = datetime.utcnow().isoformat() + "Z"
    benchmark_log["timestamps"]["duration_sec"] = round(time.time() - benchmark_log["_t0"], 4)
    benchmark_log["success"] = bool(status_success or completed_step >= len(TEM_SUBTASK_DEFINITIONS))

    for idx, item in enumerate(TEM_SUBTASK_DEFINITIONS, start=1):
        if completed_step >= idx:
            benchmark_log["_subtask_map"][item["subtask_id"]]["success"] = True

    benchmark_log["subtasks"] = list(benchmark_log["_subtask_map"].values())
    actual_steps = benchmark_log["summary"]["actual_steps"]
    benchmark_log["summary"]["step_efficiency"] = (
        benchmark_log["summary"]["optimal_steps"] / max(actual_steps, 1) if actual_steps > 0 else 0.0
    )
    recompute_tem_grounding_metrics(benchmark_log)
    del benchmark_log["_t0"]
    del benchmark_log["_subtask_map"]
    return benchmark_log


def get_tem_state(page: Page) -> Dict[str, Any]:
    """读取 TEM DOM 状态并计算当前完成到第几步（1–10）。"""
    try:
        js = (
            "(() => {"
            " const getVal = (sel) => {"
            "   const el = document.querySelector(sel);"
            "   if (!el) return '';"
            "   try {"
            "     if (typeof window.jQuery !== 'undefined') {"
            "       const jqVal = window.jQuery(sel).val();"
            "       if (jqVal != null && jqVal !== '') return String(jqVal);"
            "     }"
            "     return el.value || el.getAttribute('value') || '';"
            "   } catch (e) { return ''; }"
            " };"
            " const getHtml = (sel) => {"
            "   const el = document.querySelector(sel);"
            "   return el ? (el.innerHTML || '').trim() : '';"
            " };"
            " const isDisabled = (sel) => {"
            "   const el = document.querySelector(sel);"
            "   return el ? el.disabled : true;"
            " };"
            " const modalHidden = (sel) => {"
            "   const el = document.querySelector(sel);"
            "   return el ? el.classList.contains('totally-hidden') : true;"
            " };"
            " const sampleEl = document.querySelector('#sample');"
            " const sampleVal = sampleEl ? String(sampleEl.value || '') : '';"
            " let sampleMenuOpen = false;"
            " try {"
            "   let sampleBtn = null;"
            "   if (sampleEl) {"
            "     const fs = sampleEl.closest ? sampleEl.closest('fieldset') : (sampleEl.parentElement && sampleEl.parentElement.tagName === 'FIELDSET' ? sampleEl.parentElement : null);"
            "     if (fs) sampleBtn = fs.querySelector('.ui-selectmenu-button');"
            "     if (!sampleBtn) sampleBtn = document.querySelector('#sample-button');"
            "   }"
            "   if (sampleBtn) sampleMenuOpen = sampleBtn.classList.contains('ui-selectmenu-open');"
            " } catch (e) {}"
            " const diagSpecimen = getHtml('#btn-diag-specimen');"
            " const airlockDisabled = isDisabled('#btn-airlock');"
            " const airlockHtml = getHtml('#btn-airlock');"
            " const specimenHtml = getHtml('#btn-specimen');"
            " const specimenVal = document.querySelector('#btn-specimen') ? (document.querySelector('#btn-specimen').getAttribute('value') || '') : '';"
            " const accVolt = getVal('#acc-volt');"
            " const filamentVal = document.querySelector('#btn-filament') ? (document.querySelector('#btn-filament').getAttribute('value') || '') : '';"
            " const magnVal = getVal('#magnification');"
            " const focusDisabled = isDisabled('#focus');"
            " const cameraLabelEnabled = (() => {"
            "   const el = document.querySelector('#camera-label');"
            "   return !!(el && !el.classList.contains('label-disabled'));"
            " })();"
            " const saveModalHidden = modalHidden('#save-modal-window');"
            " return {"
            "   sample_value: sampleVal,"
            "   sample_menu_open: sampleMenuOpen,"
            "   diag_specimen_html: diagSpecimen,"
            "   airlock_disabled: airlockDisabled,"
            "   airlock_html: airlockHtml,"
            "   specimen_html: specimenHtml,"
            "   specimen_value: specimenVal,"
            "   acc_volt_value: accVolt,"
            "   filament_value: filamentVal,"
            "   magnification_value: magnVal,"
            "   focus_disabled: focusDisabled,"
            "   camera_label_enabled: cameraLabelEnabled,"
            "   save_modal_hidden: saveModalHidden"
            " };"
            "})()"
        )
        state = page.evaluate(js) or {}
        s = state
        current = 0
        sample_val = (s.get("sample_value") or "").strip()
        sample_menu_open = s.get("sample_menu_open") is True
        # 第 1 步：选择样品（value 为 1–4）且下拉已关闭
        if sample_val in ("1", "2", "3", "4") and not sample_menu_open:
            current = 1
        # 第 2 步：示意图按钮文字包含 INSERT
        if current >= 1 and "INSERT" in (s.get("diag_specimen_html") or ""):
            current = 2
        # 第 3 步：AIRLOCK 按钮 disabled 且文字包含 EVACUATE
        if current >= 2 and s.get("airlock_disabled") and "EVACUATE" in (s.get("airlock_html") or ""):
            current = 3
        # 第 4 步：SPECIMEN 按钮为 IN 或 value 为 on
        if current >= 3 and ("IN" in (s.get("specimen_html") or "") or (s.get("specimen_value") or "").lower() == "on"):
            current = 4
        # 第 5 步：ACC. VOLTAGE 必须为 120kV（select value == 'a'）
        v_acc = (s.get("acc_volt_value") or "").strip().lower()
        if current >= 4 and v_acc == "a":
            current = 5
        # 第 6 步：BEAM 打开
        if current >= 5 and (s.get("filament_value") or "").lower() == "on":
            current = 6
        # 第 7 步：倍率已选择
        if current >= 6 and (s.get("magnification_value") or "").strip():
            current = 7
        # 第 8 步：样品台 Z 轴标签启用
        if current >= 7:
            try:
                sp = page.evaluate(
                    "(() => { const el = document.querySelector('#specimen-position .title-z'); return el && !el.classList.contains('label-disabled'); })()"
                )
                if sp:
                    current = 8
            except Exception:
                pass
        # 第 9 步：focus 调整后流程推进，相机会被解锁
        if current >= 8 and s.get("camera_label_enabled"):
            current = 9
        # 第 10 步：保存弹窗已显示
        if current >= 9 and not s.get("save_modal_hidden"):
            current = 10
        state["current_step"] = current
        return state
    except Exception as e:
        logger.debug("get_tem_state failed: %s", e)
        return {}


def is_subtask_expected_state_reached(subtask_index: int, state: Dict[str, Any]) -> bool:
    """根据 current_step 判断第 subtask_index+1 个子任务是否已完成。"""
    if subtask_index < 0 or subtask_index >= 10:
        return True
    cur = (state or {}).get("current_step", 0)
    return cur >= subtask_index + 1


def _with_tem_benchmark_params(tem_url: str) -> str:
    """在评测时关闭 TEM 页面里的教学提示层。"""
    parts = urlsplit(tem_url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query.setdefault("benchmark", "1")
    query.setdefault("hide_guidance", "1")
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def run_tem_test_lightweight(
    agent_name: str = "uitars15_v2",
    model: Optional[str] = None,
    max_steps: int = 80,
    tem_url: str = "http://localhost:8080/static/simulator/tem_simulator/TEM_simulator.html",
    result_dir: str = get_results_dir("tem"),
    headless: bool = False,
    stop_after_subtask: Optional[int] = None,
    subtask_accuracy_run_index: Optional[int] = None,
    temperature: float = 0,
    coordinate_type: str = "relative",
    **agent_kwargs: Any,
) -> Dict[str, Any]:
    """
    轻量级 TEM 测试。若指定 stop_after_subtask（1-10），则先 TEM_JUMP_TO_STATE 到该子任务前，再让 agent 执行该子任务，最后返回 subtask_success。
    """
    subtask_accuracy_done = False
    subtask_accuracy_success: Optional[bool] = None
    status_success = False
    last_tem_state: Dict[str, Any] = {}

    os.makedirs(result_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    episode_dir = os.path.join(result_dir, f"episode_{ts}")
    os.makedirs(episode_dir, exist_ok=True)

    logger.info("开始 TEM 轻量级测试 - Agent: %s, Model: %s", agent_name, model or "default")
    tem_url = _with_tem_benchmark_params(tem_url)
    logger.info("TEM URL: %s", tem_url)
    logger.info("结果目录: %s", episode_dir)
    benchmark_log = init_tem_benchmark_log(agent_name)

    # 初始化 Agent 参数（尽量与 APT/XRD 一致）
    from benchmarks.vlaa_gui_support import resolve_subtask_agent_kwargs
    agent_kwargs = resolve_subtask_agent_kwargs(
        agent_name, agent_kwargs, model=model, max_steps_per_subtask=max_steps
    )
    agent_kwargs.setdefault("model_type", "doubao")
    agent_kwargs.setdefault("max_tokens", 3000)
    agent_kwargs.setdefault("temperature", temperature)
    agent_kwargs.setdefault("max_trajectory_length", None)
    agent_kwargs.setdefault("max_image_history_length", 5)
    agent_kwargs.setdefault("use_thinking", False)
    agent_kwargs.setdefault("language", "Chinese")
    agent_kwargs.setdefault("coordinate_type", coordinate_type)

    agent = get_agent(agent_name, **agent_kwargs)

    agent_screen_size = (1920, 1080)
    try:
        if hasattr(agent, "screen_size") and agent.screen_size:
            agent_screen_size = tuple(agent.screen_size)  # type: ignore[arg-type]
    except Exception:
        pass

    no_convert = should_skip_coord_convert(
        agent_kwargs.get("model"),
        agent_name,
        agent_kwargs.get("model_type"),
    )

    with sync_playwright() as p:
        logger.info("启动浏览器 (headless=%s)...", headless)
        try:
            browser = p.chromium.launch(headless=headless)
        except Exception as e:
            logger.warning("启动浏览器失败，尝试 headless 模式: %s", e)
            browser = p.chromium.launch(headless=True)
            headless = True

        context = browser.new_context(
            viewport={"width": agent_screen_size[0], "height": agent_screen_size[1]},
            device_scale_factor=1.0,
        )
        page = context.new_page()

        try:
            logger.info("打开 TEM 模拟器: %s", tem_url)
            page.goto(tem_url, wait_until="networkidle", timeout=60000)
            time.sleep(3)
            try:
                page.wait_for_function("window.promise_fullfilled_num >= 13", timeout=15000)
            except Exception as e:
                logger.warning("等待 TEM 资源加载时出错: %s", e)
            time.sleep(2)

            observation = page_to_observation(page, TEM_TASK_INSTRUCTION)
            step_count = 0
            turn_count = 0
            # 分子任务准确率：预先跳到执行该子任务前的状态
            if stop_after_subtask is not None and stop_after_subtask >= 1:
                turn_count = stop_after_subtask - 1
                logger.info("分子任务测试: 只执行第 %d 个子任务 (run %s)", stop_after_subtask, subtask_accuracy_run_index or 1)
                if stop_after_subtask >= 2:
                    subtask_index = stop_after_subtask - 2
                    logger.info("跳转到状态 stepIndex=%d（前 %d 个子任务已完成）", subtask_index, stop_after_subtask - 1)
                    try:
                        page.evaluate(
                            "window.TEM_JUMP_TO_STATE && window.TEM_JUMP_TO_STATE(%d)" % subtask_index
                        )
                        time.sleep(1.5)
                    except Exception as e:
                        logger.warning("调用 TEM_JUMP_TO_STATE 失败: %s", e)
                    observation = page_to_observation(page, TEM_TASK_INSTRUCTION)
                    last_tem_state = get_tem_state(page)
                    completed_step = int(last_tem_state.get("current_step", 0) or 0)
                    for idx in range(1, completed_step + 1):
                        benchmark_log["_subtask_map"][_subtask_id_for_num(idx)]["success"] = True

            while step_count < max_steps:
                logger.info("=== Step %d/%d ===", step_count + 1, max_steps)
                subtask_hint = TEM_SUBTASK_INSTRUCTIONS[turn_count % len(TEM_SUBTASK_INSTRUCTIONS)]
                current_instruction = TEM_TASK_INSTRUCTION + "\n\n" + subtask_hint
                logger.info("当前子任务提示: %s", subtask_hint)

                try:
                    pred = agent.predict(current_instruction, observation)
                    response, actions = pred[0], pred[1]
                except AttributeError:
                    actions = [agent.step(observation, current_instruction)]
                except Exception as e:
                    logger.error("Agent 生成动作失败: %s", e)
                    if stop_after_subtask is not None:
                        subtask_accuracy_success = False
                        subtask_accuracy_done = True
                    break

                if not actions or actions[0] in ["FAIL", "DONE", "client error"]:
                    logger.warning("Agent 返回无效动作: %s", actions[0] if actions else None)
                    if stop_after_subtask is not None:
                        subtask_accuracy_success = False
                        subtask_accuracy_done = True
                    break

                for action in actions:
                    if action in ["FAIL", "DONE", "WAIT"]:
                        continue
                    before_state = get_tem_state(page)
                    if not last_tem_state:
                        last_tem_state = before_state
                    current_target_num = min(max(turn_count + 1, 1), len(TEM_SUBTASK_DEFINITIONS))
                    current_subtask_id = _subtask_id_for_num(current_target_num)
                    benchmark_log["_subtask_map"][current_subtask_id]["attempts"] += 1
                    record_tem_step(benchmark_log, current_subtask_id, action, before_state)
                    try:
                        before_path = os.path.join(episode_dir, f"step_{step_count + 1}_before.png")
                        page.screenshot(path=before_path)
                    except Exception:
                        pass

                    viewport = page.viewport_size
                    actual_size = (
                        (viewport["width"], viewport["height"]) if viewport else agent_screen_size
                    )
                    action_result = execute_action_on_page(
                        page, action, agent_screen_size, actual_size, no_coord_convert=no_convert,
                        model_type=agent_kwargs.get("model_type"),
                    )
                    if isinstance(action_result, tuple):
                        _, mouse_pos = action_result
                    else:
                        mouse_pos = None

                    time.sleep(1.5)
                    step_count += 1
                    observation = page_to_observation(page, TEM_TASK_INSTRUCTION, mouse_pos=mouse_pos)
                    try:
                        after_path = os.path.join(episode_dir, f"step_{step_count}_after.png")
                        page.screenshot(path=after_path)
                    except Exception:
                        pass

                    state_after = get_tem_state(page)
                    last_tem_state = state_after
                    completed_after = int(state_after.get("current_step", 0) or 0)
                    reached_target = completed_after >= current_target_num

                    if reached_target:
                        benchmark_log["_subtask_map"][current_subtask_id]["success"] = True

                    if is_subtask_expected_state_reached(turn_count, state_after):
                        turn_count += 1
                        logger.info("页面已满足第 %d 个子任务预期", turn_count)

                    # 分子任务测试：达到指定子任务后停止并判定
                    if stop_after_subtask is not None and turn_count >= stop_after_subtask:
                        subtask_accuracy_success = is_subtask_expected_state_reached(
                            stop_after_subtask - 1, state_after
                        )
                        subtask_accuracy_done = True
                        logger.info(
                            "分子任务测试: 第 %d 个子任务 判定为 %s",
                            stop_after_subtask,
                            "成功" if subtask_accuracy_success else "失败",
                        )
                        break

                if subtask_accuracy_done:
                    break
                if turn_count >= len(TEM_SUBTASK_INSTRUCTIONS):
                    status_success = True
                    break

        except Exception as e:
            logger.error("测试出错: %s", e, exc_info=True)
        finally:
            time.sleep(2)
            browser.close()

    result: Dict[str, Any] = {
        "success": status_success,
        "benchmark_log": None,
        "episode_dir": episode_dir,
    }
    completed_step = int(last_tem_state.get("current_step", 0) or 0)
    finalized_log = finalize_tem_benchmark_log(benchmark_log, completed_step, status_success)
    log_path = os.path.join(episode_dir, "tem_benchmark_log.json")
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(finalized_log, f, indent=2, ensure_ascii=False)
    result["benchmark_log"] = finalized_log
    if stop_after_subtask is not None:
        result["subtask_success"] = subtask_accuracy_success if subtask_accuracy_done else None
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent", default="uitars15_v2")
    parser.add_argument("--model", default=None)
    parser.add_argument("--model_type", default="doubao")
    parser.add_argument("--tem_url", default="http://localhost:8080/static/simulator/tem_simulator/TEM_simulator.html")
    parser.add_argument("--result_dir", default=get_results_dir("tem"))
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--max_steps", type=int, default=80)
    parser.add_argument("--stop_after_subtask", type=int, default=None, help="分子任务测试：只执行到第 N 个子任务")
    parser.add_argument("--subtask_accuracy_run_index", type=int, default=None)
    parser.add_argument("--temperature", type=float, default=0)
    parser.add_argument("--coordinate_type", default="relative")
    args = parser.parse_args()
    run_tem_test_lightweight(
        agent_name=args.agent,
        model=args.model,
        model_type=args.model_type,
        max_steps=args.max_steps,
        tem_url=args.tem_url,
        result_dir=args.result_dir,
        headless=args.headless,
        stop_after_subtask=args.stop_after_subtask,
        subtask_accuracy_run_index=args.subtask_accuracy_run_index,
        temperature=args.temperature,
        coordinate_type=args.coordinate_type,
    )


if __name__ == "__main__":
    main()
