"""
LFM 单子任务 Demo 测试脚本
对每个子任务（L1～L12）单独测试：快进到该步前状态，只测当前一步。
任务范围：到使用 BF capture 按钮获取一张标准明场图像为止。
子任务含难度：easy / medium / hard

用法:
  python test_lfm_subtask_demos.py --subtask L12         # L12 跑 10 次
  python test_lfm_subtask_demos.py --subtask L6 --runs 5
  python test_lfm_subtask_demos.py --run_all_subtask_demos  # L1～L12 各跑 10 次
  python test_lfm_subtask_demos.py --difficulty easy     # 只跑 easy 子任务
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

from test_lfm_agent_lightweight import (
    get_agent,
    page_to_observation,
    extract_benchmark_log,
    infer_current_lfm_subtask,
    record_lfm_agent_action,
    logger,
)
from fib_benchmark.test_fib_agent_lightweight import execute_action_on_page, should_skip_coord_convert

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

LFM_SUBTASK_DEMOS = {
    "L1": {"name": "DragSample", "difficulty": "easy", "instruction": "当前是 LFM 模拟器初始界面。请将 H&E 染色的肾脏样品拖放到显微镜载物台上。完成后即可停止。"},
    "L2": {"name": "SelectBrightfield", "difficulty": "easy", "instruction": "样品已放置。请勾选 SETUP & BRIGHTFIELD 模式。完成后即可停止。"},
    "L3": {"name": "SelectHalogen", "difficulty": "easy", "instruction": "已选明场模式。请点击 HALOGEN LAMP 选择卤素灯。完成后即可停止。"},
    "L4": {"name": "Select10xFocus", "difficulty": "medium", "instruction": "卤素灯已开。请选择 10X 物镜，使用 FOCUS 滑块对样品对焦（移动滑块找到最清晰位置）。完成后即可停止。"},
    "L5": {"name": "FieldDiaphragmClose", "difficulty": "easy", "instruction": "已对焦。请将 FIELD DIAPHRAGM 滑块向右推到底，关闭视场光阑。完成后即可停止。"},
    "L6": {"name": "FieldDiaphragmFocus", "difficulty": "medium", "instruction": "视场光阑已关闭。请调节 CONDENSER FOCUS 滑块，使光阑边缘清晰对焦。完成后即可停止。"},
    "L7": {"name": "FieldDiaphragmCenter", "difficulty": "hard", "instruction": "光阑边缘已清晰。请使用 CONDENSER POSITIONING 的上下左右按钮，将光阑居中到视场中心。完成后即可停止。"},
    "L8": {"name": "FieldDiaphragmOpen", "difficulty": "easy", "instruction": "光阑已居中。请将 FIELD DIAPHRAGM 滑块向左推，打开视场光阑直至叶片刚超出视场。完成后即可停止。"},
    "L9": {"name": "ApertureDiaphragm", "difficulty": "medium", "instruction": "视场光阑已打开。请点击 REPLACE 移除右目镜，调节 CONDENSER APERTURE 使孔径约占视场 7/8，再点击 REPLACE 装回目镜。完成后即可停止。"},
    "L10": {"name": "WhiteBalance", "difficulty": "medium", "instruction": "显微镜已准备好。请用 MOVE SLIDE 将载玻片移到无样品区域，再请点击 IMAGING SOFTWARE，点击 WHITE BALANCE，再将载玻片移回样品。完成后即可停止。"},
    "L11": {"name": "ExposureAdjust", "difficulty": "medium", "instruction": "白平衡已完成。请调节 EXPOSURE TIME 滑块至最佳曝光，可点击 LUT 检查过曝（红）和欠曝（蓝）。完成后即可停止。"},
    "L12": {"name": "BFCapture", "difficulty": "hard", "instruction": "曝光已调好。请点击 LUT 检查动态范围，然后点击 CAPTURE 按钮获取一张标准明场图像。完成后即可停止。"},
}
LFM_SUBTASK_IDS = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11", "L12"]


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


def run_lfm_single_subtask_test(
    subtask_id: str,
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps_per_subtask: int = 10,
    lfm_url: str = "http://localhost:8080/static/simulator/lm_simulator/LM_simulator.html",
    result_dir: str = get_results_dir("lfm"),
    headless: bool = False,
    **agent_kwargs
) -> dict:
    if subtask_id not in LFM_SUBTASK_DEMOS:
        raise ValueError(f"未知 subtask_id: {subtask_id}，可选: {LFM_SUBTASK_IDS}")
    demo = LFM_SUBTASK_DEMOS[subtask_id]
    task_instruction = demo["instruction"]

    os.makedirs(result_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    episode_dir = os.path.join(result_dir, f"subtask_{subtask_id}_{timestamp}")
    os.makedirs(episode_dir, exist_ok=True)

    logger.info(f"单子任务测试 - 子任务: {subtask_id} {demo['name']}")

    agent_kwargs = resolve_subtask_agent_kwargs(
        agent_name, agent_kwargs, model=model, max_steps_per_subtask=max_steps_per_subtask
    )
    agent_kwargs["model_type"] = agent_kwargs.get("model_type", "doubao")
    agent_kwargs["max_tokens"] = agent_kwargs.get("max_tokens", 3000)
    agent_kwargs["temperature"] = agent_kwargs.get("temperature", 0)
    agent_kwargs["language"] = agent_kwargs.get("language", "Chinese")
    agent = get_agent(agent_name, **agent_kwargs)

    agent_screen_size = (1920, 1080)
    test_success = False
    benchmark_log = None

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=headless)
        except Exception as e:
            logger.warning(f"启动浏览器失败，尝试 headless: {e}")
            browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080}, device_scale_factor=1.0)
        page = context.new_page()
        try:
            page.goto(lfm_url, wait_until="networkidle", timeout=60000)
            time.sleep(5)
            try:
                page.wait_for_load_state("networkidle", timeout=5000)
            except Exception:
                pass
            time.sleep(2)

            try:
                page.evaluate(f"() => {{ if (window.LFM_BENCHMARK && window.LFM_BENCHMARK.episode) window.LFM_BENCHMARK.episode.agent_name = '{agent_name}'; }}")
            except Exception:
                pass

            if subtask_id != "L1":
                try:
                    page.evaluate(f"() => {{ if (typeof window.LFM_fast_forward_to_subtask === 'function') window.LFM_fast_forward_to_subtask('{subtask_id}'); }}")
                    time.sleep(1.5)
                except Exception as e:
                    logger.warning(f"快进失败: {e}")

            observation = page_to_observation(page, task_instruction)
            step_count = 0
            mouse_pos = None
            actual_screen_width = page.viewport_size["width"]
            actual_screen_height = page.viewport_size["height"]

            while step_count < max_steps_per_subtask:
                logger.info(f"=== 子任务 {subtask_id} Step {step_count + 1}/{max_steps_per_subtask} ===")
                try:
                    response, actions = agent.predict(task_instruction, observation)
                except AttributeError:
                    actions = [agent.step(observation, task_instruction)]
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
                        current_subtask_id = subtask_id or infer_current_lfm_subtask(page)
                        record_lfm_agent_action(page, action, current_subtask_id)
                        before_screenshot = page.screenshot(type="png")
                        with open(os.path.join(episode_dir, f"step_{step_count + 1}_before.png"), "wb") as f:
                            f.write(before_screenshot)
                    except Exception:
                        pass

                    no_convert = should_skip_coord_convert(
                        agent_kwargs.get("model"),
                        agent_name,
                        agent_kwargs.get("model_type"),
                    )
                    action_result = execute_action_on_page(
                        page, action, agent_screen_size, (actual_screen_width, actual_screen_height), no_coord_convert=no_convert,
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
                    observation = page_to_observation(page, task_instruction, mouse_pos=mouse_pos)

                    try:
                        after_screenshot = observation.get("screenshot") or page.screenshot(type="png")
                        with open(os.path.join(episode_dir, f"step_{step_count}_after.png"), "wb") as f:
                            f.write(after_screenshot)
                    except Exception:
                        pass

                    try:
                        status = page.evaluate(f"""
                            () => {{
                                if (typeof window.LFM_BENCHMARK === 'undefined' || !window.LFM_BENCHMARK.episode) return null;
                                const st = window.LFM_BENCHMARK.episode._subtask_map['{subtask_id}'];
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
                with open(os.path.join(episode_dir, f"subtask_{subtask_id}_log.json"), "w", encoding="utf-8") as f:
                    json.dump(benchmark_log, f, indent=2, ensure_ascii=False)
                if not test_success:
                    for st in benchmark_log.get("subtasks", []):
                        if st.get("subtask_id") == subtask_id:
                            test_success = st.get("success", False)
                            break
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


def run_lfm_subtask_multiple_runs(
    subtask_id: str,
    num_runs: int = 10,
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps_per_subtask: int = 10,
    lfm_url: str = "http://localhost:8080/static/simulator/lm_simulator/LM_simulator.html",
    result_dir: str = get_results_dir("lfm"),
    headless: bool = False,
    **agent_kwargs
) -> dict:
    if subtask_id not in LFM_SUBTASK_DEMOS:
        raise ValueError(f"未知 subtask_id: {subtask_id}，可选: {LFM_SUBTASK_IDS}")
    demo = LFM_SUBTASK_DEMOS[subtask_id]
    runs = []
    metric_runs = []
    for i in range(num_runs):
        logger.info(f"--- 子任务 {subtask_id} 第 {i + 1}/{num_runs} 次 ---")
        r = run_lfm_single_subtask_test(
            subtask_id=subtask_id,
            agent_name=agent_name,
            model=model,
            max_steps_per_subtask=max_steps_per_subtask,
            lfm_url=lfm_url,
            result_dir=result_dir,
            headless=headless,
            **agent_kwargs,
        )
        run_metrics = _extract_run_metric_summary(r.get("benchmark_log"), subtask_id)
        if run_metrics:
            metric_runs.append(run_metrics)
        runs.append(
            {
                "run": i + 1,
                "success": r["success"],
                "episode_dir": r["episode_dir"],
                "metrics": run_metrics,
            }
        )
        ok = "✅" if r["success"] else "❌"
        logger.info(f"{ok} 第 {i + 1} 次: {r['success']} | metrics={run_metrics or '{}'}")
    success_count = sum(1 for x in runs if x["success"])
    success_rate = success_count / num_runs if num_runs else 0.0
    summary = {
        "subtask_id": subtask_id,
        "subtask_name": demo["name"],
        "num_runs": num_runs,
        "success_count": success_count,
        "success_rate": round(success_rate, 4),
        "metrics_summary": _aggregate_metric_summaries(metric_runs),
        "runs": runs,
    }
    os.makedirs(result_dir, exist_ok=True)
    log_path = os.path.join(result_dir, f"subtask_{subtask_id}_runs_{num_runs}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    logger.info(f"子任务 {subtask_id} 成功率: {success_count}/{num_runs} = {success_rate:.2%}，日志已保存: {log_path}")
    return summary


def run_all_subtask_demos(
    num_runs: int = 10,
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps_per_subtask: int = 10,
    lfm_url: str = "http://localhost:8080/static/simulator/lm_simulator/LM_simulator.html",
    result_dir: str = get_results_dir("lfm"),
    headless: bool = False,
    subtask_ids: list = None,
    difficulty: str = None,
    **agent_kwargs
) -> dict:
    if subtask_ids is None:
        subtask_ids = list(LFM_SUBTASK_IDS)
    if difficulty:
        subtask_ids = [sid for sid in subtask_ids if LFM_SUBTASK_DEMOS.get(sid, {}).get("difficulty") == difficulty]
    per_subtask = []
    for sid in subtask_ids:
        if sid not in LFM_SUBTASK_DEMOS:
            continue
        summary = run_lfm_subtask_multiple_runs(
            subtask_id=sid,
            num_runs=num_runs,
            agent_name=agent_name,
            model=model,
            max_steps_per_subtask=max_steps_per_subtask,
            lfm_url=lfm_url,
            result_dir=result_dir,
            headless=headless,
            **agent_kwargs,
        )
        per_subtask.append(summary)
    all_summary = {
        "num_runs_per_subtask": num_runs,
        "subtasks": per_subtask,
        "overall_metrics_summary": _aggregate_overall_metric_summary(per_subtask),
    }
    summary_path = os.path.join(result_dir, f"subtask_demos_runs_{num_runs}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(all_summary, f, indent=2, ensure_ascii=False)
    logger.info("=" * 50)
    logger.info("各子任务成功率:")
    for s in per_subtask:
        diff = LFM_SUBTASK_DEMOS.get(s["subtask_id"], {}).get("difficulty", "")
        logger.info(f"  {s['subtask_id']} {s['subtask_name']} [{diff}]: {s['success_count']}/{s['num_runs']} = {s['success_rate']:.2%}")
        if s.get("metrics_summary"):
            logger.info(f"    metrics: {json.dumps(s['metrics_summary'], ensure_ascii=False)}")
    if all_summary.get("overall_metrics_summary"):
        logger.info(f"整体 metrics: {json.dumps(all_summary['overall_metrics_summary'], ensure_ascii=False)}")
    logger.info(f"已保存汇总: {summary_path}")
    return all_summary


def main():
    parser = argparse.ArgumentParser(description="LFM 单子任务 Demo 测试")
    parser.add_argument("--agent", type=str, default="uitars15_v2")
    parser.add_argument("--model", type=str, default=None)
    parser.add_argument("--model_type", type=str, default="doubao")
    parser.add_argument("--api_key", type=str, default=None)
    parser.add_argument("--api_url", type=str, default=None)
    parser.add_argument("--lfm_url", type=str, default="http://localhost:8080/static/simulator/lm_simulator/LM_simulator.html")
    parser.add_argument("--result_dir", type=str, default=get_results_dir("lfm"))
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--subtask", type=str, default=None, help="只运行指定子任务，如 L1,L6,L12")
    parser.add_argument(
        "--run_all_subtask_demos",
        "--run_all_subtask_demo",
        action="store_true",
        help="依次运行 L1～L12",
    )
    parser.add_argument("--difficulty", type=str, default=None, choices=["easy", "medium", "hard"], help="只运行指定难度的子任务")
    parser.add_argument("--runs", type=int, default=10, help="每个子任务测试次数")
    parser.add_argument("--max_steps_subtask", type=int, default=10)
    args = parser.parse_args()
    args.agent = prefer_gui_owl_agent_when_model_name(args.agent, args.model)

    from benchmarks.vlaa_gui_support import configure_benchmark_subtask_env
    configure_benchmark_subtask_env(
        args.agent, model=args.model, api_url=args.api_url, api_key=args.api_key
    )

    common = {
        "agent_name": args.agent,
        "model": args.model,
        "model_type": args.model_type,
        "max_steps_per_subtask": args.max_steps_subtask,
        "lfm_url": args.lfm_url,
        "result_dir": args.result_dir,
        "headless": args.headless,
    }

    if args.subtask:
        sid = args.subtask.strip().upper()
        run_lfm_subtask_multiple_runs(subtask_id=sid, num_runs=args.runs, **common)
    elif args.run_all_subtask_demos:
        run_all_subtask_demos(num_runs=args.runs, difficulty=args.difficulty, **common)
    else:
        parser.print_help()
        print("\n请指定 --subtask L12 或 --run_all_subtask_demos 或 --difficulty easy")


if __name__ == "__main__":
    main()
