"""
GUI-Owl 等「vLLM + OpenAI Chat Completions」视觉模型专用 Agent。

与 uitars15_v2 的区别：
- 请求体仅包含 OpenAI 兼容字段（无豆包 thinking 等扩展）
- API 地址优先读 GUI_OWL_API_*，便于与 DOUBAO_* 默认配置隔离
- 系统提示针对归一化 bbox 输出做了约束，减少 [100, 类解析失败

动作解析仍使用 uitars15_v2 中与 benchmark Playwright 执行链一致的
parse_action_to_structure_output / parsing_response_to_pyautogui_code（仅复用解析层，非推理 HTTP 逻辑）。
"""

from __future__ import annotations

import base64
import json
import logging
import os
from typing import Dict, List, Optional, Tuple, Union

import requests
from loguru import logger

from mm_agents.uitars15_v2 import (
    ENV_FAIL_WORD,
    FINISH_WORD,
    WAIT_WORD,
    parse_action_to_structure_output,
    parsing_response_to_pyautogui_code,
)

# 与 uitars「无 thinking」版能力对齐，强调 start_box 用括号而非方括号
GUI_OWL_SYSTEM_PROMPT = """You are a GUI agent. You see screenshots of a desktop web UI and must output exactly one next action.

## Output format (required)
```
Thought: ...
Action: ...
```
- Write `Thought` in {language}.
- `Action` must be a single line, one function call from the action space below.

## Action space (coordinates are normalized 0–1000 on width/height)
Use **parentheses and commas only** inside start_box — do NOT use square brackets.

click(start_box='(x1,y1,x2,y2)')  # bbox corners in 0–1000; for a point use equal x1=x2, y1=y2
left_double(start_box='(x1,y1,x2,y2)')
right_single(start_box='(x1,y1,x2,y2)')
drag(start_box='(x1,y1,x2,y2)', end_box='(x3,y3,x4,y4)')
hotkey(key='ctrl c')  # lowercase, space-separated, at most 3 keys
type(content='text')  # escape quotes as \\' and newlines as \\n; end with \\n to submit
scroll(start_box='(x1,y1,x2,y2)', direction='down')  # or up/left/right
wait()
finished(content='done')
error_env()

## User instruction
{instruction}
"""


def _resolve_api_url() -> str:
    if os.environ.get("GUI_OWL_API_URL"):
        url = os.environ["GUI_OWL_API_URL"].strip()
    elif os.environ.get("DOUBAO_API_URL"):
        url = os.environ["DOUBAO_API_URL"].strip()
    else:
        base = os.environ.get("OPENAI_API_BASE", "").strip().rstrip("/")
        url = f"{base}/v1/chat/completions" if base else ""
    url = url.rstrip("/")
    if url.endswith("/v1"):
        url = url + "/chat/completions"
    return url


def _resolve_api_key() -> str:
    return os.environ.get("GUI_OWL_API_KEY") or os.environ.get("DOUBAO_API_KEY") or "EMPTY"


def _request_max_tokens(requested: int) -> int:
    """vLLM rejects when max_tokens exceeds remaining / model budget; keep request conservative."""
    cap = int(os.environ.get("GUI_OWL_MAX_COMPLETION_TOKENS", "256"))
    cap = max(16, cap)
    return max(16, min(int(requested), cap))


def _pretty_last_user_message(messages: list) -> dict:
    if not messages:
        return {}
    msg = messages[-1]
    if not isinstance(msg, dict):
        return {}
    out = dict(msg)
    if out.get("role") == "user" and isinstance(out.get("content"), list):
        sanitized = []
        for item in out["content"]:
            if isinstance(item, dict) and item.get("type") == "image_url":
                sanitized.append(
                    {"type": "image_url", "image_url": {"url": "[BASE64_IMAGE_DATA]"}}
                )
            else:
                sanitized.append(item)
        out["content"] = sanitized
    return out


class GuiOwlVllmAgent:
    """OpenAI-compatible multimodal chat agent for vLLM-served GUI-Owl."""

    def __init__(
        self,
        model: str,
        max_tokens: int = 512,
        top_p: Optional[float] = None,
        temperature: float = 0.0,
        max_trajectory_length: Optional[int] = None,
        max_image_history_length: int = 5,
        language: str = "Chinese",
        api_url: Optional[str] = None,
        api_key: Optional[str] = None,
        coordinate_model_type: str = "doubao",
    ):
        self.model = model
        self.max_tokens = max_tokens
        self.top_p = top_p
        self.temperature = temperature
        self.max_trajectory_length = max_trajectory_length
        self.history_n = max_image_history_length
        self.language = language
        self._api_url_override = api_url.rstrip("/") if api_url else None
        self._api_key_override = api_key
        self.model_type = coordinate_model_type
        self.action_parse_res_factor = 1000
        self.platform = "ubuntu"

        self.thoughts: List[str] = []
        self.actions: List = []
        self.observations: List = []
        self.history_images: List[str] = []
        self.history_responses: List[str] = []
        self.task_instruction = ""

    def reset(self, _logger=None):
        global logger
        logger = _logger if _logger is not None else logging.getLogger("desktopenv.agent")
        self.thoughts = []
        self.actions = []
        self.observations = []
        self.history_images = []
        self.history_responses = []

    def _chat(self, messages: list) -> str:
        url = self._api_url_override or _resolve_api_url()
        if not url:
            raise RuntimeError(
                "未配置 API URL：请设置 GUI_OWL_API_URL 或 DOUBAO_API_URL（例如 http://127.0.0.1:8000/v1/chat/completions）"
            )
        key = self._api_key_override or _resolve_api_key()
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        payload: Dict = {
            "model": self.model,
            "messages": messages,
            "max_tokens": _request_max_tokens(self.max_tokens),
            "temperature": self.temperature,
        }
        if self.top_p is not None:
            payload["top_p"] = self.top_p

        max_out = _request_max_tokens(self.max_tokens)
        last_detail: Union[str, dict] = ""
        for attempt in range(6):
            payload["max_tokens"] = max(16, max_out // (2**attempt))
            resp = requests.post(url, headers=headers, json=payload, timeout=600)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            try:
                last_detail = resp.json()
            except Exception:
                last_detail = resp.text
            err_text = str(last_detail).lower()
            if resp.status_code == 400 and (
                "max_tokens" in err_text or "max_model_len" in err_text or "max_total_tokens" in err_text
            ):
                continue
            raise RuntimeError(f"HTTP {resp.status_code}: {last_detail}")

        raise RuntimeError(f"HTTP 400 after max_tokens backoff: {last_detail}")

    def predict(self, task_instruction: str, obs: dict) -> Tuple[Union[str, Dict, None], List]:
        assert len(self.observations) == len(self.actions) == len(self.thoughts), (
            "The number of observations and actions should be the same."
        )

        screenshot = obs["screenshot"]
        if isinstance(screenshot, bytes):
            screenshot = base64.b64encode(screenshot).decode("utf-8")

        hist_before = list(self.history_images)
        obs_before_len = len(self.observations)

        self.history_images.append(screenshot)
        self.observations.append({"screenshot": screenshot, "accessibility_tree": None})
        if len(self.history_images) > self.history_n:
            self.history_images = self.history_images[-self.history_n :]

        def _rollback_pending_turn() -> None:
            self.history_images = hist_before
            self.observations = self.observations[:obs_before_len]

        images = self.history_images
        system_text = GUI_OWL_SYSTEM_PROMPT.format(
            instruction=task_instruction, language=self.language
        )
        # 与 uitars15_v2 一致：首条 user 仅为任务/规范文本，后续轮次再拼图像，利于 vLLM 多模态模板
        messages: List[Dict] = [
            {"role": "user", "content": [{"type": "text", "text": system_text}]}
        ]

        image_num = 0
        if len(self.history_responses) > 0:
            for history_idx, history_response in enumerate(self.history_responses):
                if history_idx + self.history_n > len(self.history_responses):
                    messages.append(
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/png;base64,{images[image_num]}"
                                    },
                                }
                            ],
                        }
                    )
                    image_num += 1
                messages.append({"role": "assistant", "content": history_response})
            messages.append(
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{images[image_num]}"
                            },
                        }
                    ],
                }
            )
        else:
            messages.append(
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{images[image_num]}"
                            },
                        }
                    ],
                }
            )

        try_times = 3
        origin_h, origin_w = 1080, 1920
        prediction = None

        while True:
            if try_times <= 0:
                logger.error("Reach max retry times (GUI-Owl vLLM).")
                _rollback_pending_turn()
                return prediction, ["FAIL"]
            try:
                logger.info(f"GuiOwlVllm messages tail: {_pretty_last_user_message(messages)}")
                prediction = self._chat(messages)
                if isinstance(prediction, dict) and "error" in prediction:
                    raise RuntimeError(json.dumps(prediction, ensure_ascii=False))
            except Exception as e:
                logger.error(f"GUI-Owl request error: {e}")
                prediction = None
                try_times -= 1
                continue

            try:
                parsed_dict = parse_action_to_structure_output(
                    prediction,
                    self.action_parse_res_factor,
                    origin_h,
                    origin_w,
                    self.model_type,
                )
                parsing_response_to_pyautogui_code(
                    parsed_dict,
                    origin_h,
                    origin_w,
                    platform=self.platform,
                    model_type=self.model_type,
                )
                break
            except Exception as e:
                logger.error(f"GUI-Owl parse error: {e}")
                prediction = None
                try_times -= 1

        self.history_responses.append(prediction)

        try:
            parsed_dict = parse_action_to_structure_output(
                prediction,
                self.action_parse_res_factor,
                origin_h,
                origin_w,
                self.model_type,
            )
            parsed_pyautogui = parsing_response_to_pyautogui_code(
                parsed_dict,
                origin_h,
                origin_w,
                platform=self.platform,
                model_type=self.model_type,
            )
        except Exception as e:
            logger.error(f"GUI-Owl second parse error: {prediction!r} {e}")
            if self.history_responses:
                self.history_responses.pop()
            _rollback_pending_turn()
            return prediction, ["FAIL"]

        thoughts = ""
        for pr in parsed_dict:
            if pr.get("thought"):
                thoughts += pr["thought"]
        if thoughts:
            self.thoughts.append(thoughts)

        for pr in parsed_dict:
            at = pr.get("action_type")
            if at == FINISH_WORD:
                self.actions.append(["DONE"])
                return prediction, ["DONE"]
            if at == WAIT_WORD:
                self.actions.append(["WAIT"])
                return prediction, ["WAIT"]
            if at == ENV_FAIL_WORD:
                self.actions.append(["FAIL"])
                return prediction, ["FAIL"]

        self.actions.append([parsed_pyautogui])
        return prediction, [parsed_pyautogui]
