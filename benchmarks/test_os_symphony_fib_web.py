import argparse
import json
import os
import sys
from datetime import datetime
from typing import Any, Dict, List, Tuple

from playwright.sync_api import sync_playwright


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "OSWorld"))
sys.path.insert(0, SCRIPT_DIR)

from benchmarks.paths import get_results_dir
from fib_benchmark.test_fib_agent_lightweight import (
    OBSERVATION_MODE_SCREENSHOT,
    execute_action_on_page,
    logger,
    page_to_observation,
)
from fib_benchmark.test_fib_subtask_demos import FIB_SUBTASK_DEMOS
from mm_agents.os_symphony.agents.os_aci import OSACI
from mm_agents.os_symphony.agents.os_symphony import OSSymphony


class OSSymphonyWebAdapter:
    def __init__(
        self,
        max_steps: int,
        os_symphony: OSSymphony,
        episode_dir: str,
    ):
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


def _exec_coord_kwargs(args) -> Dict[str, Any]:
    if args.coord_transform == "scale_1440_to_1920":
        # Use shared executor's claude_1440 path:
        # x_click = x_model * 1920 / 1440, y_click = y_model * 1080 / 810
        return {"no_coord_convert": False, "model_type": "claude_1440"}
    if args.coord_transform == "raw":
        return {"no_coord_convert": True, "model_type": args.model_type}
    return {"no_coord_convert": not args.enable_coord_convert, "model_type": args.model_type}


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
        # Worker 中存在拼写 temperture 的读取，兼容写入
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
        extra={
            "tool_config": args.tool_config,
            "keep_first_image": False,
        },
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
    return OSSymphonyWebAdapter(
        max_steps=args.max_steps_subtask,
        os_symphony=os_symphony,
        episode_dir=episode_dir,
    )


def run_once(args, subtask_id: str, run_idx: int) -> Dict[str, Any]:
    if subtask_id not in FIB_SUBTASK_DEMOS:
        raise ValueError(f"未知 subtask_id: {subtask_id}")

    instruction = FIB_SUBTASK_DEMOS[subtask_id]["instruction"]
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    episode_dir = os.path.join(args.result_dir, f"os_symphony_{subtask_id}_run{run_idx}_{ts}")
    os.makedirs(episode_dir, exist_ok=True)

    adapter = _create_os_symphony_adapter(args, episode_dir)
    trajectory: List[Dict[str, Any]] = []
    mouse_pos = None
    success = False

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=args.headless)
        context = browser.new_context(
            viewport={"width": args.viewport_width, "height": args.viewport_height}
        )
        page = context.new_page()
        page.goto(args.fib_url, wait_until="networkidle", timeout=60000)

        for step_idx in range(args.max_steps_subtask):
            obs = page_to_observation(
                page,
                instruction,
                mouse_pos=mouse_pos,
                observation_mode=OBSERVATION_MODE_SCREENSHOT,
            )
            info, actions = adapter.predict(instruction, obs)
            action = actions[0] if isinstance(actions, list) and actions else actions
            action_str = str(action)

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

        context.close()
        browser.close()

    run_result = {
        "subtask_id": subtask_id,
        "run_idx": run_idx,
        "success": success,
        "steps_executed": len(trajectory),
        "episode_dir": episode_dir,
        "trajectory": trajectory,
    }
    with open(os.path.join(episode_dir, "run_result.json"), "w", encoding="utf-8") as f:
        json.dump(run_result, f, ensure_ascii=False, indent=2)
    return run_result


def main():
    parser = argparse.ArgumentParser(description="Standalone os_symphony FIB web smoke test.")
    parser.add_argument("--subtask", type=str, default="F1", help="FIB subtask id, e.g. F1")
    parser.add_argument("--runs", type=int, default=1)
    parser.add_argument("--max_steps_subtask", type=int, default=15)
    parser.add_argument(
        "--fib_url",
        type=str,
        default="http://localhost:8080/static/simulator/fib_simulator/FIB_simulator.html",
    )
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--result_dir", type=str, default=get_results_dir("fib"))
    parser.add_argument("--viewport_width", type=int, default=1920)
    parser.add_argument("--viewport_height", type=int, default=1080)

    parser.add_argument("--engine_type", type=str, default="openai")
    parser.add_argument("--model", type=str, default="claude-opus-4-5-20251101")
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
    args.subtask = args.subtask.upper().strip()
    args.ground_model = args.ground_model or args.model
    args.ground_api_url = args.ground_api_url or args.api_url
    args.ground_api_key = args.ground_api_key or args.api_key

    if not os.path.exists(args.tool_config):
        raise FileNotFoundError(f"tool config not found: {args.tool_config}")
    os.makedirs(args.result_dir, exist_ok=True)

    all_runs = []
    for i in range(1, args.runs + 1):
        logger.info("Running os_symphony standalone run %d/%d", i, args.runs)
        all_runs.append(run_once(args, args.subtask, i))

    success_count = sum(1 for r in all_runs if r.get("success"))
    summary = {
        "agent": "os_symphony_standalone",
        "subtask_id": args.subtask,
        "runs": args.runs,
        "success_count": success_count,
        "success_rate": success_count / max(1, args.runs),
        "max_steps_subtask": args.max_steps_subtask,
        "model": args.model,
        "ground_model": args.ground_model,
        "api_url": args.api_url,
        "ground_api_url": args.ground_api_url,
        "timestamp": datetime.now().isoformat(),
        "run_results": all_runs,
    }
    out_path = os.path.join(
        args.result_dir, f"os_symphony_{args.subtask}_runs_{args.runs}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    logger.info("Saved summary: %s", out_path)
    logger.info("Success rate: %d/%d = %.2f", success_count, args.runs, summary["success_rate"])


if __name__ == "__main__":
    main()
