"""
APT 单子任务 Demo 测试脚本

兼容旧的 `--step / --all` 用法，也支持统一后的 `--subtask / --run_all_subtask_demos`。
"""

import argparse
import csv
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if "DOUBAO_API_KEY" not in os.environ:
    os.environ["DOUBAO_API_KEY"] = "sk-osRZauVvCV9I2XqiLXzlFe4Til4BIDQKETG8u68RKRchkSDd"
if "DOUBAO_API_URL" not in os.environ:
    _u = "http://34.13.73.248:3888/v1".rstrip("/")
    os.environ["DOUBAO_API_URL"] = (
        _u + "/chat/completions" if not _u.endswith("chat/completions") else _u
    )

from benchmarks.paths import get_results_dir
from benchmarks.utils import prefer_gui_owl_agent_when_model_name
from test_apt_agent_lightweight import (
    OBSERVATION_MODE_SCREENSHOT,
    logger,
    run_apt_test_lightweight,
)


APT_SUBTASK_DEMOS = {
    "S1": {"step": 1, "name": "SelectSample", "instruction": "从 sample 下拉框中选择 steel（volt）。"},
    "S2": {"step": 2, "name": "AlignSample", "instruction": "点击 ALIGN SAMPLE 按钮并完成样品对准。"},
    "S3": {"step": 3, "name": "SelectTemperature", "instruction": "从 SPECIMEN TEMPERATURE 中选择 75k。"},
    "S4": {"step": 4, "name": "SelectDetectionRate", "instruction": "从 DETECTION RATE 中选择 0.5%。"},
    "S5": {"step": 5, "name": "SelectPulseFreq", "instruction": "从 VOLTAGE PULSE FREQUENCY 中选择 200 kHz。"},
    "S6": {"step": 6, "name": "SelectPulseEnergy", "instruction": "从 VOLTAGE PULSE FRACTION 中选择 10%。"},
    "S7": {"step": 7, "name": "StartExperiment", "instruction": "点击 START 按钮启动实验。"},
    "S8": {"step": 8, "name": "StopExperiment", "instruction": "等待实验过程后再次点击按钮停止实验。"},
    "S9": {"step": 9, "name": "Reconstruct", "instruction": "点击 RECONSTRUCT 进入重建视图。"},
    "S10": {"step": 10, "name": "SetICF", "instruction": "在 ICF 下拉框中选择参数 1.4。"},
    "S11": {"step": 11, "name": "SetKFactor", "instruction": "在 K Factor 下拉框中选择参数 3.0。"},
    "S12": {"step": 12, "name": "Finish", "instruction": "点击完成按钮，并在弹窗中点击关闭按钮。"},
}
APT_SUBTASK_IDS = list(APT_SUBTASK_DEMOS.keys())


def _safe_round(value, digits: int = 4):
    if value is None:
        return None
    try:
        return round(float(value), digits)
    except Exception:
        return value


def _normalize_subtask_id(value: str) -> str:
    raw = str(value).strip().upper()
    if raw.isdigit():
        raw = f"S{int(raw)}"
    elif len(raw) >= 2 and raw[0] in ("A", "S") and raw[1:].isdigit():
        raw = f"S{int(raw[1:])}"
    if raw not in APT_SUBTASK_DEMOS:
        raise ValueError(f"未知 subtask/step: {value}")
    return raw


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


def run_apt_single_subtask_test(
    subtask_id: str,
    agent_name: str = "uitars15_v2",
    model: str | None = None,
    max_steps_per_subtask: int = 10,
    apt_url: str = "http://localhost:8080/static/simulator/apt_simulator/APT_simulator.html",
    result_dir: str = get_results_dir("apt"),
    headless: bool = False,
    run_index: int | None = None,
    observation_mode: str = OBSERVATION_MODE_SCREENSHOT,
    **agent_kwargs,
) -> dict:
    subtask_id = _normalize_subtask_id(subtask_id)
    demo = APT_SUBTASK_DEMOS[subtask_id]
    logger.info(f"单子任务测试 - 子任务: {subtask_id} {demo['name']}")
    out = run_apt_test_lightweight(
        agent_name=agent_name,
        model=model,
        max_steps=max_steps_per_subtask,
        apt_url=apt_url,
        result_dir=result_dir,
        headless=headless,
        observation_mode=observation_mode,
        stop_after_step=demo["step"],
        step_accuracy_run_index=run_index,
        **agent_kwargs,
    )
    success = out.get("step_success")
    if success is None:
        success = out.get("success", False)
    return {
        "subtask_id": subtask_id,
        "subtask_name": demo["name"],
        "success": bool(success),
        "benchmark_log": out.get("benchmark_log"),
        "episode_dir": out.get("episode_dir"),
    }


def run_apt_subtask_multiple_runs(
    subtask_id: str,
    num_runs: int = 10,
    agent_name: str = "uitars15_v2",
    model: str | None = None,
    max_steps_per_subtask: int = 10,
    apt_url: str = "http://localhost:8080/static/simulator/apt_simulator/APT_simulator.html",
    result_dir: str = get_results_dir("apt"),
    headless: bool = False,
    observation_mode: str = OBSERVATION_MODE_SCREENSHOT,
    **agent_kwargs,
) -> dict:
    subtask_id = _normalize_subtask_id(subtask_id)
    demo = APT_SUBTASK_DEMOS[subtask_id]
    runs = []
    metric_runs = []
    for i in range(num_runs):
        logger.info(f"--- 子任务 {subtask_id} 第 {i + 1}/{num_runs} 次 ---")
        r = run_apt_single_subtask_test(
            subtask_id=subtask_id,
            agent_name=agent_name,
            model=model,
            max_steps_per_subtask=max_steps_per_subtask,
            apt_url=apt_url,
            result_dir=result_dir,
            headless=headless,
            run_index=i + 1,
            observation_mode=observation_mode,
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
        logger.info(f"{'✅' if r['success'] else '❌'} 第 {i + 1} 次: {r['success']} | metrics={run_metrics or '{}'}")

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
    model: str | None = None,
    max_steps_per_subtask: int = 10,
    apt_url: str = "http://localhost:8080/static/simulator/apt_simulator/APT_simulator.html",
    result_dir: str = get_results_dir("apt"),
    headless: bool = False,
    subtask_ids: list | None = None,
    output_csv: str | None = None,
    observation_mode: str = OBSERVATION_MODE_SCREENSHOT,
    **agent_kwargs,
) -> dict:
    if subtask_ids is None:
        subtask_ids = list(APT_SUBTASK_IDS)
    per_subtask = []
    for sid in subtask_ids:
        summary = run_apt_subtask_multiple_runs(
            subtask_id=sid,
            num_runs=num_runs,
            agent_name=agent_name,
            model=model,
            max_steps_per_subtask=max_steps_per_subtask,
            apt_url=apt_url,
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
        result_dir,
        f"subtask_demos_runs_{num_runs}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
    )
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(all_summary, f, indent=2, ensure_ascii=False)

    logger.info("=" * 60)
    logger.info("APT 子任务成功率汇总")
    logger.info("=" * 60)
    for s in per_subtask:
        logger.info(f"  {s['subtask_id']} {s['subtask_name']}: {s['success_count']}/{s['num_runs']} = {s['success_rate']:.2%}")
        if s.get("metrics_summary"):
            logger.info(f"    metrics: {json.dumps(s['metrics_summary'], ensure_ascii=False)}")
    if all_summary.get("overall_metrics_summary"):
        logger.info(f"整体 metrics: {json.dumps(all_summary['overall_metrics_summary'], ensure_ascii=False)}")
    logger.info(f"已保存汇总: {summary_path}")

    if output_csv:
        d = os.path.dirname(output_csv)
        if d:
            os.makedirs(d, exist_ok=True)
        with open(output_csv, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.writer(f)
            w.writerow(["benchmark", "subtask_id", "label", "success", "total", "success_rate_percent"])
            for s in per_subtask:
                w.writerow(["APT", s["subtask_id"], s["subtask_name"], s["success_count"], s["num_runs"], f"{s['success_rate'] * 100:.1f}"])
        logger.info(f"已导出汇总 CSV: {output_csv}")

    return all_summary


def main():
    parser = argparse.ArgumentParser(description="APT 单子任务 Demo 测试")
    parser.add_argument("--subtask", type=str, default=None, help="只运行指定子任务，如 S1、S8 或数字 1、8")
    parser.add_argument(
        "--run_all_subtask_demos",
        "--run_all_subtask_demo",
        action="store_true",
        help="依次运行 S1～S12",
    )
    parser.add_argument("--step", type=str, default=None, metavar="1-12 / A2 / S2")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--runs", type=int, default=10)
    parser.add_argument("--apt_url", type=str, default="http://localhost:8080/static/simulator/apt_simulator/APT_simulator.html")
    parser.add_argument("--result_dir", type=str, default=get_results_dir("apt"))
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--agent", type=str, default="uitars15_v2")
    parser.add_argument(
        "--model_type",
        type=str,
        default="doubao",
        help="模型坐标类型；claude_1440 表示模型输出 1440x810，执行时映射到 1920x1080",
    )
    parser.add_argument("--model", type=str, default="doubao-seed-1-6-vision-250815")
    parser.add_argument("--api_key", type=str, default=None)
    parser.add_argument("--api_url", type=str, default=None)
    parser.add_argument("--max_steps_subtask", type=int, default=10)
    parser.add_argument("--max_steps", type=int, default=None, help="兼容旧参数，等价于 --max_steps_subtask")
    parser.add_argument("--output_csv", type=str, default=None)
    parser.add_argument("--observation_mode", choices=["screenshot", "screenshot_720p", "a11y_tree"], default="screenshot")
    args = parser.parse_args()
    args.agent = prefer_gui_owl_agent_when_model_name(args.agent, args.model)

    from benchmarks.vlaa_gui_support import configure_benchmark_subtask_env
    configure_benchmark_subtask_env(
        args.agent, model=args.model, api_url=args.api_url, api_key=args.api_key
    )

    target_subtask = None
    if args.subtask:
        target_subtask = _normalize_subtask_id(args.subtask)
    elif args.step:
        target_subtask = _normalize_subtask_id(args.step)

    run_all = args.run_all_subtask_demos or args.all
    if not target_subtask and not run_all:
        parser.error("请指定 --subtask S1 / --step 1 或 --run_all_subtask_demos / --all")

    max_steps_subtask = args.max_steps if args.max_steps is not None else args.max_steps_subtask
    common = {
        "agent_name": args.agent,
        "model": args.model,
        "model_type": args.model_type,
        "max_steps_per_subtask": max_steps_subtask,
        "apt_url": args.apt_url,
        "result_dir": args.result_dir,
        "headless": args.headless,
        "observation_mode": args.observation_mode,
    }

    if target_subtask:
        run_apt_subtask_multiple_runs(subtask_id=target_subtask, num_runs=args.runs, **common)
    else:
        run_all_subtask_demos(num_runs=args.runs, output_csv=args.output_csv, **common)


if __name__ == "__main__":
    main()

