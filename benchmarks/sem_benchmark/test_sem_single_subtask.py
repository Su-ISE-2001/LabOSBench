r"""
SEM Benchmark 单子任务单步成功率测试脚本

流程：每次尝试后刷新网页 → 用软件模拟点击/拖动完成前置任务 → 新建 Agent → 开始新一次尝试。
- 通过 Playwright 模拟真实用户操作（点击按钮、拖动滑块）部署每个子任务的初始状态
- 每次尝试使用新的 Agent 实例，避免上下文干扰

依赖：benchmark_sem.js

python test_sem_single_subtask.py --subtask all --max_attempts 10 --use-system-chrome
python test_sem_single_subtask.py --subtask all --max_attempts 10 --max_steps_per_attempt 1 --use-system-chrome --model doubao-seed-1-6-vision-250815
python test_sem_single_subtask.py --subtask all --max_attempts 1 --max_steps_per_attempt 1 --use-system-chrome --model kimi-k2.5
python test_sem_single_subtask.py --subtask S5 --runs 5 --max_steps_subtask 1 --agent gui_owl_vllm --model gui-owl-1.5-8b-instruct --api_url http://127.0.0.1:8000/v1/chat/completions
# OpenAI 兼容网关（如 polo）：需 export UITARS_OPENAI_COMPAT=1，避免 uitars15_v2 发送豆包专有 thinking 字段
# OpenAI 兼容网关（Claude Code / polo 等）：专用 agent，无需 UITARS_OPENAI_COMPAT
# python test_sem_single_subtask.py --agent openai_compat_chat --subtask S1 --runs 1 --model claude-sonnet-4-6 --api_url https://poloapi.top/v1/chat/completions --api_key $DOUBAO_API_KEY
"""

import argparse
import json
import logging
import os
import time
from datetime import datetime
from pathlib import Path

# 添加项目根目录到路径
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BENCHMARKS = os.path.dirname(_SCRIPT_DIR)
ROOT = os.path.dirname(_BENCHMARKS)
for p in [ROOT, os.path.join(ROOT, "OSWorld-main"), _BENCHMARKS]:
    if p not in sys.path:
        sys.path.insert(0, p)
from benchmarks.paths import get_results_dir
from benchmarks.utils import prefer_gui_owl_agent_when_model_name
from benchmarks.vlaa_gui_support import resolve_subtask_agent_kwargs

# API 配置：支持 API_KEY/API_URL 或 DOUBAO_API_* 或 KIMI_API_*
# uitars15_v2 使用 DOUBAO_API_KEY/DOUBAO_API_URL，需确保二者被设置
_DEFAULT_API_KEY = "sk-ui-tars-asd1231hascx12"
_DEFAULT_API_URL = "http://180.184.148.133:11149/v1/chat/completions"

if "API_KEY" not in os.environ:
    os.environ["API_KEY"] = os.environ.get("DOUBAO_API_KEY") or os.environ.get("KIMI_API_KEY") or _DEFAULT_API_KEY
if "API_URL" not in os.environ:
    os.environ["API_URL"] = os.environ.get("DOUBAO_API_URL") or os.environ.get("KIMI_API_URL") or _DEFAULT_API_URL
# uitars15_v2 直接读取 DOUBAO_API_KEY/DOUBAO_API_URL
if "DOUBAO_API_KEY" not in os.environ:
    os.environ["DOUBAO_API_KEY"] = os.environ.get("API_KEY") or _DEFAULT_API_KEY
if "DOUBAO_API_URL" not in os.environ:
    os.environ["DOUBAO_API_URL"] = os.environ.get("API_URL") or _DEFAULT_API_URL

from playwright.sync_api import sync_playwright

from test_sem_agent_lightweight import (
    clear_last_mouse_pos,
    execute_action_on_page,
    extract_benchmark_log,
    get_agent,
    page_to_observation,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def _sem_url_with_mosaic_roi(sem_url: str) -> str:
    """S12 子任务需在 URL 上开启 sem_subtask_mosaic=1，与 benchmark_sem.js 一致。"""
    if "sem_subtask_mosaic=1" in sem_url:
        return sem_url
    sep = "&" if "?" in sem_url else "?"
    return f"{sem_url}{sep}sem_subtask_mosaic=1"


# 子任务 ID 与名称（与 benchmark_sem.js _subtask_map 一致）
SUBTASKS = {
    "S1": "VentChamber",
    "S2": "OpenChamber",
    "S3": "CloseChamber",
    "S4": "EvacuateChamber",
    "S5": "SelectSample",
    "S6": "TurnOnHT",
    "S7": "SetAccVoltage",
    "S8": "SetContrast",
    "S9": "AdjustClarity",
    "S10": "StartScan",
    "S11": "SaveImage",
    "S12": "MosaicRoiRegionSave",
}

# 每个子任务的单步指令（与 benchmark 子任务顺序一致）
SUBTASK_INSTRUCTIONS = {
    "S1": "点击 VENT 按钮让空气进入样品腔室。",
    "S2": "点击 OPEN 按钮打开腔室。",
    "S3": "点击 CLOSE 按钮关闭腔室。",
    "S4": "点击 EVACUATE 按钮抽真空。",
    "S5": "在 Sample 下拉框中选择一种样品。",
    "S6": "点击 HT 高压按钮开启高压：可点击的是「HT」文字右侧的圆形按钮（不是左侧的「HT」文字本身）。",
    "S7": "将加速电压滑块（ACCELERATING VOLTAGE）从 0Kv 拖动到 10Kv 位置。",
    "S8": "拖动 CONTRAST 滑块（#slider-contrast）调整对比度。",
    "S9": "拖动 FOCUS COARSE 滑块（#slider-focus-c）调整画面清晰度。",
    "S10": "点击 SLOW SCAN 1 按钮开始扫描。",
    "S11": "点击 SAVE IMAGE 按钮保存图像。",
    "S12": "当前为 2×2 接缝羽化拼图，装样与调焦已就绪。请用平移按钮或双击图像调整视场，MAGNIFICATION滑条可以调整放大与缩小，你可以大幅度的调节这个滑条来放大图像，找到沿竖直方向排列、彼此平行的管状/条状结构，使该区域占据全屏的100%，你可能需要拖动MAGNIFICATION滑条来调整页面大小，居中清晰，然后点击 SAVE IMAG。",
    # "S12": "请拖动MAGNIFICATION滑条到最右端",
}


def _safe_round(value, digits: int = 4):
    if value is None:
        return None
    try:
        return round(float(value), digits)
    except Exception:
        return value


def _safe_screenshot_page(page, path: str) -> bool:
    """将当前 viewport 存为 PNG；失败时打日志并返回 False。"""
    try:
        parent = os.path.dirname(path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        page.screenshot(path=path, full_page=False)
        return True
    except Exception as e:
        logger.warning("截屏保存失败 %s: %s", path, e)
        return False


def _extract_run_metric_summary(benchmark_log: dict | None, subtask_id: str) -> dict:
    if not benchmark_log:
        return {}

    grounding = benchmark_log.get("grounding_metrics", {}) or {}
    target = next((st for st in (benchmark_log.get("subtasks") or []) if st.get("subtask_id") == subtask_id), None)
    focus_to_metric = {
        "widget": "widget_grounding_accuracy",
        "text": "text_grounding_accuracy",
        "state": "state_grounding_accuracy",
    }
    cleaned_grounding = {}
    for focus in (target or {}).get("grounding_focus", []) or []:
        metric_key = focus_to_metric.get(focus)
        value = grounding.get(metric_key)
        if metric_key and isinstance(value, (int, float)) and not isinstance(value, bool):
            cleaned_grounding[metric_key] = value

    summary = benchmark_log.get("summary", {}) or {}
    cleaned_grounding["actual_steps"] = summary.get("actual_steps")
    cleaned_grounding["target_subtask_attempts"] = int((target or {}).get("attempts", 0) or 0)
    cleaned_grounding["target_subtask_success"] = bool((target or {}).get("success", False))
    return cleaned_grounding


def _aggregate_metric_summaries(metric_runs: list[dict]) -> dict:
    if not metric_runs:
        return {}

    numeric_keys = set()
    for run in metric_runs:
        for key, value in run.items():
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                numeric_keys.add(key)

    aggregated = {"num_runs_with_metrics": len(metric_runs)}
    for key in sorted(numeric_keys):
        values = [float(run[key]) for run in metric_runs if isinstance(run.get(key), (int, float)) and not isinstance(run.get(key), bool)]
        if values:
            aggregated[f"avg_{key}"] = _safe_round(sum(values) / len(values))

    success_flags = [bool(run.get("target_subtask_success", False)) for run in metric_runs if "target_subtask_success" in run]
    if success_flags:
        aggregated["target_subtask_success_rate_from_logs"] = _safe_round(
            sum(1 for flag in success_flags if flag) / len(success_flags)
        )
    return aggregated


def _aggregate_overall_metric_summary(per_subtask: dict) -> dict:
    metric_summaries = [item.get("metrics_summary", {}) for item in per_subtask.values() if item.get("metrics_summary")]
    if not metric_summaries:
        return {}

    overall = {
        "num_subtasks": len(per_subtask),
        "num_subtasks_with_metrics": len(metric_summaries),
    }
    numeric_keys = set()
    for item in metric_summaries:
        for key, value in item.items():
            if key.startswith("avg_") and isinstance(value, (int, float)):
                numeric_keys.add(key)
    for key in sorted(numeric_keys):
        values = [float(item[key]) for item in metric_summaries if isinstance(item.get(key), (int, float))]
        if values:
            normalized_key = key[4:] if key.startswith("avg_") else key
            overall[f"avg_{normalized_key}"] = _safe_round(sum(values) / len(values))
    return overall


# SEM 测试专用：Agent 输出格式规范，拼接到任务指令后以约束模型输出
SEM_OUTPUT_FORMAT_INSTRUCTION = """

【输出格式要求】请严格按以下格式输出，Action 行仅包含英文和坐标：
- 格式：Thought: (简要说明)  Action: click(start_box='(x,y)')
- 点击：使用 click(start_box='(x,y)')，x、y 为整数像素坐标（屏幕 1920×1080），例如 click(start_box='(100,200)')
- 拖动：使用 drag(start_box='(x1,y1)', end_box='(x2,y2)')
- 禁止：Action 行不要写中文；不要用 <point>0.145 0.148</point> 等小数归一化格式；必须用整数像素坐标 (x,y)"""


def get_sem_instruction(task_instruction: str) -> str:
    """将任务指令与输出格式规范拼接，供 Agent 使用"""
    return task_instruction.strip() + SEM_OUTPUT_FORMAT_INSTRUCTION


def _click_sem(page, selector: str, wait_after: float = 0.5) -> bool:
    """点击 SEM 模拟器中的元素"""
    try:
        el = page.locator(selector).first
        el.wait_for(state="visible", timeout=10000)
        el.click()
        time.sleep(wait_after)
        return True
    except Exception as e:
        logger.warning(f"点击 {selector} 失败: {e}")
        return False


def _wait_for_btn(page, selector: str, text: str, timeout_sec: float = 15) -> bool:
    """等待按钮显示指定文字"""
    try:
        page.wait_for_function(
            f"""() => {{
                const el = document.querySelector("{selector}");
                return el && (el.innerText || el.textContent || "").trim().toUpperCase().includes("{text.upper()}");
            }}""",
            timeout=int(timeout_sec * 1000),
        )
        return True
    except Exception:
        return False


def _wait_for_visible(page, selector: str, timeout_sec: float = 15) -> bool:
    """等待元素可见"""
    try:
        page.locator(selector).first.wait_for(state="visible", timeout=int(timeout_sec * 1000))
        return True
    except Exception:
        return False


def _select_sem_sample(page, sample_id: str = "sample1", wait_after: float = 2.0) -> bool:
    """在 SEM 模拟器中用下拉框选择样品（选项 value 与 SEM_SAMPLE_CONFIG.id 一致）"""
    try:
        page.evaluate(
            """(sampleId) => {
                const sel = document.querySelector("#sem-sample-select");
                if (!sel) throw new Error("sem-sample-select not found");
                sel.value = sampleId;
                const ev = typeof Event === "function"
                    ? new Event("change", { bubbles: true })
                    : (() => {
                        const e = document.createEvent("Event");
                        e.initEvent("change", true, true);
                        return e;
                    })();
                sel.dispatchEvent(ev);
            }""",
            sample_id,
        )
        time.sleep(wait_after)
        return True
    except Exception as e:
        logger.warning(f"选择样品 {sample_id} 失败: {e}")
        return False


def _set_slider(page, slider_id: str, value: int) -> bool:
    """通过 jQuery 设置滑块值（0-4），并触发 drawIt 更新画面"""
    try:
        page.evaluate(f"""() => {{
            if (typeof $ === 'undefined' || !$('#{slider_id}').length) return;
            var $s = $('#{slider_id}');
            if ($s.slider('option', 'value') === undefined) return;
            $s.slider('value', {value});
            if ('{slider_id}' === 'acc-volt') {{
                var v = {value};
                if (typeof volt_values !== 'undefined' && volt_values[v] !== undefined) {{
                    kVs = volt_values[v];
                    brightNms = (kVs === 0) ? 0 : (kVs + (typeof spot_bright !== 'undefined' ? spot_bright : 0.1));
                    if (kVs !== 0 && typeof volt_bool !== 'undefined') volt_bool = true;
                }}
            }}
            if ('{slider_id}' === 'spot-size' && typeof spot_valuesBright !== 'undefined' && typeof spot_valuesBlur !== 'undefined') {{
                spot_bright = spot_valuesBright[{value}] || 0.1;
                spotSlider_blur = spot_valuesBlur[{value}] || 0.5;
                if (typeof kVs !== 'undefined' && kVs !== 0) brightNms = kVs + spot_bright;
            }}
            if (typeof drawIt === 'function') drawIt();
        }}""")
        time.sleep(1.0)
        return True
    except Exception as e:
        logger.warning(f"设置滑块 {slider_id} 失败: {e}")
        return False


def _adjust_contrast_knob(page) -> bool:
    """调整对比度：通过隐藏旋钮 DOM 的 rotation 触发 onRotateKnob（与 #slider-contrast 同步）"""
    try:
        page.evaluate("""() => {
            if (typeof TweenLite === 'undefined' || typeof onRotateKnob !== 'function') return;
            var el = document.querySelector("#contrast");
            if (!el) return;
            TweenLite.set("#contrast", { rotation: 60 });
            var d = typeof Draggable !== 'undefined' && Draggable.get("#contrast");
            if (d) d.rotation = 60;
            onRotateKnob("contrast");
        }""")
        time.sleep(2.0)
        return True
    except Exception as e:
        logger.warning(f"调整 CONTRAST 旋钮失败: {e}")
        return False


def _adjust_coarse_knob(page) -> bool:
    """调整清晰度：通过隐藏旋钮 DOM 的 rotation 触发 onRotateKnob（与 #slider-focus-c 同步）"""
    try:
        page.evaluate("""() => {
            if (typeof TweenLite === 'undefined' || typeof onRotateKnob !== 'function') return;
            var el = document.querySelector("#focus-c");
            if (!el) return;
            TweenLite.set("#focus-c", { rotation: 220 });
            var d = typeof Draggable !== 'undefined' && Draggable.get("#focus-c");
            if (d) d.rotation = 220;
            onRotateKnob("focus-c");
        }""")
        time.sleep(2.0)
        return True
    except Exception as e:
        logger.warning(f"调整 COARSE 旋钮失败: {e}")
        return False


def setup_state_by_actions(page, subtask_id: str) -> bool:
    """
    通过模拟点击/拖动操作，将页面部署到指定子任务的前置状态。
    流程与 benchmark_sem.js 一致：S1 Vent → S2 Open → S3 Close → S4 Evacuate → S5 SelectSample → S6 HT → ...
    """
    if subtask_id == "S12":
        try:
            page.evaluate(
                """() => {
                    if (window.SEM_SINGLE_STEP_API && window.SEM_SINGLE_STEP_API.gotoState) {
                        window.SEM_SINGLE_STEP_API.gotoState('S12');
                    }
                }"""
            )
            page.wait_for_function("() => window.SEM_S12_READY === true", timeout=120000)
            logger.info("✅ 已通过 gotoState(S12) 部署 2×2 拼图 ROI 任务状态")
            return True
        except Exception as e:
            logger.error(f"S12 部署失败: {e}")
            return False

    # 各子任务需要完成的前置步骤（S1～S(k-1)）
    PREREQS = {
        "S1": [],
        "S2": ["vent"],
        "S3": ["vent", "open"],
        "S4": ["vent", "open", "close"],
        "S5": ["vent", "open", "close", "evacuate"],
        "S6": ["vent", "open", "close", "evacuate", "sample"],
        "S7": ["vent", "open", "close", "evacuate", "sample", "ht"],
        "S8": ["vent", "open", "close", "evacuate", "sample", "ht", "acc_volt"],
        "S9": ["vent", "open", "close", "evacuate", "sample", "ht", "acc_volt", "spot"],
        "S10": ["vent", "open", "close", "evacuate", "sample", "ht", "acc_volt", "spot", "clarity"],
        "S11": ["vent", "open", "close", "evacuate", "sample", "ht", "acc_volt", "spot", "clarity", "scan"],
    }
    steps = PREREQS.get(subtask_id, [])
    ANIM_WAIT = 2.0
    EVAC_WAIT = 2.0
    SAMPLE_WAIT = 2.0

    try:
        if not steps:
            logger.info("S1 无需前置操作")
            return True

        if "vent" in steps:
            _click_sem(page, "#btn-vent", ANIM_WAIT)
        if "open" in steps:
            _click_sem(page, "#btn-chamber", 0.5)
            _wait_for_btn(page, "#btn-chamber", "CLOSE", 12)
            time.sleep(1)
        if "close" in steps:
            _click_sem(page, "#btn-chamber", ANIM_WAIT)
        if "evacuate" in steps:
            _click_sem(page, "#btn-evacuate", EVAC_WAIT)
        if "sample" in steps:
            _wait_for_visible(page, "#sem-sample-trigger", 10)
            _select_sem_sample(page, "sample1", SAMPLE_WAIT)
        if "ht" in steps:
            _click_sem(page, "#ht-btn", 2.0)
        if "acc_volt" in steps:
            _set_slider(page, "acc-volt", 1)
            time.sleep(0.3)
        if "spot" in steps:
            _adjust_contrast_knob(page)
            time.sleep(0.3)
        if "clarity" in steps:
            _adjust_coarse_knob(page)
            time.sleep(0.3)
        if "scan" in steps:
            _click_sem(page, "#btn-scan1", 1.0)

        logger.info(f"✅ 已通过模拟操作部署到 {subtask_id} 前置状态")
        return True
    except Exception as e:
        logger.error(f"setup_state_by_actions 失败: {e}")
        return False


def reset_benchmark_subtask(page, subtask_id: str) -> bool:
    """重置 benchmark 中该子任务的状态（若 API 可用）。reload 后通常为新 episode，可不调用"""
    try:
        ok = page.evaluate(
            f"() => window.SEM_SINGLE_STEP_API && window.SEM_SINGLE_STEP_API.resetBenchmarkSubtask('{subtask_id}')"
        )
        return bool(ok)
    except Exception:
        return True


def run_single_subtask_test(
    subtask_id: str,
    max_attempts: int = 20,
    max_steps_per_attempt: int = 5,
    agent_name: str = "uitars15_v2",
    model: str = None,
    sem_url: str = "http://localhost:8080/static/simulator/sem_simulator/SEM_simulator.html",
    result_dir: str = get_results_dir("sem_single"),
    headless: bool = False,
    use_system_chrome: bool = False,
    save_step_screenshots: bool = False,
    **agent_kwargs,
) -> dict:
    """
    针对单个子任务进行单步成功率测试：
    - 每次尝试使用新的 Agent 实例，避免上下文干扰
    - 通过模拟点击/拖动完成前置任务，再让 Agent 执行目标子任务
    - Agent 执行最多 max_steps_per_attempt 步
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    agent_screen_size = (1920, 1080)

    os.makedirs(result_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    stats_path = os.path.join(result_dir, f"single_subtask_{subtask_id}_{timestamp}.json")
    step_screenshots_session = None
    if save_step_screenshots:
        step_screenshots_session = os.path.join(
            result_dir, "sem_step_screenshots", f"{subtask_id}_{timestamp}"
        )
        os.makedirs(step_screenshots_session, exist_ok=True)
        logger.info("每步截屏目录: %s", step_screenshots_session)

    instruction = get_sem_instruction(
        SUBTASK_INSTRUCTIONS.get(
            subtask_id,
            f"请完成子任务 {SUBTASKS.get(subtask_id, subtask_id)}。",
        )
    )

    agent_kwargs = resolve_subtask_agent_kwargs(
        agent_name, agent_kwargs, model=model, max_steps_per_subtask=max_steps_per_attempt
    )
    agent_kwargs.setdefault("model_type", "doubao")
    agent_kwargs.setdefault("max_tokens", 3000)
    _temp = 0.6 if (model and "kimi-k2.5" in str(model).lower()) else 0
    agent_kwargs.setdefault("temperature", _temp)

    successes = 0
    results = []
    agent_screen_size = (1920, 1080)

    with sync_playwright() as p:
        launch_opts = {"headless": headless}
        if use_system_chrome:
            launch_opts["channel"] = "chrome"
        browser = p.chromium.launch(**launch_opts)
        context = browser.new_context(
            viewport={"width": agent_screen_size[0], "height": agent_screen_size[1]},
            device_scale_factor=1.0,
        )
        page = context.new_page()

        try:
            visit_url = _sem_url_with_mosaic_roi(sem_url) if subtask_id == "S12" else sem_url
            page.goto(visit_url, wait_until="networkidle", timeout=60000)
            time.sleep(5)

            for attempt in range(1, max_attempts + 1):
                logger.info("")
                logger.info("=" * 60)
                logger.info(f"子任务 {subtask_id} 第 {attempt}/{max_attempts} 次尝试")
                logger.info("=" * 60)

                if attempt > 1:
                    reload_url = _sem_url_with_mosaic_roi(sem_url) if subtask_id == "S12" else sem_url
                    page.goto(reload_url, wait_until="networkidle", timeout=60000)
                    clear_last_mouse_pos()
                    time.sleep(6)

                if not setup_state_by_actions(page, subtask_id):
                    logger.warning("setup_state_by_actions 失败，跳过本次尝试")
                    results.append({"attempt": attempt, "success": False, "error": "setup_failed"})
                    continue

                reset_benchmark_subtask(page, subtask_id)
                time.sleep(1)
                actual_viewport = page.viewport_size
                actual_screen_size = (actual_viewport["width"], actual_viewport["height"])

                # S7 滑块 / S8/S9 旋钮：记录初始值，用于 fallback 成功判定（benchmark 事件可能未触发）
                knob_rotation_before = None
                slider_value_before = None
                if subtask_id in ("S8", "S9"):
                    knob_rotation_before = page.evaluate(
                        """(sid) => {
                            try {
                                var sel = sid === 'S8' ? '#contrast' : '#focus-c';
                                var d = typeof Draggable !== 'undefined' && Draggable.get(sel);
                                return d ? d.rotation : null;
                            } catch(e) { return null; }
                        }""",
                        subtask_id,
                    )
                elif subtask_id == "S7":
                    slider_value_before = page.evaluate(
                        """() => {
                            try {
                                if (typeof $ !== 'undefined' && $('#acc-volt').length) {
                                    var v = $('#acc-volt').slider('value');
                                    return typeof v === 'number' ? v : null;
                                }
                                return null;
                            } catch(e) { return null; }
                        }"""
                    )

                agent = get_agent(agent_name, **agent_kwargs)
                agent_screen_size = (1920, 1080)
                if hasattr(agent, "screen_size") and agent.screen_size:
                    agent_screen_size = tuple(agent.screen_size) if isinstance(agent.screen_size, (list, tuple)) else (1920, 1080)

                observation = page_to_observation(page, instruction)
                step_count = 0
                mouse_pos = None
                attempt_success = False
                action_seq = 0
                attempt_shot_dir = None
                if step_screenshots_session:
                    attempt_shot_dir = os.path.join(
                        step_screenshots_session, f"attempt_{attempt:02d}"
                    )
                    os.makedirs(attempt_shot_dir, exist_ok=True)

                while step_count < max_steps_per_attempt:
                    logger.info(f"  Step {step_count + 1}/{max_steps_per_attempt}")
                    try:
                        response, actions = agent.predict(instruction, observation)
                    except AttributeError:
                        actions = [agent.step(observation, instruction)]
                    except Exception as e:
                        logger.error(f"Agent 出错: {e}")
                        break

                    if not actions or actions[0] in ["FAIL", "DONE", "client error"]:
                        step_count += 1
                        continue

                    for action in actions:
                        action_seq += 1
                        if attempt_shot_dir:
                            _safe_screenshot_page(
                                page,
                                os.path.join(
                                    attempt_shot_dir,
                                    f"seq_{action_seq:04d}_steploop_{step_count + 1:02d}_before.png",
                                ),
                            )
                        action_result = execute_action_on_page(
                            page,
                            action,
                            agent_screen_size,
                            actual_screen_size,
                            model=agent_kwargs.get("model"),
                            model_type=agent_kwargs.get("model_type"),
                        )
                        if isinstance(action_result, tuple):
                            _, mouse_pos = action_result
                        time.sleep(1)
                        if attempt_shot_dir:
                            _safe_screenshot_page(
                                page,
                                os.path.join(
                                    attempt_shot_dir,
                                    f"seq_{action_seq:04d}_steploop_{step_count + 1:02d}_after.png",
                                ),
                            )
                        step_count += 1
                        observation = page_to_observation(page, instruction, mouse_pos=mouse_pos)

                        status = page.evaluate(
                            """(sid) => {
                                if (typeof window.SEM_BENCHMARK !== 'undefined') {
                                    const ep = window.SEM_BENCHMARK.episode;
                                    const st = ep._subtask_map && ep._subtask_map[sid];
                                    return st ? { success: st.success, attempts: st.attempts } : null;
                                }
                                return null;
                            }""",
                            subtask_id,
                        )
                        if status and status.get("success"):
                            attempt_success = True
                            logger.info(f"  ✅ 子任务 {subtask_id} 本次尝试成功")
                            break

                        # S8/S9 fallback：若 benchmark 未标记成功，检查旋钮旋转是否变化
                        if not attempt_success and knob_rotation_before is not None and subtask_id in ("S8", "S9"):
                            rotation_after = page.evaluate(
                                """(sid) => {
                                    try {
                                        var sel = sid === 'S8' ? '#contrast' : '#focus-c';
                                        var d = typeof Draggable !== 'undefined' && Draggable.get(sel);
                                        return d ? d.rotation : null;
                                    } catch(e) { return null; }
                                }""",
                                subtask_id,
                            )
                            if rotation_after is not None and abs(rotation_after - knob_rotation_before) > 0.5:
                                attempt_success = True
                                logger.info(f"  ✅ 子任务 {subtask_id} 本次尝试成功（旋钮旋转变化 fallback）")
                                break

                        # S7 fallback：若 benchmark 未标记成功，检查滑块值是否变化
                        if not attempt_success and slider_value_before is not None and subtask_id == "S7":
                            slider_value_after = page.evaluate(
                                """() => {
                                    try {
                                        if (typeof $ !== 'undefined' && $('#acc-volt').length) {
                                            var v = $('#acc-volt').slider('value');
                                            return typeof v === 'number' ? v : null;
                                        }
                                        return null;
                                    } catch(e) { return null; }
                                }"""
                            )
                            if slider_value_after is not None and slider_value_after != slider_value_before:
                                attempt_success = True
                                logger.info(f"  ✅ 子任务 {subtask_id} 本次尝试成功（滑块值变化 fallback）")
                                break

                        # S1-S6/S10 点击任务 fallback：若 benchmark 未标记成功，检查页面状态是否达成目标
                        if not attempt_success and subtask_id in ("S1", "S2", "S3", "S4", "S5", "S6", "S10"):
                            state_ok = page.evaluate(
                                """(sid) => {
                                    try {
                                        if (sid === 'S2') return typeof window.chamberOpen === 'boolean' && window.chamberOpen;
                                        if (sid === 'S3') return typeof window.chamberOpen === 'boolean' && !window.chamberOpen;
                                        if (sid === 'S4') {
                                            var cs = document.querySelector('.choose-sample');
                                            return cs && !cs.classList.contains('totally-hidden');
                                        }
                                        if (sid === 'S5') return typeof window.stageRotation === 'boolean' && window.stageRotation;
                                        if (sid === 'S6') return typeof window.htOn === 'boolean' && window.htOn;
                                        if (sid === 'S10') return typeof window.lastScanUsed === 'string' && (window.lastScanUsed === 'scan1' || window.lastScanUsed === 'scan2');
                                        if (sid === 'S1') {
                                            // SEM_FREE_MODE 下 chamber 按钮初始已启用，改用 alpha 判断 vent 是否完成
                                            return typeof window.alpha === 'number' && window.alpha >= 0.25;
                                        }
                                        return false;
                                    } catch(e) { return false; }
                                }""",
                                subtask_id,
                            )
                            if state_ok:
                                attempt_success = True
                                logger.info(f"  ✅ 子任务 {subtask_id} 本次尝试成功（页面状态 fallback）")
                                break

                    if attempt_success:
                        break

                if attempt_success:
                    successes += 1

                benchmark_log = extract_benchmark_log(page)
                run_metrics = _extract_run_metric_summary(benchmark_log, subtask_id)
                results.append({
                    "attempt": attempt,
                    "success": attempt_success,
                    "metrics": run_metrics,
                })
                logger.info(f"  本次尝试结果: {'成功' if attempt_success else '失败'}")

        finally:
            browser.close()

    success_rate = successes / max_attempts if max_attempts > 0 else 0.0
    metrics_summary = _aggregate_metric_summaries([r.get("metrics", {}) for r in results if r.get("metrics")])
    final_result = {
        "subtask_id": subtask_id,
        "subtask_name": SUBTASKS.get(subtask_id, subtask_id),
        "max_attempts": max_attempts,
        "successes": successes,
        "success_rate": success_rate,
        "metrics_summary": metrics_summary,
        "results": results,
        "timestamp": datetime.now().isoformat(),
        "agent_name": agent_name,
        "model": model,
    }

    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(final_result, f, indent=2, ensure_ascii=False)

    logger.info("")
    logger.info("=" * 60)
    logger.info(f"子任务 {subtask_id} 单步成功率测试完成")
    logger.info(f"  成功: {successes}/{max_attempts}, 成功率: {success_rate * 100:.2f}%")
    if metrics_summary:
        logger.info(
            "  metrics: widget=%s text=%s state=%s attempts=%s",
            metrics_summary.get("avg_widget_grounding_accuracy"),
            metrics_summary.get("avg_text_grounding_accuracy"),
            metrics_summary.get("avg_state_grounding_accuracy"),
            metrics_summary.get("avg_target_subtask_attempts"),
        )
    logger.info(f"  结果已保存: {stats_path}")
    logger.info("=" * 60)

    return final_result


def _try_subtask(
    page,
    subtask_id: str,
    instruction: str,
    agent,
    agent_screen_size: tuple,
    actual_screen_size: tuple,
    max_steps: int,
    model: str = None,
    model_type: str = None,
    knob_rotation_before: float = None,
    slider_value_before: float = None,
    step_screenshot_dir: str | None = None,
) -> bool:
    """尝试完成单个子任务，返回是否成功"""
    observation = page_to_observation(page, instruction)
    step_count = 0
    mouse_pos = None
    action_seq = 0
    while step_count < max_steps:
        try:
            response, actions = agent.predict(instruction, observation)
        except AttributeError:
            actions = [agent.step(observation, instruction)]
        except Exception as e:
            logger.error(f"Agent 出错: {e}")
            return False

        if not actions or actions[0] in ["FAIL", "DONE", "client error"]:
            step_count += 1
            continue

        for action in actions:
            action_seq += 1
            if step_screenshot_dir:
                os.makedirs(step_screenshot_dir, exist_ok=True)
                _safe_screenshot_page(
                    page,
                    os.path.join(
                        step_screenshot_dir,
                        f"seq_{action_seq:04d}_steploop_{step_count + 1:02d}_before.png",
                    ),
                )
            action_result = execute_action_on_page(
                page,
                action,
                agent_screen_size,
                actual_screen_size,
                model=model,
                model_type=model_type,
            )
            if isinstance(action_result, tuple):
                _, mouse_pos = action_result
            time.sleep(1)
            if step_screenshot_dir:
                _safe_screenshot_page(
                    page,
                    os.path.join(
                        step_screenshot_dir,
                        f"seq_{action_seq:04d}_steploop_{step_count + 1:02d}_after.png",
                    ),
                )
            step_count += 1
            observation = page_to_observation(page, instruction, mouse_pos=mouse_pos)

            status = page.evaluate(
                """(sid) => {
                    if (typeof window.SEM_BENCHMARK !== 'undefined') {
                        const ep = window.SEM_BENCHMARK.episode;
                        const st = ep._subtask_map && ep._subtask_map[sid];
                        return st ? { success: st.success } : null;
                    }
                    return null;
                }""",
                subtask_id,
            )
            if status and status.get("success"):
                return True

            # S8/S9 fallback：旋钮旋转变化
            if knob_rotation_before is not None and subtask_id in ("S8", "S9"):
                rotation_after = page.evaluate(
                    """(sid) => {
                        try {
                            var sel = sid === 'S8' ? '#contrast' : '#focus-c';
                            var d = typeof Draggable !== 'undefined' && Draggable.get(sel);
                            return d ? d.rotation : null;
                        } catch(e) { return null; }
                    }""",
                    subtask_id,
                )
                if rotation_after is not None and abs(rotation_after - knob_rotation_before) > 0.5:
                    return True

            # S7 fallback：滑块值变化
            if slider_value_before is not None and subtask_id == "S7":
                slider_value_after = page.evaluate(
                    """() => {
                        try {
                            if (typeof $ !== 'undefined' && $('#acc-volt').length) {
                                var v = $('#acc-volt').slider('value');
                                return typeof v === 'number' ? v : null;
                            }
                            return null;
                        } catch(e) { return null; }
                    }"""
                )
                if slider_value_after is not None and slider_value_after != slider_value_before:
                    return True

            # S1-S6/S10 点击任务 fallback：页面状态
            if subtask_id in ("S1", "S2", "S3", "S4", "S5", "S6", "S10"):
                state_ok = page.evaluate(
                    """(sid) => {
                        try {
                            if (sid === 'S2') return typeof window.chamberOpen === 'boolean' && window.chamberOpen;
                            if (sid === 'S3') return typeof window.chamberOpen === 'boolean' && !window.chamberOpen;
                            if (sid === 'S4') {
                                var cs = document.querySelector('.choose-sample');
                                return cs && !cs.classList.contains('totally-hidden');
                            }
                            if (sid === 'S5') return typeof window.stageRotation === 'boolean' && window.stageRotation;
                            if (sid === 'S6') return typeof window.htOn === 'boolean' && window.htOn;
                            if (sid === 'S10') return typeof window.lastScanUsed === 'string' && (window.lastScanUsed === 'scan1' || window.lastScanUsed === 'scan2');
                            if (sid === 'S1') {
                                return typeof window.alpha === 'number' && window.alpha >= 0.25;
                            }
                            return false;
                        } catch(e) { return false; }
                    }""",
                    subtask_id,
                )
                if state_ok:
                    return True

    return False


def run_all_subtasks_test(
    max_attempts: int = 20,
    max_steps_per_attempt: int = 5,
    agent_name: str = "uitars15_v2",
    model: str = None,
    sem_url: str = "http://localhost:8080/static/simulator/sem_simulator/SEM_simulator.html",
    result_dir: str = get_results_dir("sem_single"),
    headless: bool = False,
    use_system_chrome: bool = False,
    save_step_screenshots: bool = False,
    **agent_kwargs,
) -> dict:
    """
    依次测试 S1～S12，每个子任务 max_attempts 次尝试（S12 为 2×2 拼图 ROI，需 mosaic URL）。
    - 每次尝试使用新的 Agent 实例，避免上下文干扰
    - 流程：reload → setup_state_by_actions（模拟点击完成前置）→ 新建 Agent → 尝试
    """
    all_ids = list(SUBTASKS.keys())
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    agent_screen_size = (1920, 1080)

    agent_kwargs = resolve_subtask_agent_kwargs(
        agent_name, agent_kwargs, model=model, max_steps_per_subtask=max_steps_per_attempt
    )
    agent_kwargs.setdefault("model_type", "doubao")
    agent_kwargs.setdefault("max_tokens", 3000)
    _temp = 0.6 if (model and "kimi-k2.5" in str(model).lower()) else 0
    agent_kwargs.setdefault("temperature", _temp)

    # 统计：每个子任务的 attempts（到达该步的次数）和 successes
    all_results = {
        sid: {
            "subtask_name": SUBTASKS[sid],
            "attempts": 0,
            "successes": 0,
            "results": [],
        }
        for sid in all_ids
    }
    agent_screen_size = (1920, 1080)

    logger.info("=" * 80)
    logger.info("开始全部子任务测试（每次尝试后 reload，再模拟点击完成前置）")
    logger.info(f"每个子任务 {max_attempts} 次尝试")
    logger.info("=" * 80)

    step_screenshots_session = None
    if save_step_screenshots:
        session_ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        step_screenshots_session = os.path.join(result_dir, "sem_step_screenshots", f"all_{session_ts}")
        os.makedirs(step_screenshots_session, exist_ok=True)
        logger.info("每步截屏目录: %s", step_screenshots_session)

    with sync_playwright() as p:
        launch_opts = {"headless": headless}
        if use_system_chrome:
            launch_opts["channel"] = "chrome"
        browser = p.chromium.launch(**launch_opts)
        context = browser.new_context(
            viewport={"width": agent_screen_size[0], "height": agent_screen_size[1]},
            device_scale_factor=1.0,
        )
        page = context.new_page()

        try:
            page.goto(sem_url, wait_until="networkidle", timeout=60000)
            time.sleep(5)

            actual_viewport = page.viewport_size
            actual_screen_size = (actual_viewport["width"], actual_viewport["height"])

            for i, sid in enumerate(all_ids, 1):
                logger.info("")
                logger.info("#" * 80)
                logger.info(f"# 子任务 {i}/{len(all_ids)}: {sid} {SUBTASKS[sid]}")
                logger.info("#" * 80)

                for attempt in range(1, max_attempts + 1):
                    if i > 1 or attempt > 1:
                        load_url = _sem_url_with_mosaic_roi(sem_url) if sid == "S12" else sem_url
                        page.goto(load_url, wait_until="networkidle", timeout=60000)
                        clear_last_mouse_pos()
                        time.sleep(6)

                    if not setup_state_by_actions(page, sid):
                        logger.warning(f"setup_state_by_actions({sid}) 失败，跳过本尝试")
                        continue

                    reset_benchmark_subtask(page, sid)
                    time.sleep(1)

                    knob_rotation_before = None
                    slider_value_before = None
                    if sid in ("S8", "S9"):
                        knob_rotation_before = page.evaluate(
                            """(sid) => {
                                try {
                                    var sel = sid === 'S8' ? '#contrast' : '#focus-c';
                                    var d = typeof Draggable !== 'undefined' && Draggable.get(sel);
                                    return d ? d.rotation : null;
                                } catch(e) { return null; }
                            }""",
                            sid,
                        )
                    elif sid == "S7":
                        slider_value_before = page.evaluate(
                            """() => {
                                try {
                                    if (typeof $ !== 'undefined' && $('#acc-volt').length) {
                                        var v = $('#acc-volt').slider('value');
                                        return typeof v === 'number' ? v : null;
                                    }
                                    return null;
                                } catch(e) { return null; }
                            }"""
                        )

                    instruction = get_sem_instruction(SUBTASK_INSTRUCTIONS.get(sid, f"请完成 {SUBTASKS[sid]}。"))
                    all_results[sid]["attempts"] += 1

                    agent = get_agent(agent_name, **agent_kwargs)
                    agent_screen_size = (1920, 1080)
                    if hasattr(agent, "screen_size") and agent.screen_size:
                        agent_screen_size = tuple(agent.screen_size) if isinstance(agent.screen_size, (list, tuple)) else (1920, 1080)

                    logger.info(f"  {sid} 第 {attempt}/{max_attempts} 次尝试...")
                    shot_dir = None
                    if step_screenshots_session:
                        shot_dir = os.path.join(
                            step_screenshots_session, f"{sid}_attempt_{attempt:02d}"
                        )
                    success = _try_subtask(
                        page, sid, instruction, agent,
                        agent_screen_size, actual_screen_size, max_steps_per_attempt,
                        model=model,
                        model_type=agent_kwargs.get("model_type"),
                        knob_rotation_before=knob_rotation_before,
                        slider_value_before=slider_value_before,
                        step_screenshot_dir=shot_dir,
                    )

                    if success:
                        all_results[sid]["successes"] += 1
                        logger.info(f"  ✅ {sid} 成功")
                    else:
                        logger.info(f"  ❌ {sid} 失败")

                    benchmark_log = extract_benchmark_log(page)
                    run_metrics = _extract_run_metric_summary(benchmark_log, sid)
                    all_results[sid]["results"].append({
                        "attempt": attempt,
                        "success": success,
                        "metrics": run_metrics,
                    })

        finally:
            browser.close()

    for sid in all_ids:
        r = all_results[sid]
        r["success_rate"] = r["successes"] / r["attempts"] if r["attempts"] > 0 else 0.0
        r["metrics_summary"] = _aggregate_metric_summaries([x.get("metrics", {}) for x in r.get("results", []) if x.get("metrics")])

    total_successes = sum(r["successes"] for r in all_results.values())
    total_attempts = sum(r["attempts"] for r in all_results.values())
    overall_rate = total_successes / total_attempts if total_attempts > 0 else 0.0
    avg_rate = sum(r["success_rate"] for r in all_results.values()) / len(all_ids) if all_ids else 0.0

    summary = {
        "all_subtasks": all_results,
        "total_successes": total_successes,
        "total_attempts": total_attempts,
        "overall_success_rate": overall_rate,
        "average_success_rate_per_subtask": avg_rate,
        "overall_metrics_summary": _aggregate_overall_metric_summary(all_results),
        "timestamp": datetime.now().isoformat(),
        "agent_name": agent_name,
        "model": model,
    }

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    summary_path = os.path.join(result_dir, f"all_subtasks_summary_{timestamp}.json")
    os.makedirs(result_dir, exist_ok=True)
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    logger.info("")
    logger.info("=" * 80)
    logger.info("全部子任务测试完成 - 汇总统计（程序复原）")
    logger.info("=" * 80)
    for sid in all_ids:
        r = all_results[sid]
        logger.info(f"  {sid} {r['subtask_name']}: {r['successes']}/{r['attempts']} ({r['success_rate']*100:.1f}%)")
        metrics_summary = r.get("metrics_summary", {})
        if metrics_summary:
            logger.info(
                "    metrics: widget=%s text=%s state=%s attempts=%s",
                metrics_summary.get("avg_widget_grounding_accuracy"),
                metrics_summary.get("avg_text_grounding_accuracy"),
                metrics_summary.get("avg_state_grounding_accuracy"),
                metrics_summary.get("avg_target_subtask_attempts"),
            )
    logger.info("-" * 80)
    logger.info(f"  总成功次数: {total_successes}/{total_attempts}")
    logger.info(f"  总体成功率: {overall_rate * 100:.2f}%")
    logger.info(f"  各子任务平均成功率: {avg_rate * 100:.2f}%")
    overall_metrics = summary.get("overall_metrics_summary", {})
    if overall_metrics:
        logger.info(
            "  总体 metrics: widget=%s text=%s state=%s attempts=%s",
            overall_metrics.get("avg_widget_grounding_accuracy"),
            overall_metrics.get("avg_text_grounding_accuracy"),
            overall_metrics.get("avg_state_grounding_accuracy"),
            overall_metrics.get("avg_target_subtask_attempts"),
        )
    logger.info(f"  汇总结果已保存: {summary_path}")
    logger.info("=" * 80)

    return summary


def run_sem_subtask_multiple_runs(
    subtask_id: str,
    num_runs: int = 10,
    agent_name: str = "uitars15_v2",
    model: str = None,
    sem_url: str = "http://localhost:8080/static/simulator/sem_simulator/SEM_simulator.html",
    result_dir: str = get_results_dir("sem_single"),
    headless: bool = False,
    max_steps_per_subtask: int = 5,
    use_system_chrome: bool = False,
    save_step_screenshots: bool = False,
    **agent_kwargs,
) -> dict:
    return run_single_subtask_test(
        subtask_id=subtask_id,
        max_attempts=num_runs,
        max_steps_per_attempt=max_steps_per_subtask,
        agent_name=agent_name,
        model=model,
        sem_url=sem_url,
        result_dir=result_dir,
        headless=headless,
        use_system_chrome=use_system_chrome,
        save_step_screenshots=save_step_screenshots,
        **agent_kwargs,
    )


def run_all_subtask_demos(
    num_runs: int = 10,
    agent_name: str = "uitars15_v2",
    model: str = None,
    sem_url: str = "http://localhost:8080/static/simulator/sem_simulator/SEM_simulator.html",
    result_dir: str = get_results_dir("sem_single"),
    headless: bool = False,
    max_steps_per_subtask: int = 5,
    use_system_chrome: bool = False,
    subtask_ids: list = None,
    save_step_screenshots: bool = False,
    **agent_kwargs,
) -> dict:
    if subtask_ids is None:
        return run_all_subtasks_test(
            max_attempts=num_runs,
            max_steps_per_attempt=max_steps_per_subtask,
            agent_name=agent_name,
            model=model,
            sem_url=sem_url,
            result_dir=result_dir,
            headless=headless,
            use_system_chrome=use_system_chrome,
            save_step_screenshots=save_step_screenshots,
            **agent_kwargs,
        )

    selected = [sid for sid in subtask_ids if sid in SUBTASKS]
    if not selected:
        return {
            "all_subtasks": {},
            "total_successes": 0,
            "total_attempts": 0,
            "overall_success_rate": 0.0,
            "average_success_rate_per_subtask": 0.0,
            "overall_metrics_summary": {},
            "timestamp": datetime.now().isoformat(),
            "agent_name": agent_name,
            "model": model,
        }

    all_results = {}
    for sid in selected:
        all_results[sid] = run_sem_subtask_multiple_runs(
            subtask_id=sid,
            num_runs=num_runs,
            agent_name=agent_name,
            model=model,
            sem_url=sem_url,
            result_dir=result_dir,
            headless=headless,
            max_steps_per_subtask=max_steps_per_subtask,
            use_system_chrome=use_system_chrome,
            save_step_screenshots=save_step_screenshots,
            **agent_kwargs,
        )
    return {
        "num_runs_per_subtask": num_runs,
        "subtasks": list(all_results.values()),
        "overall_metrics_summary": _aggregate_overall_metric_summary(
            {item["subtask_id"]: {"metrics_summary": item.get("metrics_summary", {})} for item in all_results.values()}
        ),
    }


def main():
    parser = argparse.ArgumentParser(description="SEM 单子任务 Demo 测试")
    parser.add_argument("--agent", type=str, default="uitars15_v2",
                        choices=["uitars15_v2", "openai_compat_chat", "vlaa_gui", "uitars15_v1", "uitars", "o3", "gui_owl_vllm"])
    parser.add_argument("--model", type=str, default=None)
    parser.add_argument("--model_type", type=str, default="doubao")
    parser.add_argument("--temperature", type=float, default=0)
    parser.add_argument("--max_tokens", type=int, default=3000)
    parser.add_argument("--api_key", type=str, default=None)
    parser.add_argument("--api_url", type=str, default=None)
    parser.add_argument("--sem_url", type=str,
                        default="http://localhost:8080/static/simulator/sem_simulator/SEM_simulator.html")
    parser.add_argument("--result_dir", type=str, default=get_results_dir("sem_single"))
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--subtask", type=str, default=None,
                        help="只运行指定子任务，如 S5,S10,S11,S12；兼容旧值 all（S12 须配合 sem_subtask_mosaic=1）")
    parser.add_argument(
        "--run_all_subtask_demos",
        "--run_all_subtask_demo",
        action="store_true",
        help="依次运行 S1～S12（S12 为 2×2 拼图 ROI，需 URL 参数 sem_subtask_mosaic=1）",
    )
    parser.add_argument("--runs", type=int, default=10, help="每个子任务测试次数，默认 10")
    parser.add_argument("--max_steps_subtask", type=int, default=5)
    parser.add_argument("--use-system-chrome", action="store_true")
    parser.add_argument(
        "--save-step-screenshots",
        action="store_true",
        help="SEM：每个 Agent 动作前后各保存一张 viewport PNG，目录见日志 sem_step_screenshots/…",
    )
    # backward compatibility
    parser.add_argument("--max_attempts", type=int, default=None,
                        help="兼容旧参数，等价于 --runs")
    parser.add_argument("--max_steps_per_attempt", type=int, default=None,
                        help="兼容旧参数，等价于 --max_steps_subtask")

    args = parser.parse_args()
    args.agent = prefer_gui_owl_agent_when_model_name(args.agent, args.model)

    from benchmarks.vlaa_gui_support import configure_benchmark_subtask_env
    configure_benchmark_subtask_env(
        args.agent, model=args.model, api_url=args.api_url, api_key=args.api_key
    )

    runs = args.max_attempts if args.max_attempts is not None else args.runs
    max_steps_subtask = args.max_steps_per_attempt if args.max_steps_per_attempt is not None else args.max_steps_subtask

    common = dict(
        agent_name=args.agent,
        model=args.model,
        model_type=args.model_type,
        temperature=args.temperature,
        max_tokens=args.max_tokens,
        sem_url=args.sem_url,
        result_dir=args.result_dir,
        headless=args.headless,
        max_steps_per_subtask=max_steps_subtask,
        use_system_chrome=args.use_system_chrome,
        save_step_screenshots=args.save_step_screenshots,
    )

    if args.subtask and args.subtask.strip().lower() == "all":
        run_all_subtasks_test(
            max_attempts=runs,
            max_steps_per_attempt=max_steps_subtask,
            agent_name=args.agent,
            model=args.model,
            sem_url=args.sem_url,
            result_dir=args.result_dir,
            headless=args.headless,
            use_system_chrome=args.use_system_chrome,
            save_step_screenshots=args.save_step_screenshots,
            model_type=args.model_type,
            temperature=args.temperature,
            max_tokens=args.max_tokens,
        )
        return

    if args.subtask:
        sid = args.subtask.strip().upper()
        if sid not in SUBTASKS:
            parser.error(f"未知子任务 {sid}，可选: {', '.join(SUBTASKS.keys())}")
        run_sem_subtask_multiple_runs(subtask_id=sid, num_runs=runs, **common)
    elif args.run_all_subtask_demos:
        run_all_subtasks_test(
            max_attempts=runs,
            max_steps_per_attempt=max_steps_subtask,
            agent_name=args.agent,
            model=args.model,
            sem_url=args.sem_url,
            result_dir=args.result_dir,
            headless=args.headless,
            use_system_chrome=args.use_system_chrome,
            save_step_screenshots=args.save_step_screenshots,
            model_type=args.model_type,
            temperature=args.temperature,
            max_tokens=args.max_tokens,
        )
    else:
        parser.print_help()
        print("\n请指定 --subtask S5 或 --run_all_subtask_demos")


if __name__ == "__main__":
    main()
