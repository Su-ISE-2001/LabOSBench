"""VLAA-GUI helpers for Playwright-based instrument subtask benchmarks."""

from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

logger = logging.getLogger(__name__)

from benchmarks.coord_postprocess import (
    CLAUDE_MODEL_SPACE_H as VLAA_OPUS_GROUNDING_H,
    CLAUDE_MODEL_SPACE_W as VLAA_OPUS_GROUNDING_W,
)

DEFAULT_MAIN_MODEL = "global.anthropic.claude-opus-4-5-20251101-v1:0"
DEFAULT_MAIN_PROVIDER = "anthropic_bedrock"
DEFAULT_GROUNDING_MODEL = "gui-plus-2026-02-26"
DEFAULT_GROUNDING_PROVIDER = "qwen"
DEFAULT_GROUNDING_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"


def _is_opus_model(model_name: str | None) -> bool:
    return "opus" in (model_name or "").lower()


def _uses_vlaa_opus_coordinate_space(
    main_model: str | None,
    grounding_model: str | None = None,
    grounding_provider: str | None = None,
) -> bool:
    """VLAA+Opus: grounding outputs 1440x810, OSWorldACI maps to 1920x1080 viewport."""
    gp = (grounding_provider or "").lower()
    gm = (grounding_model or "").lower()

    # Qwen / UI-TARS grounding uses 1000x1000, not Opus 1440x810 space.
    if gp in {"qwen", "doubao"} or "gui-plus" in gm or "ui-tars" in gm:
        return False

    # OpenAI-compatible gateway: main + grounding share Opus → 1440x810.
    if gp == "openai":
        return True

    return _is_opus_model(grounding_model) or (
        "claude" in gm and "qwen" not in gm
    )


def apply_vlaa_opus_grounding_env(
    model: str | None = None,
    *,
    grounding_model: str | None = None,
    force: bool = False,
) -> None:
    """
    Set VLAA grounding space to 1440x810 so OSWorldACI.resize_coordinates applies:
    x_click = x_model * 1920/1440, y_click = y_model * 1080/810.
    """
    if not _uses_vlaa_opus_coordinate_space(model, grounding_model):
        return
    w, h = str(VLAA_OPUS_GROUNDING_W), str(VLAA_OPUS_GROUNDING_H)
    if force or not os.environ.get("VLAA_GROUNDING_WIDTH"):
        os.environ["VLAA_GROUNDING_WIDTH"] = w
    if force or not os.environ.get("VLAA_GROUNDING_HEIGHT"):
        os.environ["VLAA_GROUNDING_HEIGHT"] = h
    logger.info(
        "VLAA+Opus grounding space: %sx%s -> viewport 1920x1080",
        w,
        h,
    )


def _default_vlaa_grounding_dims(
    *,
    main_model: str,
    grounding_model: str,
    grounding_provider: str,
    screen_width: int,
    screen_height: int,
) -> tuple[int, int]:
    if _uses_vlaa_opus_coordinate_space(main_model, grounding_model, grounding_provider):
        return VLAA_OPUS_GROUNDING_W, VLAA_OPUS_GROUNDING_H
    if (grounding_provider or "").lower() == "openai":
        return screen_width, screen_height
    return 1000, 1000


def _pick_first(*values: Iterable[Optional[str]]) -> str:
    for value in values:
        if value is None:
            continue
        if isinstance(value, str):
            if value.strip():
                return value.strip()
        else:
            return str(value)
    return ""


def _safe_int(value: Any, default: int) -> int:
    if value is None:
        return int(default)
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(default)


def _normalize_openai_base_url(url: str) -> str:
    if not url:
        return ""
    import re

    return re.sub(r"/chat/completions/?$", "", url.rstrip("/"))


def _openai_compat_credentials(kwargs: Dict[str, Any]) -> tuple[str, str]:
    """Resolve base URL and API key from kwargs and common env aliases."""
    url = _normalize_openai_base_url(
        _pick_first(
            kwargs.get("model_url"),
            kwargs.get("api_url"),
            os.environ.get("VLAA_MAIN_MODEL_URL"),
            os.environ.get("URL"),
            os.environ.get("OPENAI_BASE_URL"),
            os.environ.get("DOUBAO_API_URL"),
            os.environ.get("API_URL"),
        )
    )
    api_key = _pick_first(
        kwargs.get("model_api_key"),
        kwargs.get("api_key"),
        os.environ.get("VLAA_MAIN_MODEL_API_KEY"),
        os.environ.get("API_KEY"),
        os.environ.get("OPENAI_API_KEY"),
        os.environ.get("DOUBAO_API_KEY"),
    )
    return url, api_key


def _resolve_engine_provider(
    explicit: str,
    base_url: str,
    api_key: str,
    *,
    bedrock_default: str = DEFAULT_MAIN_PROVIDER,
) -> str:
    """Use OpenAI-compatible client when a proxy URL/key is configured."""
    if explicit:
        return explicit
    if base_url and api_key:
        return "openai"
    return bedrock_default


def _engine_type_for_openai_compat_proxy(provider: str, base_url: str) -> str:
    """
    LMMEngineOpenAI calls /v1/responses (Responses API).
    Most private gateways only expose /v1/chat/completions — use open_router
    engine class which uses chat.completions with a custom base_url.
    """
    if provider == "openai" and base_url:
        return "open_router"
    return provider


def ensure_vlaa_gui_path() -> Path:
    """Ensure OSWorld/ (contains mm_agents/vlaa_gui) is on sys.path."""
    benchmarks_dir = Path(__file__).resolve().parent
    repo_root = benchmarks_dir.parent
    osworld_dir = repo_root / "OSWorld"
    if not osworld_dir.is_dir():
        raise FileNotFoundError(
            f"OSWorld directory not found at {osworld_dir}; vlaa_gui lives under OSWorld/mm_agents/"
        )

    path = str(osworld_dir)
    if path in sys.path:
        sys.path.remove(path)
    sys.path.insert(0, path)

    # Benchmark scripts usually prepend OSWorld-main first; once mm_agents is loaded
    # from there, `mm_agents.vlaa_gui` is unavailable. Drop cached imports so the
    # OSWorld tree (with vlaa_gui) wins on the next import.
    pkg = sys.modules.get("mm_agents")
    if pkg is not None:
        pkg_file = getattr(pkg, "__file__", "") or ""
        vlaa_in_pkg = (Path(pkg_file).resolve().parent / "vlaa_gui").is_dir()
        if not vlaa_in_pkg:
            for name in list(sys.modules):
                if name == "mm_agents" or name.startswith("mm_agents."):
                    del sys.modules[name]

    return osworld_dir


def vlaa_default_main_model(model: Optional[str] = None) -> str:
    if model:
        return model
    return os.environ.get("VLAA_MAIN_MODEL", DEFAULT_MAIN_MODEL)


def configure_vlaa_gui_env(
    *,
    model: Optional[str] = None,
    model_provider: Optional[str] = None,
    model_url: Optional[str] = None,
    model_api_key: Optional[str] = None,
    aws_region: Optional[str] = None,
    grounding_model: Optional[str] = None,
    grounding_provider: Optional[str] = None,
    grounding_url: Optional[str] = None,
    grounding_api_key: Optional[str] = None,
    api_url: Optional[str] = None,
    api_key: Optional[str] = None,
) -> None:
    """Populate env vars used by VLAAGUILightweightAdapter defaults."""
    model = model or os.environ.get("MODEL")
    api_url = api_url or model_url or os.environ.get("URL")
    api_key = api_key or model_api_key or os.environ.get("API_KEY")

    main_model = vlaa_default_main_model(model)
    os.environ["VLAA_MAIN_MODEL"] = main_model

    base = _normalize_openai_base_url(api_url or "")
    if base:
        os.environ["VLAA_MAIN_MODEL_URL"] = base
        os.environ["OPENAI_BASE_URL"] = base
    if api_key:
        os.environ["VLAA_MAIN_MODEL_API_KEY"] = api_key
        os.environ["OPENAI_API_KEY"] = api_key

    resolved_provider = _resolve_engine_provider(
        model_provider or os.environ.get("VLAA_MAIN_MODEL_PROVIDER", ""),
        base,
        api_key or "",
    )
    os.environ["VLAA_MAIN_MODEL_PROVIDER"] = resolved_provider

    if aws_region:
        os.environ["AWS_REGION"] = aws_region
        os.environ["VLAA_MAIN_MODEL_REGION"] = aws_region

    # OpenAI-compatible gateway: shared Opus endpoint for grounding; 1440x810 coord space.
    if resolved_provider == "openai" and base and api_key:
        if not grounding_provider and not os.environ.get("VLAA_GROUNDING_PROVIDER"):
            os.environ["VLAA_GROUNDING_PROVIDER"] = "openai"
        if not grounding_model and not os.environ.get("VLAA_GROUNDING_MODEL"):
            os.environ["VLAA_GROUNDING_MODEL"] = main_model
        if not grounding_url and not os.environ.get("VLAA_GROUNDING_URL"):
            os.environ["VLAA_GROUNDING_URL"] = base
        if not grounding_api_key and not os.environ.get("VLAA_GROUNDING_API_KEY"):
            os.environ["VLAA_GROUNDING_API_KEY"] = api_key
        apply_vlaa_opus_grounding_env(main_model, grounding_model=main_model)

    if grounding_model:
        os.environ["VLAA_GROUNDING_MODEL"] = grounding_model
    if grounding_provider:
        os.environ["VLAA_GROUNDING_PROVIDER"] = grounding_provider
    if grounding_url:
        os.environ["VLAA_GROUNDING_URL"] = grounding_url
    if grounding_api_key:
        os.environ["VLAA_GROUNDING_API_KEY"] = grounding_api_key
        os.environ["DASHSCOPE_API_KEY"] = grounding_api_key


def is_vlaa_gui_agent(agent_name: str | None) -> bool:
    return (agent_name or "").strip().lower() == "vlaa_gui"


def get_vlaa_gui_agent(**kwargs: Any):
    """Factory used by instrument ``get_agent()`` branches."""
    kwargs.setdefault(
        "max_steps",
        kwargs.get("max_steps")
        or kwargs.get("max_steps_per_subtask")
        or kwargs.get("max_trajectory_length")
        or 50,
    )
    return create_vlaa_gui_agent(**kwargs)


def resolve_subtask_agent_kwargs(
    agent_name: str,
    agent_kwargs: Dict[str, Any],
    *,
    model: Optional[str] = None,
    max_steps_per_subtask: Optional[int] = None,
) -> Dict[str, Any]:
    """Normalize model / max_steps for subtask-demo agent construction."""
    if is_vlaa_gui_agent(agent_name):
        agent_kwargs["model"] = model or agent_kwargs.get("model") or vlaa_default_main_model()
        if max_steps_per_subtask is not None:
            agent_kwargs.setdefault("max_steps", max_steps_per_subtask)
            agent_kwargs.setdefault("max_steps_per_subtask", max_steps_per_subtask)
    else:
        agent_kwargs["model"] = model or agent_kwargs.get("model", "ByteDance-Seed/UI-TARS-1.5-7B")
    return agent_kwargs


def configure_benchmark_subtask_env(
    agent_name: str | None,
    *,
    model: Optional[str] = None,
    api_url: Optional[str] = None,
    api_key: Optional[str] = None,
) -> None:
    """Configure API env for subtask-demo CLIs (vlaa_gui / openai_compat_chat / generic)."""
    an = (agent_name or "").strip().lower()
    if an == "vlaa_gui":
        configure_vlaa_gui_env(
            model=model,
            api_url=api_url,
            api_key=api_key,
        )
        base = _normalize_openai_base_url(
            api_url or os.environ.get("VLAA_MAIN_MODEL_URL") or os.environ.get("OPENAI_BASE_URL") or ""
        )
        key = api_key or os.environ.get("VLAA_MAIN_MODEL_API_KEY") or os.environ.get("OPENAI_API_KEY")
        if base and key:
            os.environ.setdefault("VLAA_MAIN_MODEL_PROVIDER", "openai")
            os.environ.setdefault("VLAA_GROUNDING_PROVIDER", "openai")
            main_model = vlaa_default_main_model(model)
            os.environ.setdefault("VLAA_MAIN_MODEL", main_model)
            os.environ.setdefault("VLAA_GROUNDING_MODEL", main_model)
            os.environ.setdefault("VLAA_GROUNDING_URL", base)
            os.environ.setdefault("VLAA_GROUNDING_API_KEY", key)
            apply_vlaa_opus_grounding_env(main_model, grounding_model=main_model)
            os.environ.setdefault("VLAA_MAIN_THINKING", "0")
            os.environ.setdefault("VLAA_MAIN_TEMPERATURE", "0")
        return

    if an == "openai_compat_chat" or api_key or api_url:
        from benchmarks.openai_compat_support import configure_openai_compat_env

        configure_openai_compat_env(api_key=api_key, api_url=api_url, model=model)


def create_vlaa_gui_agent(**kwargs: Dict[str, Any]):
    return VLAAGUILightweightAdapter(**kwargs)


class VLAAGUILightweightAdapter:
    """
    Wrap VLAA-GUI for Playwright subtask benchmarks.

    Actions are returned as pyautogui code strings and executed by
    execute_action_on_page in each instrument lightweight test.
    """

    screen_size = (1920, 1080)

    def __init__(self, **kwargs: Dict[str, Any]):
        ensure_vlaa_gui_path()
        from mm_agents.vlaa_gui.agents.agent import Agent
        from mm_agents.vlaa_gui.agents.grounding import OSWorldACI

        self._max_steps = _safe_int(kwargs.get("max_steps"), 50)
        self._step_count = 0

        screen_width = _safe_int(kwargs.get("screen_width"), 1920)
        screen_height = _safe_int(kwargs.get("screen_height"), 1080)
        self.screen_size = (screen_width, screen_height)

        main_url, main_api_key = _openai_compat_credentials(kwargs)
        main_model = _pick_first(
            kwargs.get("model"),
            os.environ.get("VLAA_MAIN_MODEL"),
            os.environ.get("MODEL"),
            DEFAULT_MAIN_MODEL,
        )
        main_provider = _resolve_engine_provider(
            _pick_first(
                kwargs.get("model_provider"),
                os.environ.get("VLAA_MAIN_MODEL_PROVIDER"),
            ),
            main_url,
            main_api_key,
        )
        main_engine_type = _engine_type_for_openai_compat_proxy(main_provider, main_url)
        main_region = _pick_first(
            kwargs.get("model_region"),
            os.environ.get("VLAA_MAIN_MODEL_REGION"),
            os.environ.get("AWS_REGION"),
            "us-east-1",
        )

        grounding_provider = _resolve_engine_provider(
            _pick_first(
                kwargs.get("grounding_provider"),
                os.environ.get("VLAA_GROUNDING_PROVIDER"),
            ),
            main_url,
            main_api_key,
            bedrock_default=DEFAULT_GROUNDING_PROVIDER,
        )
        grounding_model = _pick_first(
            kwargs.get("grounding_model"),
            os.environ.get("VLAA_GROUNDING_MODEL"),
            main_model if grounding_provider == "openai" else DEFAULT_GROUNDING_MODEL,
        )
        grounding_url = _pick_first(
            kwargs.get("grounding_url"),
            os.environ.get("VLAA_GROUNDING_URL"),
            main_url if grounding_provider == "openai" else DEFAULT_GROUNDING_URL,
        )
        grounding_api_key = _pick_first(
            kwargs.get("grounding_api_key"),
            os.environ.get("VLAA_GROUNDING_API_KEY"),
            main_api_key if grounding_provider == "openai" else os.environ.get("DASHSCOPE_API_KEY"),
        )
        grounding_engine_type = _engine_type_for_openai_compat_proxy(
            grounding_provider, grounding_url
        )

        if main_provider == "anthropic_bedrock" and not main_api_key:
            logger.warning(
                "主模型使用 Bedrock 但未检测到 API URL/Key；若你走 OpenAI 兼容网关，"
                "请 export URL=... API_KEY=... 或 --api_url / --api_key"
            )
        default_grounding_width, default_grounding_height = _default_vlaa_grounding_dims(
            main_model=main_model,
            grounding_model=grounding_model,
            grounding_provider=grounding_provider,
            screen_width=screen_width,
            screen_height=screen_height,
        )
        grounding_width = _safe_int(
            kwargs.get(
                "grounding_width",
                os.environ.get("VLAA_GROUNDING_WIDTH", default_grounding_width),
            ),
            default_grounding_width,
        )
        grounding_height = _safe_int(
            kwargs.get(
                "grounding_height",
                os.environ.get("VLAA_GROUNDING_HEIGHT", default_grounding_height),
            ),
            default_grounding_height,
        )

        logger.info(
            "VLAA-GUI lightweight: main_engine=%s (provider=%s) model=%s url=%s | "
            "grounding_engine=%s model=%s space=%sx%s",
            main_engine_type,
            main_provider,
            main_model,
            main_url or "(bedrock)",
            grounding_engine_type,
            grounding_model,
            grounding_width,
            grounding_height,
        )

        use_thinking = bool(
            kwargs.get("model_thinking", os.environ.get("VLAA_MAIN_THINKING", "1") == "1")
        )
        temperature = kwargs.get("temperature")
        if temperature is None:
            try:
                temperature = float(os.environ.get("VLAA_MAIN_TEMPERATURE", "1.0"))
            except ValueError:
                temperature = 1.0

        engine_params = {
            "engine_type": main_engine_type,
            "model": main_model,
            "base_url": main_url,
            "api_key": main_api_key,
            "region": main_region,
            "thinking": use_thinking and main_engine_type == "openai",
            "thinking_level": kwargs.get("model_thinking_level", "high"),
            "reasoning_effort": kwargs.get("model_reasoning_effort", "high"),
            "temperature": temperature,
        }
        reflection_engine_params = dict(engine_params)

        engine_params_for_grounding = {
            "engine_type": grounding_engine_type,
            "model": grounding_model,
            "base_url": grounding_url,
            "api_key": grounding_api_key,
            "grounding_width": grounding_width,
            "grounding_height": grounding_height,
        }
        if grounding_provider == "anthropic_bedrock":
            engine_params_for_grounding["region"] = main_region

        engine_params_for_coding = dict(engine_params)
        engine_params_for_searcher = {
            "engine_type": _pick_first(
                kwargs.get("searcher_provider"), os.environ.get("VLAA_SEARCHER_PROVIDER")
            )
            or main_provider,
            "model": _pick_first(
                kwargs.get("searcher_model"), os.environ.get("VLAA_SEARCHER_MODEL")
            )
            or main_model,
            "api_key": _pick_first(
                kwargs.get("searcher_api_key"), os.environ.get("VLAA_SEARCHER_API_KEY")
            )
            or main_api_key,
            "base_url": _normalize_openai_base_url(
                _pick_first(
                    kwargs.get("searcher_url"), os.environ.get("VLAA_SEARCHER_URL")
                )
            )
            or main_url,
            "budget": _safe_int(kwargs.get("searcher_budget"), 0),
            "type": kwargs.get("searcher_type", "vlm"),
        }

        grounding_agent = OSWorldACI(
            env=None,
            platform=kwargs.get("platform", "linux"),
            engine_params_for_generation=engine_params,
            engine_params_for_grounding=engine_params_for_grounding,
            engine_params_for_searcher=engine_params_for_searcher,
            width=screen_width,
            height=screen_height,
            grounding_model_type=kwargs.get("grounding_model_type", "unified"),
            code_agent_engine_params=engine_params_for_coding,
            code_agent_budget=0,
        )

        def _disabled_code_agent(*_args, **_kwargs):
            grounding_agent.last_code_agent_result = {
                "task_instruction": grounding_agent.current_task_instruction,
                "completion_reason": "DISABLED",
                "summary": "Code agent disabled in lightweight benchmark mode.",
                "execution_history": [],
                "steps_executed": 0,
                "budget": 0,
            }
            return "import time; time.sleep(1.0)"

        def _disabled_search_agent(query: str):
            grounding_agent.last_search_agent_result = {
                "query": query,
                "completion_reason": "DISABLED",
                "tutorial_notes": [],
                "execution_history": [],
                "steps_executed": 0,
                "budget": 0,
                "final_answer": "Search agent disabled in lightweight benchmark mode.",
            }
            return "import time; time.sleep(1.0)", {
                "function": "call_search_agent",
                "args": {"query": query, "result": False},
            }

        grounding_agent.call_code_agent = _disabled_code_agent
        grounding_agent.call_search_agent = _disabled_search_agent

        self._agent = Agent(
            engine_params,
            grounding_agent,
            platform=kwargs.get("platform", "linux"),
            action_space="pyautogui",
            observation_type=kwargs.get("observation_type", "screenshot"),
            with_reflection=bool(kwargs.get("with_reflection", True)),
            search_engine=None,
            reflection_engine_params=reflection_engine_params,
            memory_root_path=str(
                Path(kwargs.get("memory_root_path", Path.cwd() / "agent_memory_vlaa"))
            ),
            memory_type="null",
            embedding_engine_type=kwargs.get("embedding_engine_type", "openai"),
            coding_agent_flag=False,
            max_image_in_trajectory=_safe_int(kwargs.get("max_image_in_trajectory"), 8),
            enable_gate=bool(kwargs.get("enable_gate", True)),
            loop_detection=bool(kwargs.get("loop_detection", True)),
            feasibility_check=bool(kwargs.get("feasibility_check", True)),
        )
        self.reset()

    def reset(self) -> None:
        self._step_count = 0
        self._agent.reset()

    def predict(self, instruction: str, observation: Dict[str, Any]):
        self._step_count += 1
        obs = dict(observation)
        obs["is_last_step"] = self._step_count >= self._max_steps

        info, actions = self._agent.predict(instruction, obs)

        if isinstance(info, dict):
            response_text = (
                info.get("executor_plan")
                or info.get("response")
                or json.dumps(info, ensure_ascii=False)[:2000]
            )
        else:
            response_text = str(info) if info is not None else ""

        return response_text, actions or []
