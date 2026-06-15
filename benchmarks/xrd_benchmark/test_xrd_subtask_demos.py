"""
XRD 单子任务 Demo 测试脚本
对每个子任务（S1～S8）单独测试：快进到该步前状态，只测当前一步。
默认每个子任务跑 10 次，输出仅含该子任务的成功率日志。

用法:
  python test_xrd_subtask_demos.py --subtask S5           # S5 跑 10 次，输出 S5 成功率
  python test_xrd_subtask_demos.py --subtask S5 --runs 5  # S5 跑 5 次
  python test_xrd_subtask_demos.py --run_all_subtask_demos  # S1～S8 各跑 10 次，每子任务一条日志+成功率
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

# 复用主测试脚本的 Agent、观察、动作执行与日志提取
from fib_benchmark.test_fib_agent_lightweight import should_skip_coord_convert
from test_xrd_agent_lightweight import (
    get_agent,
    page_to_observation,
    execute_action_on_page,
    extract_benchmark_log,
    load_xrd_manual_excerpt,
    logger,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

# 单子任务 Demo 配置
XRD_SUBTASK_DEMOS = {
    "S1": {
        "name": "SelectSpecimen",
        "instruction": "当前是 XRD 模拟器初始界面。请从样品（Specimen）下拉菜单中选择任意一个样品（例如 Glass、Silicon 等），选择完成后即可停止，无需进行后续操作。",
    },
    "S2": {
        "name": "Doors",
        "instruction": "样品已选好。请先点击 DOORS 按钮打开样品室门，等待门打开（按钮文字会变为 CLOSE）、样品进入后，再点击 CLOSE 按钮关闭样品室门，等待门完全关闭。完成后即可停止。",
    },
    "S3": {
        "name": "PowerUp",
        "instruction": "门已关闭。请点击 STANDBY 按钮启动电源，等待界面显示就绪（如 kV/mA 稳定或绿色指示）。完成后即可停止。",
    },
    "S4": {
        "name": "SetAngles",
        "instruction": "电源已就绪。请使用起始角/终止角按钮设置扫描角度范围，确保起始角度小于终止角度（例如起始 5°、终止 80°）。设置完成后即可停止。",
    },
    "S5": {
        "name": "SetStepSize",
        "instruction": "角度已设置好。请在 STEP SIZE 下拉框中选择一个步长（例如 0.01° 或 0.02°）。选择完成后即可停止。",
    },
    "S6": {
        "name": "SetScanRate",
        "instruction": "步长已选好。请在 SCAN RATE 下拉框中选择一个扫描速率。选择完成后即可停止。",
    },
    "S7": {
        "name": "RunScan",
        "instruction": "扫描参数已全部设置好。请点击 START SCAN 按钮开始扫描，等待扫描完成（按钮恢复为 START SCAN）。完成后即可停止。",
    },
    "S8": {
        "name": "SaveResult",
        "instruction": "扫描已完成。请点击 SAVE DIFFRACTOGRAM 按钮保存衍射图结果。保存完成后即可停止。",
    },
}
# S2 已合并为「开门→等样品进入→关门」一步，不再单独列出 S2a
XRD_SUBTASK_IDS = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]


def _safe_round(value, ndigits: int = 4):
    if value is None:
        return None
    try:
        return round(float(value), ndigits)
    except Exception:
        return None


def _extract_run_metric_summary(benchmark_log: dict | None, subtask_id: str) -> dict:
    if not benchmark_log:
        return {}

    grounding = benchmark_log.get("grounding_metrics", {}) or {}
    subtasks = benchmark_log.get("subtasks", []) or []
    focus_to_metric = {
        "widget": "widget_grounding_accuracy",
        "text": "text_grounding_accuracy",
        "state": "state_grounding_accuracy",
    }
    if subtask_id == "S2":
        target_subtasks = [st for st in subtasks if st.get("subtask_id") in ("S2", "S2a")]
        target_attempts = sum(int(st.get("attempts", 0) or 0) for st in target_subtasks)
        target_success = all(bool(st.get("success", False)) for st in target_subtasks) if target_subtasks else False
        target_focuses = []
        for st in target_subtasks:
            for focus in st.get("grounding_focus", []) or []:
                if focus not in target_focuses:
                    target_focuses.append(focus)
    else:
        target = next((st for st in subtasks if st.get("subtask_id") == subtask_id), None)
        target_attempts = int((target or {}).get("attempts", 0) or 0)
        target_success = bool((target or {}).get("success", False))
        target_focuses = list((target or {}).get("grounding_focus", []) or [])

    cleaned_grounding = {}
    for focus in target_focuses:
        metric_key = focus_to_metric.get(focus)
        value = grounding.get(metric_key)
        if metric_key and isinstance(value, (int, float)) and not isinstance(value, bool):
            cleaned_grounding[metric_key] = value

    summary = benchmark_log.get("summary", {}) or {}
    cleaned_grounding["actual_steps"] = summary.get("actual_steps")
    cleaned_grounding["target_subtask_attempts"] = target_attempts
    cleaned_grounding["target_subtask_success"] = target_success
    return cleaned_grounding


def _aggregate_metric_summaries(metric_runs: list[dict]) -> dict:
    if not metric_runs:
        return {}

    numeric_keys = set()
    for run in metric_runs:
        for key, value in run.items():
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                numeric_keys.add(key)

    aggregated = {
        "num_runs_with_metrics": len(metric_runs),
    }
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

    numeric_keys = set()
    for item in metric_summaries:
        for key, value in item.items():
            if key.startswith("avg_") and isinstance(value, (int, float)):
                numeric_keys.add(key)

    overall = {
        "num_subtasks": len(per_subtask),
        "num_subtasks_with_metrics": len(metric_summaries),
    }
    for key in sorted(numeric_keys):
        values = [float(item[key]) for item in metric_summaries if isinstance(item.get(key), (int, float))]
        if values:
            normalized_key = key[4:] if key.startswith("avg_") else key
            overall[f"avg_{normalized_key}"] = _safe_round(sum(values) / len(values))
    return overall


def run_xrd_single_subtask_test(
    subtask_id: str,
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps_per_subtask: int = 15,
    xrd_url: str = "http://localhost:8080/static/simulator/xrd_simulator/XRD_simulator.html",
    result_dir: str = get_results_dir("xrd"),
    headless: bool = False,
    with_manual_context: bool = False,
    **agent_kwargs
) -> dict:
    """单子任务测试：快进到该子任务前状态，只测当前一步。S2a 已合并入 S2（开门+关门）。"""
    if subtask_id == "S2a":
        subtask_id = "S2"
    if subtask_id not in XRD_SUBTASK_DEMOS:
        raise ValueError(f"未知 subtask_id: {subtask_id}，可选: {XRD_SUBTASK_IDS}")
    demo = XRD_SUBTASK_DEMOS[subtask_id]
    task_instruction = demo["instruction"]
    if with_manual_context:
        excerpt = load_xrd_manual_excerpt()
        if excerpt:
            task_instruction = excerpt + "\n\n" + task_instruction

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
            page.goto(xrd_url, wait_until="networkidle", timeout=60000)
            time.sleep(5)
            time.sleep(3)
            try:
                page.wait_for_load_state("networkidle", timeout=5000)
            except Exception:
                pass
            time.sleep(2)

            try:
                page.evaluate(f"""
                    () => {{
                        if (typeof window.XRD_BENCHMARK !== 'undefined' && window.XRD_BENCHMARK.episode) {{
                            window.XRD_BENCHMARK.episode.agent_name = '{agent_name}';
                        }}
                    }}
                """)
            except Exception:
                pass

            if subtask_id != "S1":
                try:
                    page.evaluate(f"""
                        () => {{
                            if (typeof window.XRD_fast_forward_to_subtask === 'function') {{
                                window.XRD_fast_forward_to_subtask('{subtask_id}');
                            }}
                        }}
                    """)
                    time.sleep(1)
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
                        logger.info(f"💾 已保存执行前截图: {before_path}")
                    except Exception as e:
                        logger.warning(f"保存执行前截图失败: {e}")

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
                        after_path = os.path.join(episode_dir, f"step_{step_count}_after.png")
                        with open(after_path, "wb") as f:
                            f.write(after_screenshot)
                        logger.info(f"💾 已保存执行后截图: {after_path}")
                    except Exception as e:
                        logger.warning(f"保存执行后截图失败: {e}")

                    try:
                        # S2 合并了开门+关门，需同时满足 S2 和 S2a
                        if subtask_id == "S2":
                            status = page.evaluate("""
                                () => {
                                    if (typeof window.XRD_BENCHMARK === 'undefined' || !window.XRD_BENCHMARK.episode) return null;
                                    const m = window.XRD_BENCHMARK.episode._subtask_map;
                                    return (m.S2 && m.S2.success && m.S2a && m.S2a.success) || null;
                                }
                            """)
                        else:
                            status = page.evaluate(f"""
                                () => {{
                                    if (typeof window.XRD_BENCHMARK === 'undefined' || !window.XRD_BENCHMARK.episode) return null;
                                    const st = window.XRD_BENCHMARK.episode._subtask_map['{subtask_id}'];
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
                log_path = os.path.join(episode_dir, f"subtask_{subtask_id}_log.json")
                with open(log_path, "w", encoding="utf-8") as f:
                    json.dump(benchmark_log, f, indent=2, ensure_ascii=False)
                if not test_success:
                    st_map = {st.get("subtask_id"): st for st in benchmark_log.get("subtasks", [])}
                    if subtask_id == "S2":
                        test_success = (
                            st_map.get("S2", {}).get("success", False)
                            and st_map.get("S2a", {}).get("success", False)
                        )
                    else:
                        test_success = st_map.get(subtask_id, {}).get("success", False)
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


def run_xrd_subtask_multiple_runs(
    subtask_id: str,
    num_runs: int = 10,
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps_per_subtask: int = 15,
    xrd_url: str = "http://localhost:8080/static/simulator/xrd_simulator/XRD_simulator.html",
    result_dir: str = get_results_dir("xrd"),
    headless: bool = False,
    with_manual_context: bool = False,
    **agent_kwargs
) -> dict:
    """对单个子任务运行 num_runs 次，只输出该子任务的成功率日志（不含完整 benchmark_log）。"""
    if subtask_id not in XRD_SUBTASK_DEMOS:
        raise ValueError(f"未知 subtask_id: {subtask_id}，可选: {XRD_SUBTASK_IDS}")
    demo = XRD_SUBTASK_DEMOS[subtask_id]
    runs = []
    for i in range(num_runs):
        logger.info(f"--- 子任务 {subtask_id} 第 {i + 1}/{num_runs} 次 ---")
        r = run_xrd_single_subtask_test(
            subtask_id=subtask_id,
            agent_name=agent_name,
            model=model,
            max_steps_per_subtask=max_steps_per_subtask,
            xrd_url=xrd_url,
            result_dir=result_dir,
            headless=headless,
            with_manual_context=with_manual_context,
            **agent_kwargs,
        )
        run_metrics = _extract_run_metric_summary(r.get("benchmark_log"), subtask_id)
        runs.append({
            "run": i + 1,
            "success": r["success"],
            "episode_dir": r["episode_dir"],
            "metrics": run_metrics,
        })
        ok = "✅" if r["success"] else "❌"
        logger.info(f"{ok} 第 {i + 1} 次: {r['success']}")
    success_count = sum(1 for x in runs if x["success"])
    success_rate = success_count / num_runs if num_runs else 0.0
    metrics_summary = _aggregate_metric_summaries([x.get("metrics", {}) for x in runs if x.get("metrics")])
    summary = {
        "subtask_id": subtask_id,
        "subtask_name": demo["name"],
        "num_runs": num_runs,
        "success_count": success_count,
        "success_rate": round(success_rate, 4),
        "metrics_summary": metrics_summary,
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
    xrd_url: str = "http://localhost:8080/static/simulator/xrd_simulator/XRD_simulator.html",
    result_dir: str = get_results_dir("xrd"),
    headless: bool = False,
    with_manual_context: bool = False,
    subtask_ids: list = None,
    **agent_kwargs
) -> dict:
    """依次对每个子任务运行 num_runs 次，每个子任务只输出该子任务的成功率日志。"""
    if subtask_ids is None:
        subtask_ids = list(XRD_SUBTASK_IDS)
    per_subtask = []
    for sid in subtask_ids:
        if sid not in XRD_SUBTASK_DEMOS:
            continue
        summary = run_xrd_subtask_multiple_runs(
            subtask_id=sid,
            num_runs=num_runs,
            agent_name=agent_name,
            model=model,
            max_steps_per_subtask=max_steps_per_subtask,
            xrd_url=xrd_url,
            result_dir=result_dir,
            headless=headless,
            with_manual_context=with_manual_context,
            **agent_kwargs,
        )
        per_subtask.append(summary)
    all_summary = {
        "num_runs_per_subtask": num_runs,
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
    parser = argparse.ArgumentParser(description="XRD 单子任务 Demo 测试")
    parser.add_argument("--agent", type=str, default="uitars15_v2")
    parser.add_argument("--model", type=str, default=None)
    parser.add_argument("--model_type", type=str, default="doubao")
    parser.add_argument("--temperature", type=float, default=0)
    parser.add_argument("--max_tokens", type=int, default=3000)
    parser.add_argument("--api_key", type=str, default=None)
    parser.add_argument("--api_url", type=str, default=None)
    parser.add_argument("--xrd_url", type=str, default="http://localhost:8080/static/simulator/xrd_simulator/XRD_simulator.html")
    parser.add_argument("--result_dir", type=str, default=get_results_dir("xrd"))
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--with_manual_context", action="store_true")
    parser.add_argument("--subtask", type=str, default=None, help="只运行指定子任务，如 S1,S5,S2a")
    parser.add_argument(
        "--run_all_subtask_demos",
        "--run_all_subtask_demo",
        action="store_true",
        help="依次运行 S1～S8",
    )
    parser.add_argument("--runs", type=int, default=10, help="每个子任务测试次数，默认 10")
    parser.add_argument("--max_steps_subtask", type=int, default=15)
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
        "temperature": args.temperature,
        "max_tokens": args.max_tokens,
        "max_steps_per_subtask": args.max_steps_subtask,
        "xrd_url": args.xrd_url,
        "result_dir": args.result_dir,
        "headless": args.headless,
        "with_manual_context": args.with_manual_context,
    }

    if args.subtask:
        sid = args.subtask.strip().upper()
        if sid == "S2A":
            sid = "S2a"
        run_xrd_subtask_multiple_runs(subtask_id=sid, num_runs=args.runs, **common)
    elif args.run_all_subtask_demos:
        run_all_subtask_demos(num_runs=args.runs, **common)
    else:
        parser.print_help()
        print("\n请指定 --subtask S5 或 --run_all_subtask_demos")


if __name__ == "__main__":
    main()
