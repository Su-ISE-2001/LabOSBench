"""Shared OpenAI-compatible chat agent wiring for instrument benchmarks."""

from __future__ import annotations

import os
from typing import Any, Optional
from urllib.parse import urlparse

DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-5-20250929"
DEFAULT_CLAUDE_MODEL_TYPE = "claude_1440"
DEFAULT_API_BASE = "http://35.220.164.252:3888"
DEFAULT_API_KEY = os.environ.get("OPENAI_COMPAT_API_KEY") or os.environ.get("API_KEY") or ""


def normalize_chat_completions_url(api_url: Optional[str]) -> str:
    u = (api_url or "").strip().rstrip("/")
    if not u:
        return ""
    if u.endswith("/chat/completions"):
        return u
    if u.endswith("/v1"):
        return f"{u}/chat/completions"
    return u


def configure_openai_compat_env(
    api_key: Optional[str] = None,
    api_url: Optional[str] = None,
    model: Optional[str] = None,
) -> None:
    if api_key:
        os.environ["API_KEY"] = api_key
        os.environ["DOUBAO_API_KEY"] = api_key
        os.environ["GUI_OWL_API_KEY"] = api_key
        os.environ["OPENAI_COMPAT_API_KEY"] = api_key
        os.environ["OPENAI_API_KEY"] = api_key
    if api_url:
        chat_url = normalize_chat_completions_url(api_url)
        os.environ["API_URL"] = api_url
        os.environ["DOUBAO_API_URL"] = chat_url
        os.environ["GUI_OWL_API_URL"] = chat_url
        os.environ["OPENAI_COMPAT_API_URL"] = chat_url
        parsed = urlparse(api_url if "://" in api_url else f"http://{api_url}")
        if parsed.scheme and parsed.netloc:
            os.environ["OPENAI_BASE_URL"] = f"{parsed.scheme}://{parsed.netloc}/v1"
    if model:
        os.environ["MODEL"] = model


def create_openai_compat_chat_agent(**kwargs: Any):
    from mm_agents.openai_compat_chat_agent import OpenAICompatChatAgent

    api_url = (
        kwargs.get("api_url")
        or os.environ.get("OPENAI_COMPAT_API_URL")
        or os.environ.get("DOUBAO_API_URL")
        or os.environ.get("API_URL")
        or os.environ.get("GUI_OWL_API_URL")
    )
    api_key = (
        kwargs.get("api_key")
        or os.environ.get("OPENAI_COMPAT_API_KEY")
        or os.environ.get("DOUBAO_API_KEY")
        or os.environ.get("API_KEY")
        or os.environ.get("GUI_OWL_API_KEY")
    )
    return OpenAICompatChatAgent(
        model=kwargs.get("model") or DEFAULT_CLAUDE_MODEL,
        model_type=kwargs.get("model_type", DEFAULT_CLAUDE_MODEL_TYPE),
        max_tokens=kwargs.get("max_tokens", 3000),
        top_p=kwargs.get("top_p", None),
        temperature=kwargs.get("temperature", 0),
        max_trajectory_length=kwargs.get("max_trajectory_length", None),
        max_image_history_length=kwargs.get("max_image_history_length", 5),
        language=kwargs.get("language", "Chinese"),
        api_url=api_url,
        api_key=api_key,
    )
