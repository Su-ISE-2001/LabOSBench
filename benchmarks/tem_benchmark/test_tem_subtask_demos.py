# -*- coding: utf-8 -*-
"""
TEM 单子任务 Demo 测试脚本
对每个子任务（T1～T10）单独测试：快进到该步前状态，只测当前一步。
默认每个子任务跑 10 次，输出仅含该子任务的成功率日志。

用法:
  python test_tem_subtask_demos.py --subtask T5           # T5 跑 10 次
  python test_tem_subtask_demos.py --subtask T5 --runs 5
  python test_tem_subtask_demos.py --run_all_subtask_demos  # T1～T10 各跑 10 次
"""

import argparse
import re
import csv
from datetime import datetime
import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BENCHMARKS = os.path.dirname(_SCRIPT_DIR)
ROOT = os.path.dirname(_BENCHMARKS)
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "OSWorld-main"))
sys.path.insert(0, _BENCHMARKS)
from benchmarks.paths import get_results_dir
from benchmarks.utils import prefer_gui_owl_agent_when_model_name

if "DOUBAO_API_KEY" not in os.environ:
    os.environ["DOUBAO_API_KEY"] = "sk-ui-tars-asd1231hascx12"
if "DOUBAO_API_URL" not in os.environ:
    os.environ["DOUBAO_API_URL"] = "http://180.184.148.133:11149/v1/chat/completions"

from test_tem_agent_lightweight import run_tem_test_lightweight, TEM_SUBTASK_INSTRUCTIONS

# 子任务 ID：T1～T10（与 LFM/XRD/FIB 的 L1/S1/F1 格式一致）
TEM_SUBTASK_IDS = [f"T{i}" for i in range(1, 11)]
SUBTASK_LABELS = [TEM_SUBTASK_INSTRUCTIONS[i] for i in range(10)]


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


def _subtask_id_to_num(subtask_id: str) -> int:
    """T1 -> 1, T2 -> 2, ..., T10 -> 10"""
    m = re.match(r"^T(\d+)$", str(subtask_id).strip().upper())
    if m:
        n = int(m.group(1))
        if 1 <= n <= 10:
            return n
    raise ValueError(f"无效子任务 ID: {subtask_id}，应为 T1～T10")


def run_one_subtask_n_times(subtask_id: str, runs: int, **kwargs) -> list[dict]:
    """对 subtask_id（T1～T10）运行 runs 次，返回每次运行的详细结果。"""
    subtask_num = _subtask_id_to_num(subtask_id)
    results: list[dict] = []
    for i in range(runs):
        print("\n" + "=" * 60)
        print("  [TEM] %s 第 %d/%d 次运行" % (subtask_id, i + 1, runs))
        print("=" * 60)
        out = run_tem_test_lightweight(
            stop_after_subtask=subtask_num,
            subtask_accuracy_run_index=i + 1,
            **kwargs,
        )
        success = out.get("subtask_success")
        metrics = _extract_run_metric_summary(out.get("benchmark_log"), subtask_id)
        if success is None:
            print("  本 run 未对 %s 做出判定，计为失败" % subtask_id)
            results.append({
                "run": i + 1,
                "success": False,
                "episode_dir": out.get("episode_dir"),
                "metrics": metrics,
            })
        else:
            results.append({
                "run": i + 1,
                "success": bool(success),
                "episode_dir": out.get("episode_dir"),
                "metrics": metrics,
            })
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="TEM 单子任务 Demo 测试")
    parser.add_argument(
        "--subtask",
        type=str,
        default=None,
        choices=TEM_SUBTASK_IDS,
        metavar="T1-T10",
        help="子任务 ID，如 T1、T5、T10",
    )
    parser.add_argument(
        "--run_all_subtask_demos",
        "--run_all_subtask_demo",
        action="store_true",
        help="T1～T10 各跑指定次数",
    )
    parser.add_argument("--runs", type=int, default=10, help="每子任务运行次数，默认 10")
    parser.add_argument(
        "--tem-url",
        type=str,
        default="http://localhost:8080/static/simulator/tem_simulator/TEM_simulator.html",
        help="TEM 模拟器 URL",
    )
    parser.add_argument("--result-dir", type=str, default=get_results_dir("tem"))
    parser.add_argument("--headless", action="store_true")
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="模型名，默认 ByteDance-Seed/UI-TARS-1.5-7B（与 LFM/XRD/FIB/SPM 一致）",
    )
    parser.add_argument(
        "--max-steps",
        type=int,
        default=10,
        metavar="N",
        help="每子任务最大尝试数，默认 10",
    )
    parser.add_argument("--agent", type=str, default="uitars15_v2", help="Agent 名称，如 openai_compat_chat")
    parser.add_argument("--model_type", type=str, default="doubao", help="claude_1440：1440x810 坐标后处理到 1920x1080")
    parser.add_argument("--api-key", type=str, default=None, help="覆盖 API Key（同步 DOUBAO/GUI_OWL）")
    parser.add_argument("--api-url", type=str, default=None, help="覆盖 API URL（同步 DOUBAO/GUI_OWL）")
    parser.add_argument(
        "--output-csv",
        type=str,
        default=None,
        help="--run_all_subtask_demos 时写入汇总 CSV 的路径",
    )
    args = parser.parse_args()
    args.agent = prefer_gui_owl_agent_when_model_name(args.agent, args.model)

    from benchmarks.vlaa_gui_support import configure_benchmark_subtask_env
    configure_benchmark_subtask_env(
        args.agent,
        model=args.model,
        api_url=getattr(args, "api_url", None) or getattr(args, "api-url", None),
        api_key=getattr(args, "api_key", None) or getattr(args, "api-key", None),
    )

    if not args.subtask and not args.run_all_subtask_demos:
        parser.error("必须指定 --subtask T1～T10 或 --run_all_subtask_demos")

    common = {
        "agent_name": args.agent,
        "tem_url": args.tem_url,
        "result_dir": args.result_dir,
        "headless": args.headless,
        "model": args.model,
        "model_type": args.model_type,
        "max_steps": args.max_steps,
    }

    if args.subtask:
        subtask_id = args.subtask
        results = run_one_subtask_n_times(subtask_id, args.runs, **common)
        ok = sum(1 for r in results if r["success"])
        total = len(results)
        rate = 100.0 * ok / total if total else 0.0
        metrics_summary = _aggregate_metric_summaries([r.get("metrics", {}) for r in results if r.get("metrics")])
        print("\n" + "=" * 60)
        print("[TEM] %s: %d/%d 成功 = %.1f%%" % (subtask_id, ok, total, rate))
        if metrics_summary:
            print(
                "       metrics: widget=%s text=%s state=%s attempts=%s"
                % (
                    metrics_summary.get("avg_widget_grounding_accuracy"),
                    metrics_summary.get("avg_text_grounding_accuracy"),
                    metrics_summary.get("avg_state_grounding_accuracy"),
                    metrics_summary.get("avg_target_subtask_attempts"),
                )
            )
        print("=" * 60)
        return

    summary: list[dict] = []
    for subtask_id in TEM_SUBTASK_IDS:
        subtask_num = _subtask_id_to_num(subtask_id)
        print("\n\n>>> 测试 %s，共 %d 次" % (subtask_id, args.runs))
        print("    ", SUBTASK_LABELS[subtask_num - 1])
        results = run_one_subtask_n_times(subtask_id, args.runs, **common)
        ok = sum(1 for r in results if r["success"])
        total = len(results)
        rate = 100.0 * ok / total if total else 0.0
        summary.append({
            "subtask_id": subtask_id,
            "label": SUBTASK_LABELS[subtask_num - 1],
            "success_count": ok,
            "total": total,
            "success_rate": round(rate / 100.0, 4),
            "success_rate_percent": round(rate, 1),
            "metrics_summary": _aggregate_metric_summaries([r.get("metrics", {}) for r in results if r.get("metrics")]),
            "runs": results,
        })

    print("\n\n" + "=" * 60)
    print("各子任务成功概率（成功/总数 = 成功率）")
    print("=" * 60)
    for item in summary:
        print(
            "  %s 成功率: %d/%d = %5.1f%%  %s"
            % (item["subtask_id"], item["success_count"], item["total"], item["success_rate_percent"], item["label"])
        )
        metrics = item.get("metrics_summary", {})
        if metrics:
            print(
                "    metrics: widget=%s text=%s state=%s attempts=%s"
                % (
                    metrics.get("avg_widget_grounding_accuracy"),
                    metrics.get("avg_text_grounding_accuracy"),
                    metrics.get("avg_state_grounding_accuracy"),
                    metrics.get("avg_target_subtask_attempts"),
                )
            )
    print("=" * 60)

    os.makedirs(args.result_dir, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    json_path = os.path.abspath(os.path.join(args.result_dir, "tem_subtask_demos_%s.json" % ts))
    json_summary = {
        "num_runs_per_subtask": args.runs,
        "subtasks": summary,
        "overall_metrics_summary": _aggregate_overall_metric_summary(summary),
    }
    with open(json_path, "w", encoding="utf-8") as f:
        import json
        json.dump(json_summary, f, indent=2, ensure_ascii=False)
    csv_path = (
        os.path.abspath(os.path.join(args.result_dir, "tem_subtask_demos_%s.csv" % ts))
        if not args.output_csv
        else args.output_csv
    )
    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow([
            "subtask", "label", "success", "total", "success_rate_percent",
            "avg_widget_grounding_accuracy", "avg_text_grounding_accuracy", "avg_state_grounding_accuracy",
            "avg_target_subtask_attempts"
        ])
        for item in summary:
            metrics = item.get("metrics_summary", {})
            w.writerow([
                item["subtask_id"],
                item["label"],
                item["success_count"],
                item["total"],
                "%.1f" % item["success_rate_percent"],
                metrics.get("avg_widget_grounding_accuracy"),
                metrics.get("avg_text_grounding_accuracy"),
                metrics.get("avg_state_grounding_accuracy"),
                metrics.get("avg_target_subtask_attempts"),
            ])

    overall_metrics = json_summary.get("overall_metrics_summary", {})
    if overall_metrics:
        print("总体 metric 均值:")
        print(
            "  widget=%s text=%s state=%s attempts=%s"
            % (
                overall_metrics.get("avg_widget_grounding_accuracy"),
                overall_metrics.get("avg_text_grounding_accuracy"),
                overall_metrics.get("avg_state_grounding_accuracy"),
                overall_metrics.get("avg_target_subtask_attempts"),
            )
        )

    print("\nJSON 已写入:", json_path)
    print("CSV 已写入:", csv_path)


if __name__ == "__main__":
    main()
