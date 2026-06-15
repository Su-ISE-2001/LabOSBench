import argparse
import base64
import json
import os
import re
import sys
from datetime import datetime
from typing import Any, Dict, List, Tuple

from playwright.sync_api import sync_playwright

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "OSWorld"))
sys.path.insert(0, SCRIPT_DIR)
for _bench_dir in (
    "fib_benchmark",
    "sem_benchmark",
    "eds_benchmark",
    "lfm_benchmark",
    "spm_benchmark",
    "tem_benchmark",
    "xrd_benchmark",
    "apt_benchmark",
):
    sys.path.insert(0, os.path.join(SCRIPT_DIR, _bench_dir))

from benchmarks.paths import get_results_dir
from fib_benchmark.test_fib_agent_lightweight import (
    OBSERVATION_MODE_SCREENSHOT,
    execute_action_on_page,
    logger,
    page_to_observation,
)
from fib_benchmark.test_fib_agent_lightweight import (
    infer_current_fib_subtask,
    record_fib_agent_action,
    extract_benchmark_log as extract_fib_benchmark_log,
)
from fib_benchmark.test_fib_subtask_demos import FIB_SUBTASK_DEMOS
from sem_benchmark.test_sem_agent_lightweight import (
    extract_benchmark_log as extract_sem_benchmark_log,
)
from eds_benchmark.test_eds_agent_lightweight import (
    infer_current_eds_subtask,
    record_eds_agent_action,
    extract_benchmark_log as extract_eds_benchmark_log,
)
from lfm_benchmark.test_lfm_subtask_demos import LFM_SUBTASK_DEMOS
from lfm_benchmark.test_lfm_agent_lightweight import (
    infer_current_lfm_subtask,
    record_lfm_agent_action,
    extract_benchmark_log as extract_lfm_benchmark_log,
)
from spm_benchmark.test_spm_subtask_demos import SPM_SUBTASK_DEMOS
from spm_benchmark.test_spm_agent_lightweight import (
    record_spm_agent_action,
    extract_benchmark_log as extract_spm_benchmark_log,
)
from eds_benchmark.test_eds_subtask_demos import EDS_SUBTASK_DEMOS
from xrd_benchmark.test_xrd_subtask_demos import XRD_SUBTASK_DEMOS
from xrd_benchmark.test_xrd_agent_lightweight import (
    extract_benchmark_log as extract_xrd_benchmark_log,
)
from apt_benchmark.test_apt_subtask_demos import APT_SUBTASK_DEMOS
from apt_benchmark.test_apt_agent_lightweight import (
    infer_current_apt_subtask,
    record_apt_agent_action,
    extract_benchmark_log as extract_apt_benchmark_log,
)
from sem_benchmark.test_sem_single_subtask import (
    SUBTASKS as SEM_SUBTASKS,
    SUBTASK_INSTRUCTIONS as SEM_SUBTASK_INSTRUCTIONS,
    _sem_url_with_mosaic_roi,
    get_sem_instruction,
)
from tem_benchmark.test_tem_subtask_demos import TEM_SUBTASK_IDS
from tem_benchmark.test_tem_agent_lightweight import TEM_SUBTASK_INSTRUCTIONS
from tem_benchmark.test_tem_agent_lightweight import (
    get_tem_state,
    is_subtask_expected_state_reached,
)
from mm_agents.os_symphony.agents.os_aci import OSACI
from mm_agents.os_symphony.agents.os_symphony import OSSymphony
from openai import OpenAI
from mm_agents.coact.cua_agent import (
    PROMPT_TEMPLATE as COACT_PROMPT_TEMPLATE,
    _cua_to_pyautogui,
    _to_input_items,
)


INSTRUMENT_ALIASES = ("fib", "sem", "eds", "lfm", "spm", "tem", "xrd", "apt")
DEFAULT_URLS = {
    "fib": "http://localhost:8080/static/simulator/fib_simulator/FIB_simulator.html",
    "sem": "http://localhost:8080/static/simulator/sem_simulator/SEM_simulator.html",
    "eds": "http://localhost:8080/static/simulator/eds_simulator/EDS_simulator.html",
    "lfm": "http://localhost:8080/static/simulator/lm_simulator/LM_simulator.html",
    "spm": "http://localhost:8080/static/simulator/spm_simulator/SPM_simulator.html",
    "tem": "http://localhost:8080/static/simulator/tem_simulator/TEM_simulator.html",
    "xrd": "http://localhost:8080/static/simulator/xrd_simulator/XRD_simulator.html",
    "apt": "http://localhost:8080/static/simulator/apt_simulator/APT_simulator.html",
}
RESULT_KEYS = {
    "fib": "fib",
    "sem": "sem_single",
    "eds": "eds",
    "lfm": "lfm",
    "spm": "spm",
    "tem": "tem",
    "xrd": "xrd",
    "apt": "apt",
}


class OSSymphonyWebAdapter:
    def __init__(self, max_steps: int, os_symphony: OSSymphony, episode_dir: str):
        self.max_steps = max_steps
        self.os_symphony = os_symphony
        self.step_idx = 0
        self.last_info: Dict[str, Any] = {}
        self.os_symphony.reset(result_dir=episode_dir)

    def predict(self, instruction: str, observation: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
        is_last_step = self.step_idx >= self.max_steps - 1
        info, actions = self.os_symphony.predict(
            instruction=instruction,
            observation=observation,
            is_last_step=is_last_step,
        )
        self.step_idx += 1
        self.last_info = info or {}
        return self.last_info, actions or ["WAIT"]


class CoactBaselineWebAdapter:
    """Route-B adapter: Coact baseline (computer-use-preview + o4-mini upper layer in original design)."""

    def __init__(self, args):
        self.args = args
        self.client = OpenAI(base_url=args.api_url, api_key=args.api_key)
        self.history_inputs: List[Dict[str, Any]] = []
        self.response = None
        self.pending_call_id: str | None = None
        self.total_cost = 0.0

    def _call_responses(self, history_inputs: List[Dict[str, Any]]) -> Tuple[Any, float]:
        response = self.client.responses.create(
            model=self.args.model,
            tools=[{
                "type": "computer_use_preview",
                "display_width": self.args.viewport_width,
                "display_height": self.args.viewport_height,
                "environment": "linux",
            }],
            input=history_inputs,
            reasoning={"summary": "concise"},
            tool_choice="required",
            truncation="auto",
        )
        # Cost fields may be absent on some gateways.
        cost = 0.0
        return response, cost

    def _extract_text_message(self, item: Any) -> str:
        if isinstance(item, dict):
            content = item.get("content", [])
        else:
            content = getattr(item, "content", []) or []
        texts: List[str] = []
        for c in content:
            if isinstance(c, dict):
                t = c.get("text")
                if isinstance(t, str):
                    texts.append(t)
            else:
                t = getattr(c, "text", None)
                if isinstance(t, str):
                    texts.append(t)
        return "\n".join(texts).strip()

    def predict(self, instruction: str, observation: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
        screenshot = observation.get("screenshot", b"") or b""
        screenshot_b64 = base64.b64encode(screenshot).decode("utf-8") if screenshot else ""

        if self.response is None:
            self.history_inputs = [{
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": COACT_PROMPT_TEMPLATE.format(
                            instruction=instruction,
                            CLIENT_PASSWORD=self.args.client_password,
                        ),
                    },
                    {"type": "input_image", "image_url": f"data:image/png;base64,{screenshot_b64}"},
                ],
            }]
        else:
            self.history_inputs += _to_input_items(self.response.output)
            if self.pending_call_id:
                self.history_inputs += [{
                    "type": "computer_call_output",
                    "call_id": self.pending_call_id,
                    "output": {
                        "type": "computer_screenshot",
                        "image_url": f"data:image/png;base64,{screenshot_b64}",
                    },
                }]
                self.pending_call_id = None

        self.response, cost = self._call_responses(self.history_inputs)
        self.total_cost += cost

        calls: List[Dict[str, Any]] = []
        reasoning_parts: List[str] = []
        message_text = ""
        for item in self.response.output:
            typ = item["type"] if isinstance(item, dict) else getattr(item, "type", None)
            if not isinstance(typ, str):
                typ = str(typ).split(".")[-1]
            if typ == "computer_call":
                calls.append(item if isinstance(item, dict) else item.model_dump())
            elif typ == "reasoning":
                if isinstance(item, dict):
                    summary = item.get("summary", [])
                    if summary and isinstance(summary[0], dict):
                        st = summary[0].get("text")
                        if isinstance(st, str) and st:
                            reasoning_parts.append(st)
                else:
                    summary = getattr(item, "summary", [])
                    if summary and hasattr(summary[0], "text"):
                        st = getattr(summary[0], "text", "")
                        if st:
                            reasoning_parts.append(st)
            elif typ == "message":
                message_text = self._extract_text_message(item)

        info = {
            "plan": message_text or ("\n".join(reasoning_parts) if reasoning_parts else ""),
            "exec_code": None,
            "coact_cost_total": self.total_cost,
        }

        if "TERMINATE" in (message_text or ""):
            return info, ["DONE"]
        if "IDK" in (message_text or ""):
            return info, ["FAIL"]
        if calls:
            action_call = calls[0]
            self.pending_call_id = action_call.get("call_id")
            action = _cua_to_pyautogui(action_call.get("action", {}))
            info["exec_code"] = action
            return info, [action]
        return info, ["WAIT"]


def _build_engine_params(
    engine_type: str,
    model: str,
    api_url: str,
    api_key: str,
    temperature: float,
    extra: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    params: Dict[str, Any] = {
        "engine_type": engine_type,
        "model": model,
        "base_url": api_url,
        "api_key": api_key,
        "temperature": temperature,
        "temperture": temperature,
    }
    if extra:
        params.update(extra)
    return params


def _create_os_symphony_adapter(args, episode_dir: str) -> OSSymphonyWebAdapter:
    orchestrator_params = _build_engine_params(
        engine_type=args.engine_type,
        model=args.model,
        api_url=args.api_url,
        api_key=args.api_key,
        temperature=args.temperature,
        extra={"tool_config": args.tool_config, "keep_first_image": False},
    )
    memoryer_params = _build_engine_params(
        engine_type=args.engine_type,
        model=args.model,
        api_url=args.api_url,
        api_key=args.api_key,
        temperature=args.temperature,
    )
    grounder_params = _build_engine_params(
        engine_type=args.ground_engine_type,
        model=args.ground_model,
        api_url=args.ground_api_url,
        api_key=args.ground_api_key,
        temperature=0.0,
        extra={
            "grounding_width": args.grounding_width,
            "grounding_height": args.grounding_height,
            "grounding_smart_resize": False,
        },
    )
    ocr_params = _build_engine_params(
        engine_type=args.ground_engine_type,
        model=args.ground_model,
        api_url=args.ground_api_url,
        api_key=args.ground_api_key,
        temperature=0.0,
    )
    coder_params = _build_engine_params(
        engine_type=args.engine_type,
        model=args.model,
        api_url=args.api_url,
        api_key=args.api_key,
        temperature=args.temperature,
        extra={"budget": 3},
    )
    searcher_params = _build_engine_params(
        engine_type=args.engine_type,
        model=args.model,
        api_url=args.api_url,
        api_key=args.api_key,
        temperature=args.temperature,
        extra={"budget": 3, "type": "vlm", "engine": "google"},
    )

    os_aci = OSACI(
        env=None,
        search_env=None,
        platform="linux",
        client_password=args.client_password,
        engine_params_for_ocr=ocr_params,
        engine_params_for_grounder=grounder_params,
        engine_params_for_coder=coder_params,
        engine_params_for_searcher=searcher_params,
        screen_width=args.viewport_width,
        screen_height=args.viewport_height,
    )
    os_symphony = OSSymphony(
        engine_params_for_orchestrator=orchestrator_params,
        engine_params_for_memoryer=memoryer_params,
        os_aci=os_aci,
        platform="linux",
        client_password=args.client_password,
        max_trajectory_length=8,
        enable_reflection=not args.disable_reflection,
    )
    return OSSymphonyWebAdapter(args.max_steps_subtask, os_symphony, episode_dir)


def _create_agent_adapter(args, episode_dir: str):
    if args.backend == "coact_baseline":
        return CoactBaselineWebAdapter(args)
    return _create_os_symphony_adapter(args, episode_dir)


def _sanitize_action(action: Any) -> Any:
    if not isinstance(action, str):
        return action
    code = action
    # Make drag regex in shared executor more tolerant by removing button arg
    code = re.sub(r"(pyautogui\.dragTo\([^)]*?),\s*button\s*=\s*['\"][^'\"]+['\"]\s*\)", r"\1)", code)
    # Convert clicks=2 click form into doubleClick for deterministic handling
    dc = re.search(
        r"pyautogui\.click\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*clicks\s*=\s*2(?:\s*,[^)]*)?\)",
        code,
    )
    if dc:
        x, y = dc.group(1), dc.group(2)
        code = re.sub(r"pyautogui\.click\(\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*clicks\s*=\s*2(?:\s*,[^)]*)?\)", f"pyautogui.doubleClick({x}, {y})", code)
    return code


def _exec_coord_kwargs(args) -> Dict[str, Any]:
    if args.coord_transform == "scale_1440_to_1920":
        # Use shared executor's claude_1440 path:
        # x_click = x_model * 1920 / 1440, y_click = y_model * 1080 / 810
        return {"no_coord_convert": False, "model_type": "claude_1440"}
    if args.coord_transform == "raw":
        return {"no_coord_convert": True, "model_type": args.model_type}
    # legacy branch keeps prior behavior toggle
    return {"no_coord_convert": not args.enable_coord_convert, "model_type": args.model_type}


def _instrument_subtasks(instrument: str) -> List[str]:
    if instrument == "fib":
        return list(FIB_SUBTASK_DEMOS.keys())
    if instrument == "sem":
        return list(SEM_SUBTASKS.keys())
    if instrument == "eds":
        return list(EDS_SUBTASK_DEMOS.keys())
    if instrument == "lfm":
        return list(LFM_SUBTASK_DEMOS.keys())
    if instrument == "spm":
        return list(SPM_SUBTASK_DEMOS.keys())
    if instrument == "tem":
        return list(TEM_SUBTASK_IDS)
    if instrument == "xrd":
        return list(XRD_SUBTASK_DEMOS.keys())
    if instrument == "apt":
        return list(APT_SUBTASK_DEMOS.keys())
    raise ValueError(f"Unsupported instrument: {instrument}")


def _instruction_for(instrument: str, subtask_id: str) -> str:
    if instrument == "fib":
        return FIB_SUBTASK_DEMOS[subtask_id]["instruction"]
    if instrument == "sem":
        base = SEM_SUBTASK_INSTRUCTIONS.get(
            subtask_id, f"请完成子任务 {SEM_SUBTASKS.get(subtask_id, subtask_id)}。"
        )
        return get_sem_instruction(base)
    if instrument == "eds":
        return EDS_SUBTASK_DEMOS[subtask_id]["instruction"]
    if instrument == "lfm":
        return LFM_SUBTASK_DEMOS[subtask_id]["instruction"]
    if instrument == "spm":
        return SPM_SUBTASK_DEMOS[subtask_id]["instruction"]
    if instrument == "tem":
        idx = int(subtask_id[1:]) - 1
        return TEM_SUBTASK_INSTRUCTIONS[idx]
    if instrument == "xrd":
        return XRD_SUBTASK_DEMOS[subtask_id]["instruction"]
    if instrument == "apt":
        return APT_SUBTASK_DEMOS[subtask_id]["instruction"]
    raise ValueError(f"Unsupported instrument: {instrument}")


def _url_for(instrument: str, subtask_id: str, args) -> str:
    base = DEFAULT_URLS[instrument]
    if instrument == "sem" and subtask_id == "S12":
        return _sem_url_with_mosaic_roi(base)
    return base


def _parse_subtasks(input_value: str | None, valid_ids: List[str]) -> List[str]:
    if not input_value:
        return list(valid_ids)
    wanted = [x.strip().upper() for x in input_value.split(",") if x.strip()]
    out = []
    for sid in wanted:
        if sid not in valid_ids:
            raise ValueError(f"未知子任务 {sid}，可选: {', '.join(valid_ids)}")
        out.append(sid)
    return out


def _safe_round(value, digits: int = 4):
    if value is None:
        return None
    try:
        return round(float(value), digits)
    except Exception:
        return value


def _extract_run_metric_summary(benchmark_log: Dict[str, Any] | None, subtask_id: str) -> Dict[str, Any]:
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
    cleaned = {}
    for focus in (target or {}).get("grounding_focus", []) or []:
        metric_key = focus_to_metric.get(focus)
        value = grounding.get(metric_key)
        if metric_key and isinstance(value, (int, float)) and not isinstance(value, bool):
            cleaned[metric_key] = value

    summary = benchmark_log.get("summary", {}) or {}
    cleaned["actual_steps"] = summary.get("actual_steps")
    cleaned["target_subtask_attempts"] = int((target or {}).get("attempts", 0) or 0)
    cleaned["target_subtask_success"] = bool((target or {}).get("success", False))
    return cleaned


def _aggregate_metric_summaries(metric_runs: List[Dict[str, Any]]) -> Dict[str, Any]:
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


def _aggregate_overall_metric_summary(per_subtask: List[Dict[str, Any]]) -> Dict[str, Any]:
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


def _subtask_name_for(instrument: str, subtask_id: str) -> str:
    if instrument == "fib":
        return FIB_SUBTASK_DEMOS[subtask_id]["name"]
    if instrument == "sem":
        return SEM_SUBTASKS.get(subtask_id, subtask_id)
    if instrument == "eds":
        return EDS_SUBTASK_DEMOS[subtask_id]["name"]
    if instrument == "lfm":
        return LFM_SUBTASK_DEMOS[subtask_id]["name"]
    if instrument == "spm":
        return SPM_SUBTASK_DEMOS[subtask_id]["name"]
    if instrument == "tem":
        idx = int(subtask_id[1:]) - 1
        return TEM_SUBTASK_INSTRUCTIONS[idx]
    if instrument == "xrd":
        return XRD_SUBTASK_DEMOS[subtask_id]["name"]
    if instrument == "apt":
        return APT_SUBTASK_DEMOS[subtask_id]["name"]
    return subtask_id


def _prepare_subtask_start_state(instrument: str, page, subtask_id: str, agent_name: str) -> None:
    # Keep benchmark episode metadata aligned with original scripts.
    try:
        benchmark_var = {
            "fib": "FIB_BENCHMARK",
            "sem": "SEM_BENCHMARK",
            "eds": "EDS_BENCHMARK",
            "lfm": "LFM_BENCHMARK",
            "spm": "SPM_BENCHMARK",
            "xrd": "XRD_BENCHMARK",
            "apt": "APT_BENCHMARK",
        }.get(instrument)
        if benchmark_var:
            page.evaluate(
                f"""(name) => {{
                    if (typeof window.{benchmark_var} !== 'undefined' && window.{benchmark_var}.episode) {{
                        window.{benchmark_var}.episode.agent_name = name;
                    }}
                }}""",
                agent_name,
            )
    except Exception:
        pass

    # Fast-forward semantics follow each benchmark's original subtask demo flow.
    try:
        if instrument == "fib" and subtask_id != "F1":
            page.evaluate(
                f"""() => {{
                    if (typeof window.FIB_fast_forward_to_subtask === 'function') {{
                        window.FIB_fast_forward_to_subtask('{subtask_id}');
                    }}
                }}"""
            )
            return
        if instrument == "eds":
            page.evaluate(
                """() => {
                    if (typeof window.EDS_setAgentEvalUi === 'function') {
                        window.EDS_setAgentEvalUi(true);
                    }
                }"""
            )
            if subtask_id != "S1":
                page.evaluate(
                    f"""() => {{
                        if (typeof window.EDS_fast_forward_to_subtask === 'function') {{
                            window.EDS_fast_forward_to_subtask('{subtask_id}');
                        }}
                    }}"""
                )
            return
        if instrument == "lfm" and subtask_id != "L1":
            page.evaluate(
                f"""() => {{
                    if (typeof window.LFM_fast_forward_to_subtask === 'function') {{
                        window.LFM_fast_forward_to_subtask('{subtask_id}');
                    }}
                }}"""
            )
            return
        if instrument == "spm" and subtask_id != "S1":
            page.evaluate(
                f"""() => {{
                    if (typeof window.SPM_fast_forward_to_subtask === 'function') {{
                        window.SPM_fast_forward_to_subtask('{subtask_id}');
                    }}
                }}"""
            )
            return
        if instrument == "xrd" and subtask_id != "S1":
            page.evaluate(
                f"""() => {{
                    if (typeof window.XRD_fast_forward_to_subtask === 'function') {{
                        window.XRD_fast_forward_to_subtask('{subtask_id}');
                    }}
                }}"""
            )
            return
        if instrument == "apt":
            # Mirror APT subtask demo: jump to state before target step.
            step_num = int(APT_SUBTASK_DEMOS.get(subtask_id, {}).get("step", 1))
            jump_to = step_num - 2
            if jump_to >= 0:
                page.evaluate(
                    f"window.APT_JUMP_TO_STATE && window.APT_JUMP_TO_STATE({jump_to})"
                )
            return
        if instrument == "tem":
            step_num = int(subtask_id[1:])
            if step_num >= 2:
                page.evaluate(
                    f"window.TEM_JUMP_TO_STATE && window.TEM_JUMP_TO_STATE({step_num - 2})"
                )
            return
    except Exception:
        pass


def _record_benchmark_action(instrument: str, page, action: Any, subtask_id: str) -> None:
    try:
        if instrument == "fib":
            record_fib_agent_action(page, action, subtask_id or infer_current_fib_subtask(page))
        elif instrument == "eds":
            record_eds_agent_action(page, action, subtask_id or infer_current_eds_subtask(page))
        elif instrument == "lfm":
            record_lfm_agent_action(page, action, subtask_id or infer_current_lfm_subtask(page))
        elif instrument == "spm":
            record_spm_agent_action(page, action, subtask_id)
        elif instrument == "apt":
            record_apt_agent_action(page, action, subtask_id or infer_current_apt_subtask(page))
    except Exception:
        pass


def _extract_benchmark_log(instrument: str, page, step_count: int) -> Dict[str, Any] | None:
    try:
        if instrument == "fib":
            return extract_fib_benchmark_log(page)
        if instrument == "sem":
            return extract_sem_benchmark_log(page, agent_steps=step_count)
        if instrument == "eds":
            return extract_eds_benchmark_log(page)
        if instrument == "lfm":
            return extract_lfm_benchmark_log(page)
        if instrument == "spm":
            return extract_spm_benchmark_log(page)
        if instrument == "xrd":
            return extract_xrd_benchmark_log(page)
        if instrument == "apt":
            return extract_apt_benchmark_log(page)
    except Exception:
        return None
    return None


def _success_from_benchmark_log(instrument: str, subtask_id: str, benchmark_log: Dict[str, Any] | None) -> bool | None:
    if not benchmark_log:
        return None
    st_map = {
        st.get("subtask_id"): st
        for st in (benchmark_log.get("subtasks") or [])
        if isinstance(st, dict)
    }
    if instrument == "xrd" and subtask_id == "S2":
        return bool(st_map.get("S2", {}).get("success", False) and st_map.get("S2a", {}).get("success", False))
    if subtask_id in st_map:
        return bool(st_map[subtask_id].get("success", False))
    return None


def _run_single_subtask_once(args, instrument: str, subtask_id: str, run_idx: int, result_dir: str) -> Dict[str, Any]:
    instruction = _instruction_for(instrument, subtask_id)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    episode_dir = os.path.join(result_dir, f"os_symphony_{instrument}_{subtask_id}_run{run_idx}_{ts}")
    os.makedirs(episode_dir, exist_ok=True)

    adapter = _create_agent_adapter(args, episode_dir)
    trajectory: List[Dict[str, Any]] = []
    mouse_pos = None
    success = False
    success_from_log: bool | None = None
    benchmark_log: Dict[str, Any] | None = None
    visited_url = _url_for(instrument, subtask_id, args)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=args.headless)
        context = browser.new_context(
            viewport={"width": args.viewport_width, "height": args.viewport_height}
        )
        page = context.new_page()
        page.goto(visited_url, wait_until="networkidle", timeout=60000)
        if instrument == "tem":
            try:
                page.wait_for_function("window.promise_fullfilled_num >= 13", timeout=15000)
            except Exception:
                pass
        _prepare_subtask_start_state(instrument, page, subtask_id, args.agent_name)
        # Keep close to original per-instrument scripts' settling delays.
        page.wait_for_timeout(1500)

        for step_idx in range(args.max_steps_subtask):
            obs = page_to_observation(
                page,
                instruction,
                mouse_pos=mouse_pos,
                observation_mode=OBSERVATION_MODE_SCREENSHOT,
            )
            info, actions = adapter.predict(instruction, obs)
            action = actions[0] if isinstance(actions, list) and actions else actions
            action = _sanitize_action(action)
            action_str = str(action)
            _record_benchmark_action(instrument, page, action, subtask_id)

            before_path = os.path.join(episode_dir, f"step_{step_idx + 1}_before.png")
            after_path = os.path.join(episode_dir, f"step_{step_idx + 1}_after.png")
            page.screenshot(path=before_path, full_page=True)

            coord_kwargs = _exec_coord_kwargs(args)
            result = execute_action_on_page(
                page,
                action,
                agent_screen_size=(args.viewport_width, args.viewport_height),
                actual_screen_size=(args.viewport_width, args.viewport_height),
                no_coord_convert=coord_kwargs["no_coord_convert"],
                model_type=coord_kwargs["model_type"],
            )
            step_ok, mouse_pos = result if isinstance(result, tuple) else (bool(result), None)
            page.screenshot(path=after_path, full_page=True)

            trajectory.append(
                {
                    "step": step_idx + 1,
                    "action": action_str,
                    "step_ok": bool(step_ok),
                    "mouse_pos": mouse_pos,
                    "plan": (info or {}).get("plan"),
                    "plan_code": (info or {}).get("plan_code"),
                    "coordinates": (info or {}).get("coordinates"),
                    "exec_code": (info or {}).get("exec_code"),
                    "before_screenshot": os.path.basename(before_path),
                    "after_screenshot": os.path.basename(after_path),
                }
            )
            if action_str == "DONE":
                success = True
                break
            if action_str == "FAIL":
                success = False
                break

        benchmark_log = _extract_benchmark_log(instrument, page, len(trajectory))
        if benchmark_log:
            with open(os.path.join(episode_dir, f"subtask_{subtask_id}_log.json"), "w", encoding="utf-8") as f:
                json.dump(benchmark_log, f, ensure_ascii=False, indent=2)
            success_from_log = _success_from_benchmark_log(instrument, subtask_id, benchmark_log)

        # TEM follows its own state-based subtask accuracy logic in original implementation.
        if instrument == "tem":
            state = get_tem_state(page)
            success_from_log = is_subtask_expected_state_reached(int(subtask_id[1:]) - 1, state)

        context.close()
        browser.close()

    if success_from_log is not None:
        success = bool(success_from_log)

    run_result = {
        "instrument": instrument,
        "subtask_id": subtask_id,
        "run_idx": run_idx,
        "success": success,
        "success_from_benchmark_log": success_from_log,
        "steps_executed": len(trajectory),
        "episode_dir": episode_dir,
        "url": visited_url,
        "benchmark_log_available": bool(benchmark_log),
        "metrics": _extract_run_metric_summary(benchmark_log, subtask_id),
        "trajectory": trajectory,
    }
    with open(os.path.join(episode_dir, "run_result.json"), "w", encoding="utf-8") as f:
        json.dump(run_result, f, ensure_ascii=False, indent=2)
    return run_result


def run_instrument(args, instrument: str) -> Dict[str, Any]:
    result_dir = args.result_dir or get_results_dir(RESULT_KEYS[instrument])
    os.makedirs(result_dir, exist_ok=True)
    all_ids = _instrument_subtasks(instrument)
    subtask_ids = _parse_subtasks(args.subtasks, all_ids)

    logger.info(
        "os_symphony standalone: instrument=%s subtasks=%d runs=%d",
        instrument,
        len(subtask_ids),
        args.runs,
    )
    results: List[Dict[str, Any]] = []
    for sid in subtask_ids:
        for run_idx in range(1, args.runs + 1):
            logger.info("[%s] %s run %d/%d", instrument, sid, run_idx, args.runs)
            results.append(_run_single_subtask_once(args, instrument, sid, run_idx, result_dir))

    per_subtask = []
    total_count = 0
    success_count = 0
    for sid in subtask_ids:
        sid_runs = [r for r in results if r.get("subtask_id") == sid]
        run_rows = []
        metric_runs = []
        for r in sid_runs:
            metrics = r.get("metrics", {}) or {}
            if metrics:
                metric_runs.append(metrics)
            run_rows.append(
                {
                    "run": int(r.get("run_idx", 0) or 0),
                    "success": bool(r.get("success", False)),
                    "episode_dir": r.get("episode_dir"),
                    "metrics": metrics,
                }
            )
        sid_success = sum(1 for rr in run_rows if rr["success"])
        total_count += len(run_rows)
        success_count += sid_success
        per_subtask.append(
            {
                "subtask_id": sid,
                "subtask_name": _subtask_name_for(instrument, sid),
                "num_runs": args.runs,
                "observation_mode": "screenshot",
                "success_count": sid_success,
                "success_rate": sid_success / max(1, args.runs),
                "metrics_summary": _aggregate_metric_summaries(metric_runs),
                "runs": run_rows,
            }
        )

    summary = {
        "num_runs_per_subtask": args.runs,
        "observation_mode": "screenshot",
        "subtasks": per_subtask,
        "overall_metrics_summary": _aggregate_overall_metric_summary(per_subtask),
        "meta": {
            "agent": "os_symphony_standalone",
            "backend": args.backend,
            "instrument": instrument,
            "max_steps_subtask": args.max_steps_subtask,
            "model": args.model,
            "ground_model": args.ground_model,
            "api_url": args.api_url,
            "ground_api_url": args.ground_api_url,
            "timestamp": datetime.now().isoformat(),
            "success_count": success_count,
            "total_count": total_count,
            "success_rate": success_count / max(1, total_count),
        },
    }
    out_path = os.path.join(
        result_dir,
        f"os_symphony_{instrument}_runs_{args.runs}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
    )
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    logger.info("[%s] summary: %s", instrument, out_path)
    return summary


def main():
    parser = argparse.ArgumentParser(
        description="Standalone os_symphony web tests across OSWorld instrument simulators."
    )
    parser.add_argument("--instrument", type=str, default="all", choices=["all", *INSTRUMENT_ALIASES])
    parser.add_argument("--backend", type=str, default="os_symphony", choices=["os_symphony", "coact_baseline"])
    parser.add_argument("--subtasks", type=str, default=None, help="Comma-separated ids, e.g. F1,F2 or S1")
    parser.add_argument("--runs", type=int, default=1)
    parser.add_argument("--max_steps_subtask", type=int, default=15)
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--result_dir", type=str, default=None)
    parser.add_argument("--viewport_width", type=int, default=1920)
    parser.add_argument("--viewport_height", type=int, default=1080)

    parser.add_argument("--engine_type", type=str, default="openai")
    parser.add_argument("--agent_name", type=str, default="os_symphony")
    parser.add_argument("--model", type=str, default="gpt-5.5-medium")
    parser.add_argument("--api_url", type=str, required=True)
    parser.add_argument("--api_key", type=str, required=True)
    parser.add_argument("--temperature", type=float, default=0.0)
    parser.add_argument("--model_type", type=str, default="doubao")
    parser.add_argument(
        "--coord_transform",
        type=str,
        default="scale_1440_to_1920",
        choices=["scale_1440_to_1920", "raw", "legacy"],
        help="Coordinate execution mode. Default applies x*1920/1440, y*1080/810.",
    )
    parser.add_argument(
        "--enable_coord_convert",
        action="store_true",
        help="Enable legacy coordinate conversion (default: disabled, use model coordinates directly).",
    )

    parser.add_argument("--ground_engine_type", type=str, default="openai")
    parser.add_argument("--ground_model", type=str, default=None)
    parser.add_argument("--ground_api_url", type=str, default=None)
    parser.add_argument("--ground_api_key", type=str, default=None)
    parser.add_argument("--grounding_width", type=int, default=1920)
    parser.add_argument("--grounding_height", type=int, default=1080)

    parser.add_argument(
        "--tool_config",
        type=str,
        default=os.path.join(SCRIPT_DIR, "os_symphony_lite_tool_config.yaml"),
    )
    parser.add_argument("--client_password", type=str, default="password")
    parser.add_argument("--disable_reflection", action="store_true")
    args = parser.parse_args()

    args.instrument = args.instrument.lower()
    args.ground_model = args.ground_model or args.model
    args.ground_api_url = args.ground_api_url or args.api_url
    args.ground_api_key = args.ground_api_key or args.api_key

    if not os.path.exists(args.tool_config):
        raise FileNotFoundError(f"tool config not found: {args.tool_config}")

    instruments = list(INSTRUMENT_ALIASES) if args.instrument == "all" else [args.instrument]
    all_summaries = [run_instrument(args, inst) for inst in instruments]

    if len(all_summaries) > 1:
        total = sum((s.get("meta", {}) or {}).get("total_count", 0) for s in all_summaries)
        succ = sum((s.get("meta", {}) or {}).get("success_count", 0) for s in all_summaries)
        logger.info(
            "Overall success rate: %d/%d = %.3f",
            succ,
            total,
            succ / max(1, total),
        )


if __name__ == "__main__":
    main()
