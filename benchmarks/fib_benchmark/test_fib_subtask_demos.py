"""
FIB 单子任务 Demo 测试脚本
对每个子任务（F1～F20）单独测试：快进到该步前状态，只测当前一步。
默认每个子任务跑 10 次，输出仅含该子任务的成功率日志。

F1～F20 均支持一键把 UI 设到该步前（模拟器会真实设置界面到该步前状态）。

用法:
  python test_fib_subtask_demos.py --subtask F5           # F5 跑 10 次
  python test_fib_subtask_demos.py --subtask F5 --runs 5
  python test_fib_subtask_demos.py --run_all_subtask_demos  # F1～F20 各跑 10 次
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BENCHMARKS = os.path.dirname(_SCRIPT_DIR)
ROOT = os.path.dirname(_BENCHMARKS)
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "OSWorld-main"))
sys.path.insert(0, _BENCHMARKS)
from benchmarks.paths import get_results_dir
from benchmarks.utils import prefer_gui_owl_agent_when_model_name
from benchmarks.vlaa_gui_support import resolve_subtask_agent_kwargs
if "DOUBAO_API_KEY" not in os.environ:
    os.environ["DOUBAO_API_KEY"] = "sk-ui-tars-asd1231hascx12"
if "DOUBAO_API_URL" not in os.environ:
    os.environ["DOUBAO_API_URL"] = "http://180.184.148.133:11149/v1/chat/completions"

from playwright.sync_api import sync_playwright

from test_fib_agent_lightweight import (
    OBSERVATION_MODE_A11Y_TREE,
    OBSERVATION_MODE_SCREENSHOT,
    OBSERVATION_MODE_SCREENSHOT_720P,
    get_agent,
    page_to_observation,
    execute_action_on_page,
    extract_benchmark_log,
    infer_current_fib_subtask,
    record_fib_agent_action,
    should_skip_coord_convert,
    logger,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

# 单子任务 Demo 配置（与 benchmark_fib.js 的 F1～F20 对应）
FIB_SUBTASK_DEMOS = {
    "F1": {"name": "VentChamber", "instruction": "当前是 FIB 模拟器界面。请点击 VENT 左侧按钮中间进行放气，等待完成。完成后即可停止。"},
    "F2": {"name": "PumpDown", "instruction": "放气已完成。请点击 PUMP 左侧按钮中间进行抽真空，等待完成。完成后即可停止。"},
    "F3": {"name": "SelectSample", "instruction": "真空已就绪。请在 SAMPLE 下拉框中选择 Si Wafer。选择完成后即可停止。"},
    "F4": {"name": "EbeamOn", "instruction": "样品已选。请设置电子束 ACC VOLTAGE 5Kv、BEAM CURRENT 0.1nA，点击电子束 HT 开启。完成后即可停止。"},
    "F5": {"name": "EbeamLiveFocus", "instruction": "电子束已开。请将 MAGNIFICATION 设为 500x，点击 LIVE VIEW，调节 FOCUS，点击 AUTO BRIGHTNESS & CONTRAST，点击 CENTRE FEATURE 并在 e beam view 中点击 X 特征居中。完成后即可停止。"},
    "F6": {"name": "WD7mm", "instruction": "电子束已对中。请将 MAGNIFICATION 调到 3000x，WD 选 7mm。完成后即可停止。"},
    "F7": {"name": "Tilt10deg", "instruction": "WD 已设好。请将 TILT 选 10°。完成后即可停止。"},
    "F8": {"name": "StageZCenter", "instruction": "Tilt 已设。请用 STAGE Z 将特征调回中心，点击电子束 LIVE VIEW 停止；再设 TILT 52°，调节 Stage Z，点击 AUTO BRIGHTNESS，勾选 Surface，必要时 Centre Feature。完成后即可停止。"},
    "F9": {"name": "IonBeamLiveCenter", "instruction": "电子束已就绪。请设离子束 ACC VOLTAGE 30Kv、BEAM CURRENT 10pA，点击离子束 HT，MAGNIFICATION 3000x，点击离子束 LIVE VIEW，用 BEAM SHIFT 将特征居中，再点击 LIVE VIEW 停止。完成后即可停止。"},
    "F10": {"name": "FirstRectStart", "instruction": "离子束已居中。请 PATTERN 选 Rectangular Si milling，将黄色方框拖到蓝色框内，点击 START，等待完成。完成后即可停止。"},
    "F11": {"name": "DeletePattern", "instruction": "第一次矩形铣削已完成。请点击 DELETE PATTERN。完成后即可停止。"},
    "F12": {"name": "SecondRectStart", "instruction": "已删除图案。请离子束 BEAM CURRENT 选 30nA，再次选 Rectangular Si milling，拖放后 START；完成后 DELETE PATTERN，BEAM CURRENT 调回 10pA。完成后即可停止。"},
    "F13": {"name": "BeamCurrent10pA", "instruction": "第二块矩形已完成。请将离子束 BEAM CURRENT 调回 10pA。完成后 DELETE PATTERN，完成后即可停止。"},
    "F14": {"name": "PtNeedleIn", "instruction": "电流已调好。请勾选 Pt Needle 插入针。完成后即可停止。"},
    "F15": {"name": "PtDepositionStart", "instruction": "Pt 针已插入。请 PATTERN 选 Pt Deposition，拖放到蓝色框内，START（可做两次沉积）。完成后即可停止。"},
    "F16": {"name": "IonSnapshot5000x", "instruction": "Pt 沉积已完成。请将离子束 MAGNIFICATION 设为 5000x，点击 SNAPSHOT。完成后即可停止。"},
    "F17": {"name": "CrossSectionCutStart", "instruction": "快照已拍。请 PATTERN 选 Cross Section Cutting，拖放到蓝色框，BEAM CURRENT 选 3nA，START。完成后即可停止。"},
    "F18": {"name": "CleaningCrossSectionStart", "instruction": "截面切割已完成。请 PATTERN 选 Cleaning Cross Section Cutting，BEAM CURRENT 选 0.1nA，拖放后 START。完成后即可停止。"},
    "F19": {"name": "Tilt0deg", "instruction": "清理截面已完成。请勾选 Cross Section 做截面成像，必要时多次 Capture；最后将 Tilt 设为 0°。完成后即可停止。"},
    "F20": {"name": "TaskComplete", "instruction": "截面与 Tilt 已就绪。请完成最后一步：按界面提示 Centre Stage 或确认任务完成。完成后即可停止。"},
}
FIB_SUBTASK_IDS = ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19", "F20"]


def _safe_round(value, digits: int = 4):
    if value is None:
        return None
    try:
        return round(float(value), digits)
    except Exception:
        return value


def _extract_run_metric_summary(benchmark_log: dict | None, subtask_id: str) -> dict:
    if not benchmark_log:
        return {}

    grounding = benchmark_log.get("grounding_metrics", {}) or {}
    subtasks = benchmark_log.get("subtasks", []) or []
    target = next((st for st in subtasks if st.get("subtask_id") == subtask_id), None)
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


def _aggregate_overall_metric_summary(per_subtask: list[dict]) -> dict:
    metric_summaries = [item.get("metrics_summary", {}) for item in per_subtask if item.get("metrics_summary")]
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


def run_fib_single_subtask_test(
    subtask_id: str,
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps_per_subtask: int = 10,
    fib_url: str = "http://localhost:8080/static/simulator/fib_simulator/FIB_simulator.html",
    result_dir: str = get_results_dir("fib"),
    headless: bool = False,
    observation_mode: str = OBSERVATION_MODE_SCREENSHOT,
    **agent_kwargs
) -> dict:
    """单子任务测试：快进到该子任务前状态（仅标记前置），只测当前一步。"""
    if subtask_id not in FIB_SUBTASK_DEMOS:
        raise ValueError(f"未知 subtask_id: {subtask_id}，可选: {FIB_SUBTASK_IDS}")
    if observation_mode == OBSERVATION_MODE_A11Y_TREE and agent_name != "uitars":
        raise ValueError("FIB a11y_tree mode currently supports agent_name='uitars' only.")
    demo = FIB_SUBTASK_DEMOS[subtask_id]
    task_instruction = demo["instruction"]

    os.makedirs(result_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    episode_dir = os.path.join(result_dir, f"subtask_{subtask_id}_{timestamp}")
    os.makedirs(episode_dir, exist_ok=True)

    logger.info(f"单子任务测试 - 子任务: {subtask_id} {demo['name']}")
    logger.info(f"指令: {task_instruction[:150]}...")

    agent_kwargs = resolve_subtask_agent_kwargs(
        agent_name, agent_kwargs, model=model, max_steps_per_subtask=max_steps_per_subtask
    )
    agent_kwargs["model_type"] = agent_kwargs.get("model_type", "doubao")
    agent_kwargs["max_tokens"] = agent_kwargs.get("max_tokens", 3000)
    agent_kwargs["temperature"] = agent_kwargs.get("temperature", 0)
    agent_kwargs["language"] = agent_kwargs.get("language", "Chinese")
    agent_kwargs["observation_type"] = "a11y_tree" if observation_mode == OBSERVATION_MODE_A11Y_TREE else "screenshot"
    agent = get_agent(agent_name, **agent_kwargs)

    agent_screen_size = (1920, 1080)
    try:
        if hasattr(agent, "screen_size") and agent.screen_size:
            agent_screen_size = (
                tuple(agent.screen_size)
                if isinstance(agent.screen_size, (list, tuple))
                else (1920, 1080)
            )
    except Exception:
        pass
    viewport_width, viewport_height = agent_screen_size[0], agent_screen_size[1]

    test_success = False
    benchmark_log = None

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=headless)
        except Exception as e:
            logger.warning(f"启动浏览器失败，尝试 headless: {e}")
            browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": viewport_width, "height": viewport_height},
            device_scale_factor=1.0,
        )
        page = context.new_page()
        try:
            page.goto(fib_url, wait_until="networkidle", timeout=60000)
            time.sleep(5)
            try:
                page.wait_for_load_state("networkidle", timeout=5000)
            except Exception:
                pass
            time.sleep(2)

            try:
                page.evaluate(f"""
                    () => {{
                        if (typeof window.FIB_BENCHMARK !== 'undefined' && window.FIB_BENCHMARK.episode) {{
                            window.FIB_BENCHMARK.episode.agent_name = '{agent_name}';
                        }}
                    }}
                """)
            except Exception:
                pass

            if subtask_id != "F1":
                try:
                    page.evaluate(f"""
                        () => {{
                            if (typeof window.FIB_fast_forward_to_subtask === 'function') {{
                                window.FIB_fast_forward_to_subtask('{subtask_id}');
                            }}
                        }}
                    """)
                    time.sleep(1.5)
                except Exception as e:
                    logger.warning(f"快进失败: {e}")

            observation = page_to_observation(page, task_instruction, observation_mode=observation_mode)
            step_count = 0
            mouse_pos = None
            actual_screen_width = page.viewport_size["width"]
            actual_screen_height = page.viewport_size["height"]
            observation_screen_size = (1280, 720) if observation_mode == OBSERVATION_MODE_SCREENSHOT_720P else agent_screen_size

            while step_count < max_steps_per_subtask:
                logger.info(f"=== 子任务 {subtask_id} Step {step_count + 1}/{max_steps_per_subtask} ===")
                try:
                    response, actions = agent.predict(task_instruction, observation)
                except AttributeError:
                    actions = [agent.step(observation, task_instruction)]
                    response = None
                except Exception as e:
                    logger.error(f"Agent 出错: {e}")
                    step_count += 1
                    time.sleep(2)
                    continue

                if not actions or actions[0] in ["FAIL", "DONE", "client error"]:
                    step_count += 1
                    time.sleep(1)
                    continue

                for action in actions:
                    try:
                        current_subtask_id = subtask_id or infer_current_fib_subtask(page)
                        record_fib_agent_action(page, action, current_subtask_id)
                        before_screenshot = page.screenshot(type="png")
                        before_path = os.path.join(episode_dir, f"step_{step_count + 1}_before.png")
                        with open(before_path, "wb") as f:
                            f.write(before_screenshot)
                        logger.info(f"💾 已保存执行前截图: {before_path}")
                    except Exception as e:
                        logger.warning(f"保存执行前截图失败: {e}")

                    no_convert = should_skip_coord_convert(
                        agent_kwargs.get("model"),
                        agent_name,
                        agent_kwargs.get("model_type"),
                    )
                    action_result = execute_action_on_page(
                        page,
                        action,
                        observation_screen_size,
                        (actual_screen_width, actual_screen_height),
                        no_coord_convert=no_convert,
                        model_type=agent_kwargs.get("model_type"),
                    )
                    if isinstance(action_result, tuple):
                        _, mouse_pos = action_result
                    time.sleep(1.5)
                    try:
                        page.wait_for_load_state("networkidle", timeout=3000)
                    except Exception:
                        pass
                    time.sleep(1.5)
                    step_count += 1
                    observation = page_to_observation(page, task_instruction, mouse_pos=mouse_pos, observation_mode=observation_mode)

                    try:
                        after_screenshot = observation.get("screenshot") or page.screenshot(type="png")
                        after_path = os.path.join(episode_dir, f"step_{step_count}_after.png")
                        with open(after_path, "wb") as f:
                            f.write(after_screenshot)
                        logger.info(f"💾 已保存执行后截图: {after_path}")
                    except Exception as e:
                        logger.warning(f"保存执行后截图失败: {e}")

                    try:
                        status = page.evaluate(f"""
                            () => {{
                                if (typeof window.FIB_BENCHMARK === 'undefined' || !window.FIB_BENCHMARK.episode) return null;
                                const st = window.FIB_BENCHMARK.episode._subtask_map['{subtask_id}'];
                                return st ? st.success : null;
                            }}
                        """)
                        if status is True:
                            logger.info(f"✅ 子任务 {subtask_id} 已完成")
                            test_success = True
                            break
                    except Exception:
                        pass
                    if test_success:
                        break
                if test_success:
                    break

            benchmark_log = extract_benchmark_log(page)
            if benchmark_log:
                benchmark_log["observation_mode"] = observation_mode
                log_path = os.path.join(episode_dir, f"subtask_{subtask_id}_log.json")
                with open(log_path, "w", encoding="utf-8") as f:
                    json.dump(benchmark_log, f, indent=2, ensure_ascii=False)
                if not test_success:
                    for st in benchmark_log.get("subtasks", []):
                        if st.get("subtask_id") == subtask_id:
                            test_success = st.get("success", False)
                            break
            else:
                logger.warning("无法提取 benchmark 日志")
        except Exception as e:
            logger.error(f"单子任务测试出错: {e}", exc_info=True)
        finally:
            time.sleep(3)
            browser.close()

    return {
        "subtask_id": subtask_id,
        "subtask_name": demo["name"],
        "success": test_success,
        "benchmark_log": benchmark_log,
        "episode_dir": episode_dir,
    }


def run_fib_subtask_multiple_runs(
    subtask_id: str,
    num_runs: int = 10,
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps_per_subtask: int = 10,
    fib_url: str = "http://localhost:8080/static/simulator/fib_simulator/FIB_simulator.html",
    result_dir: str = get_results_dir("fib"),
    headless: bool = False,
    observation_mode: str = OBSERVATION_MODE_SCREENSHOT,
    **agent_kwargs
) -> dict:
    """对单个子任务运行 num_runs 次，只输出该子任务的成功率日志。"""
    if subtask_id not in FIB_SUBTASK_DEMOS:
        raise ValueError(f"未知 subtask_id: {subtask_id}，可选: {FIB_SUBTASK_IDS}")
    demo = FIB_SUBTASK_DEMOS[subtask_id]
    runs = []
    metric_runs = []
    for i in range(num_runs):
        logger.info(f"--- 子任务 {subtask_id} 第 {i + 1}/{num_runs} 次 ---")
        r = run_fib_single_subtask_test(
            subtask_id=subtask_id,
            agent_name=agent_name,
            model=model,
            max_steps_per_subtask=max_steps_per_subtask,
            fib_url=fib_url,
            result_dir=result_dir,
            headless=headless,
            observation_mode=observation_mode,
            **agent_kwargs,
        )
        run_metrics = _extract_run_metric_summary(r.get("benchmark_log"), subtask_id)
        if run_metrics:
            metric_runs.append(run_metrics)
        runs.append({
            "run": i + 1,
            "success": r["success"],
            "episode_dir": r["episode_dir"],
            "metrics": run_metrics,
        })
        ok = "✅" if r["success"] else "❌"
        logger.info(f"{ok} 第 {i + 1} 次: {r['success']} | metrics={run_metrics or '{}'}")
    success_count = sum(1 for x in runs if x["success"])
    success_rate = success_count / num_runs if num_runs else 0.0
    summary = {
        "subtask_id": subtask_id,
        "subtask_name": demo["name"],
        "num_runs": num_runs,
        "observation_mode": observation_mode,
        "success_count": success_count,
        "success_rate": round(success_rate, 4),
        "metrics_summary": _aggregate_metric_summaries(metric_runs),
        "runs": runs,
    }
    os.makedirs(result_dir, exist_ok=True)
    log_path = os.path.join(
        result_dir,
        f"subtask_{subtask_id}_runs_{num_runs}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
    )
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    logger.info(f"子任务 {subtask_id} 成功率: {success_count}/{num_runs} = {success_rate:.2%}，日志已保存: {log_path}")
    return summary


def run_all_subtask_demos(
    num_runs: int = 10,
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps_per_subtask: int = 10,
    fib_url: str = "http://localhost:8080/static/simulator/fib_simulator/FIB_simulator.html",
    result_dir: str = get_results_dir("fib"),
    headless: bool = False,
    subtask_ids: list = None,
    observation_mode: str = OBSERVATION_MODE_SCREENSHOT,
    **agent_kwargs
) -> dict:
    """依次对每个子任务运行 num_runs 次，每个子任务只输出该子任务的成功率日志。"""
    if subtask_ids is None:
        subtask_ids = list(FIB_SUBTASK_IDS)
    per_subtask = []
    for sid in subtask_ids:
        if sid not in FIB_SUBTASK_DEMOS:
            continue
        summary = run_fib_subtask_multiple_runs(
            subtask_id=sid,
            num_runs=num_runs,
            agent_name=agent_name,
            model=model,
            max_steps_per_subtask=max_steps_per_subtask,
            fib_url=fib_url,
            result_dir=result_dir,
            headless=headless,
            observation_mode=observation_mode,
            **agent_kwargs,
        )
        per_subtask.append(summary)
    all_summary = {
        "num_runs_per_subtask": num_runs,
        "observation_mode": observation_mode,
        "subtasks": per_subtask,
        "overall_metrics_summary": _aggregate_overall_metric_summary(per_subtask),
    }
    summary_path = os.path.join(
        result_dir, f"subtask_demos_runs_{num_runs}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(all_summary, f, indent=2, ensure_ascii=False)
    logger.info("=" * 50)
    logger.info("各子任务成功率:")
    for s in per_subtask:
        logger.info(f"  {s['subtask_id']} {s['subtask_name']}: {s['success_count']}/{s['num_runs']} = {s['success_rate']:.2%}")
        if s.get("metrics_summary"):
            logger.info(f"    metrics: {json.dumps(s['metrics_summary'], ensure_ascii=False)}")
    if all_summary.get("overall_metrics_summary"):
        logger.info(f"整体 metrics: {json.dumps(all_summary['overall_metrics_summary'], ensure_ascii=False)}")
    logger.info(f"已保存汇总: {summary_path}")
    return all_summary


def main():
    parser = argparse.ArgumentParser(description="FIB 单子任务 Demo 测试")
    parser.add_argument("--agent", type=str, default="uitars15_v2")
    parser.add_argument("--model", type=str, default=None)
    parser.add_argument("--model_type", type=str, default="doubao")
    parser.add_argument("--temperature", type=float, default=0)
    parser.add_argument("--max_tokens", type=int, default=3000)
    parser.add_argument("--api_key", type=str, default=None)
    parser.add_argument("--api_url", type=str, default=None)
    parser.add_argument("--fib_url", type=str, default="http://localhost:8080/static/simulator/fib_simulator/FIB_simulator.html")
    parser.add_argument("--result_dir", type=str, default=get_results_dir("fib"))
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--subtask", type=str, default=None, help="只运行指定子任务，如 F1,F5,F10")
    parser.add_argument(
        "--run_all_subtask_demos",
        "--run_all_subtask_demo",
        action="store_true",
        help="依次运行 F1～F20",
    )
    parser.add_argument("--runs", type=int, default=10, help="每个子任务测试次数，默认 10")
    parser.add_argument("--max_steps_subtask", type=int, default=10)
    parser.add_argument("--observation_mode", choices=["screenshot", "screenshot_720p", "a11y_tree"], default="screenshot")
    args = parser.parse_args()
    args.agent = prefer_gui_owl_agent_when_model_name(args.agent, args.model)

    from benchmarks.vlaa_gui_support import configure_benchmark_subtask_env
    configure_benchmark_subtask_env(
        args.agent,
        model=args.model,
        api_url=args.api_url,
        api_key=args.api_key,
    )

    common = {
        "agent_name": args.agent,
        "model": args.model,
        "model_type": args.model_type,
        "temperature": args.temperature,
        "max_tokens": args.max_tokens,
        "max_steps_per_subtask": args.max_steps_subtask,
        "fib_url": args.fib_url,
        "result_dir": args.result_dir,
        "headless": args.headless,
        "observation_mode": args.observation_mode,
    }

    if args.subtask:
        sid = args.subtask.strip().upper()
        run_fib_subtask_multiple_runs(subtask_id=sid, num_runs=args.runs, **common)
    elif args.run_all_subtask_demos:
        run_all_subtask_demos(num_runs=args.runs, **common)
    else:
        parser.print_help()
        print("\n请指定 --subtask F5 或 --run_all_subtask_demos")


if __name__ == "__main__":
    main()
