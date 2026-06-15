"""
SPM 单子任务 Demo 测试脚本
对每个子任务（S1～S14）单独测试。S1 从初始状态开始；S2～S14 需 SPM_fast_forward_to_subtask 支持。
当前 SPM 模拟器暂未实现完整 fast_forward，仅 S1 可独立测试。

用法:
  python test_spm_subtask_demos.py --subtask S1 --runs 10
  python test_spm_subtask_demos.py --run_all_subtask_demos  # S1～S14 各跑 10 次（S2～S14 从初始状态执行）
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
    os.environ["DOUBAO_API_URL"] = "http://180.184.249.158:10149/v1/chat/completions"

from playwright.sync_api import sync_playwright

from test_spm_agent_lightweight import (
    OBSERVATION_MODE_A11Y_TREE,
    OBSERVATION_MODE_SCREENSHOT,
    OBSERVATION_MODE_SCREENSHOT_720P,
    get_agent,
    page_to_observation,
    extract_benchmark_log,
    record_spm_agent_action,
    logger,
)
from fib_benchmark.test_fib_agent_lightweight import execute_action_on_page, should_skip_coord_convert

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

SPM_SUBTASK_DEMOS = {
    "S1": {"name": "SelectTappingMode", "instruction": "当前是 SPM 模拟器界面。请选择 TAPPING 模式。完成后即可停止。"},
    "S2": {"name": "LaserAlignment", "instruction": "已选 Tapping 模式。请使用 ALIGNMENT 控制器，将激光光斑对准悬臂梁末端中心。完成后即可停止。"},
    "S3": {"name": "PhotodiodeAlignment", "instruction": "激光已对准悬臂梁。请使用 PHOTODIODE 控制器，将激光对准光电二极管中心。完成后即可停止。"},
    "S4": {"name": "SetTargetAmplitude", "instruction": "光电二极管已对准。请将 Target amplitude 设为 500mV。完成后即可停止。"},
    "S5": {"name": "SetFrequency", "instruction": "振幅已设好。请将 Frequency FROM 设为 200KHz，TO 设为 500KHz。完成后即可停止。"},
    "S6": {"name": "AutoTune", "instruction": "频率已设好。请点击 AUTO TUNE 按钮，等待调谐完成。完成后即可停止。"},
    "S7": {"name": "SetScanSize", "instruction": "调谐已完成。请选择 SCAN SIZE（如 1μm 或 2.5μm）。完成后即可停止。"},
    "S8": {"name": "SetIntegralGain", "instruction": "扫描尺寸已选。请调节 INTEGRAL GAIN 滑块设置积分增益。完成后即可停止。"},
    "S9": {"name": "SetScanRate", "instruction": "积分增益已设。请选择 SCAN RATE。完成后即可停止。"},
    "S10": {"name": "SetSetPoint", "instruction": "扫描速率已选。请调节 SET POINT 至最佳位置。完成后即可停止。"},
    "S11": {"name": "MotorApproach", "instruction": "Set Point 已设。请使用 MOTOR 滑块使探针接近样品表面。完成后即可停止。"},
    "S12": {"name": "Engage", "instruction": "探针已接近。请点击 ENGAGE 按钮。完成后即可停止。"},
    "S13": {"name": "Scan", "instruction": "已 Engage。请点击 SCAN 按钮开始扫描。完成后即可停止。"},
    "S14": {"name": "Save", "instruction": "扫描已开始。请点击 SAVE 按钮保存图像。完成后即可停止。"},
}
SPM_SUBTASK_IDS = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "S11", "S12", "S13", "S14"]


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


def run_spm_single_subtask_test(
    subtask_id: str,
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps_per_subtask: int = 15,
    spm_url: str = "http://localhost:8080/static/simulator/spm_simulator/SPM_simulator.html",
    result_dir: str = get_results_dir("spm"),
    headless: bool = False,
    observation_mode: str = OBSERVATION_MODE_SCREENSHOT,
    **agent_kwargs
) -> dict:
    if subtask_id not in SPM_SUBTASK_DEMOS:
        raise ValueError(f"未知 subtask_id: {subtask_id}，可选: {SPM_SUBTASK_IDS}")
    if observation_mode == OBSERVATION_MODE_A11Y_TREE and agent_name != "uitars":
        raise ValueError("SPM a11y_tree mode currently supports agent_name='uitars' only.")
    demo = SPM_SUBTASK_DEMOS[subtask_id]
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
    agent_kwargs["temperature"] = agent_kwargs.get("temperature") if agent_kwargs.get("temperature") is not None else 0
    agent_kwargs["language"] = agent_kwargs.get("language", "Chinese")
    agent_kwargs["observation_type"] = "a11y_tree" if observation_mode == OBSERVATION_MODE_A11Y_TREE else "screenshot"
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
            page.goto(spm_url, wait_until="networkidle", timeout=60000)
            time.sleep(5)
            try:
                page.evaluate(f"""
                    () => {{
                        if (typeof window.SPM_BENCHMARK !== 'undefined' && window.SPM_BENCHMARK.episode) {{
                            window.SPM_BENCHMARK.episode.agent_name = '{agent_name}';
                        }}
                    }}
                """)
            except Exception:
                pass

            if subtask_id != "S1":
                try:
                    page.evaluate(f"""
                        () => {{
                            if (typeof window.SPM_fast_forward_to_subtask === 'function') {{
                                window.SPM_fast_forward_to_subtask('{subtask_id}');
                            }}
                        }}
                    """)
                    time.sleep(1.5)
                except Exception as e:
                    logger.warning(f"快进失败（SPM 可能未实现 fast_forward）: {e}")

            observation = page_to_observation(page, task_instruction, observation_mode=observation_mode)
            step_count = 0
            mouse_pos = None
            actual_screen_width = page.viewport_size["width"]
            actual_screen_height = page.viewport_size["height"]
            no_convert = should_skip_coord_convert(
                agent_kwargs.get("model"),
                agent_name,
                agent_kwargs.get("model_type"),
            )
            logger.info(
                "SPM 坐标策略: no_coord_convert=%s model=%r model_type=%r agent=%r",
                no_convert,
                agent_kwargs.get("model"),
                agent_kwargs.get("model_type"),
                agent_name,
            )
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
                        before_screenshot = page.screenshot(type="png")
                        before_path = os.path.join(episode_dir, f"step_{step_count + 1}_before.png")
                        with open(before_path, "wb") as f:
                            f.write(before_screenshot)
                    except Exception as e:
                        logger.warning(f"保存执行前截图失败: {e}")

                    record_spm_agent_action(page, action, subtask_id)
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
                    step_count += 1
                    observation = page_to_observation(page, task_instruction, mouse_pos=mouse_pos, observation_mode=observation_mode)

                    try:
                        after_screenshot = observation.get("screenshot") or page.screenshot(type="png")
                        after_path = os.path.join(episode_dir, f"step_{step_count}_after.png")
                        with open(after_path, "wb") as f:
                            f.write(after_screenshot)
                    except Exception as e:
                        logger.warning(f"保存执行后截图失败: {e}")

                    try:
                        status = page.evaluate(f"""
                            () => {{
                                if (typeof window.SPM_BENCHMARK === 'undefined' || !window.SPM_BENCHMARK.episode) return null;
                                const st = window.SPM_BENCHMARK.episode._subtask_map['{subtask_id}'];
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


def run_spm_subtask_multiple_runs(
    subtask_id: str,
    num_runs: int = 10,
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps_per_subtask: int = 15,
    spm_url: str = "http://localhost:8080/static/simulator/spm_simulator/SPM_simulator.html",
    result_dir: str = get_results_dir("spm"),
    headless: bool = False,
    observation_mode: str = OBSERVATION_MODE_SCREENSHOT,
    **agent_kwargs
) -> dict:
    if subtask_id not in SPM_SUBTASK_DEMOS:
        raise ValueError(f"未知 subtask_id: {subtask_id}，可选: {SPM_SUBTASK_IDS}")
    demo = SPM_SUBTASK_DEMOS[subtask_id]
    runs = []
    for i in range(num_runs):
        logger.info(f"--- 子任务 {subtask_id} 第 {i + 1}/{num_runs} 次 ---")
        r = run_spm_single_subtask_test(
            subtask_id=subtask_id,
            agent_name=agent_name,
            model=model,
            max_steps_per_subtask=max_steps_per_subtask,
            spm_url=spm_url,
            result_dir=result_dir,
            headless=headless,
            observation_mode=observation_mode,
            **agent_kwargs,
        )
        run_metrics = _extract_run_metric_summary(r.get("benchmark_log"), subtask_id)
        runs.append({"run": i + 1, "success": r["success"], "episode_dir": r["episode_dir"], "metrics": run_metrics})
        ok = "✅" if r["success"] else "❌"
        logger.info(f"{ok} 第 {i + 1} 次: {r['success']}")
    success_count = sum(1 for x in runs if x["success"])
    success_rate = success_count / num_runs if num_runs else 0.0
    metrics_summary = _aggregate_metric_summaries([x.get("metrics", {}) for x in runs if x.get("metrics")])
    summary = {
        "subtask_id": subtask_id,
        "subtask_name": demo["name"],
        "num_runs": num_runs,
        "observation_mode": observation_mode,
        "success_count": success_count,
        "success_rate": round(success_rate, 4),
        "metrics_summary": metrics_summary,
        "runs": runs,
    }
    os.makedirs(result_dir, exist_ok=True)
    log_path = os.path.join(result_dir, f"subtask_{subtask_id}_runs_{num_runs}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    logger.info(f"子任务 {subtask_id} 成功率: {success_count}/{num_runs} = {success_rate:.2%}，日志已保存: {log_path}")
    if metrics_summary:
        logger.info(
            "  metrics: widget=%s text=%s state=%s attempts=%s",
            metrics_summary.get("avg_widget_grounding_accuracy"),
            metrics_summary.get("avg_text_grounding_accuracy"),
            metrics_summary.get("avg_state_grounding_accuracy"),
            metrics_summary.get("avg_target_subtask_attempts"),
        )
    return summary


def run_all_subtask_demos(
    num_runs: int = 10,
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps_per_subtask: int = 15,
    spm_url: str = "http://localhost:8080/static/simulator/spm_simulator/SPM_simulator.html",
    result_dir: str = get_results_dir("spm"),
    headless: bool = False,
    subtask_ids: list = None,
    observation_mode: str = OBSERVATION_MODE_SCREENSHOT,
    **agent_kwargs
) -> dict:
    if subtask_ids is None:
        subtask_ids = list(SPM_SUBTASK_IDS)
    per_subtask = []
    for sid in subtask_ids:
        if sid not in SPM_SUBTASK_DEMOS:
            continue
        summary = run_spm_subtask_multiple_runs(
            subtask_id=sid,
            num_runs=num_runs,
            agent_name=agent_name,
            model=model,
            max_steps_per_subtask=max_steps_per_subtask,
            spm_url=spm_url,
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
    summary_path = os.path.join(result_dir, f"subtask_demos_runs_{num_runs}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(all_summary, f, indent=2, ensure_ascii=False)
    logger.info("=" * 50)
    logger.info("各子任务成功率:")
    for s in per_subtask:
        logger.info(f"  {s['subtask_id']} {s['subtask_name']}: {s['success_count']}/{s['num_runs']} = {s['success_rate']:.2%}")
        metrics_summary = s.get("metrics_summary", {})
        if metrics_summary:
            logger.info(
                "    metrics: widget=%s text=%s state=%s attempts=%s",
                metrics_summary.get("avg_widget_grounding_accuracy"),
                metrics_summary.get("avg_text_grounding_accuracy"),
                metrics_summary.get("avg_state_grounding_accuracy"),
                metrics_summary.get("avg_target_subtask_attempts"),
            )
    overall_metrics = all_summary.get("overall_metrics_summary", {})
    if overall_metrics:
        logger.info("总体 metric 均值:")
        logger.info(
            "  widget=%s text=%s state=%s attempts=%s",
            overall_metrics.get("avg_widget_grounding_accuracy"),
            overall_metrics.get("avg_text_grounding_accuracy"),
            overall_metrics.get("avg_state_grounding_accuracy"),
            overall_metrics.get("avg_target_subtask_attempts"),
        )
    logger.info(f"已保存汇总: {summary_path}")
    return all_summary


def main():
    parser = argparse.ArgumentParser(description="SPM 单子任务 Demo 测试")
    parser.add_argument("--agent", type=str, default="uitars15_v2")
    parser.add_argument("--model", type=str, default=None)
    parser.add_argument(
        "--model_type",
        type=str,
        default="doubao",
        help="模型坐标类型；claude_1440 表示模型输出 1440x810，执行时映射到 1920x1080",
    )
    parser.add_argument("--api_key", type=str, default=None)
    parser.add_argument("--api_url", type=str, default=None)
    parser.add_argument("--spm_url", type=str, default="http://localhost:8080/static/simulator/spm_simulator/SPM_simulator.html")
    parser.add_argument("--result_dir", type=str, default=get_results_dir("spm"))
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--subtask", type=str, default=None, help="只运行指定子任务，如 S1,S5,S10")
    parser.add_argument(
        "--run_all_subtask_demos",
        "--run_all_subtask_demo",
        action="store_true",
        help="依次运行 S1～S14",
    )
    parser.add_argument("--runs", type=int, default=10, help="每个子任务测试次数，默认 10")
    parser.add_argument("--max_steps_subtask", type=int, default=15)
    parser.add_argument("--temperature", type=float, default=None, help="采样温度，部分模型仅支持固定值如 0.6")
    parser.add_argument("--observation_mode", choices=["screenshot", "screenshot_720p", "a11y_tree"], default="screenshot")
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
        "spm_url": args.spm_url,
        "result_dir": args.result_dir,
        "headless": args.headless,
        "observation_mode": args.observation_mode,
    }
    if args.temperature is not None:
        common["temperature"] = args.temperature

    if args.subtask:
        sid = args.subtask.strip().upper()
        run_spm_subtask_multiple_runs(subtask_id=sid, num_runs=args.runs, **common)
    elif args.run_all_subtask_demos:
        run_all_subtask_demos(num_runs=args.runs, **common)
    else:
        parser.print_help()
        print("\n请指定 --subtask S1 或 --run_all_subtask_demos")


if __name__ == "__main__":
    main()
