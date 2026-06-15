"""
OpenAI Chat Completions 兼容的多模态 GUI Agent（无豆包专有字段）。

用于 Claude Code / polo / vLLM 等标准 ``/v1/chat/completions`` 网关，与 ``uitars15_v2`` 解耦，
避免在 UITars 代码路径上堆叠 OpenAI 兼容逻辑。

环境变量（kwargs 优先）：
  - ``OPENAI_COMPAT_API_URL``：完整 URL，如 ``https://host/v1/chat/completions``
  - ``OPENAI_COMPAT_API_KEY``：Bearer Token
  若未设置则回退到 ``DOUBAO_API_URL`` / ``DOUBAO_API_KEY``（便于沿用现有 SEM 启动方式）。

解析与坐标后处理复用 ``uitars15_v2`` 中与模型输出格式相关的函数。
"""

from __future__ import annotations

import base64
import logging
import os
from typing import Dict, List, Optional, Tuple, Union

import requests

from mm_agents.uitars15_v2 import (
    COMPUTER_USE_NO_THINKING,
    ENV_FAIL_WORD,
    FINISH_WORD,
    WAIT_WORD,
    parse_action_to_structure_output,
    parsing_response_to_pyautogui_code,
)


def _resolve_api_url(explicit: Optional[str]) -> str:
    u = (explicit or "").strip()
    if u:
        return u.rstrip("/")
    for key in ("OPENAI_COMPAT_API_URL", "DOUBAO_API_URL", "API_URL", "GUI_OWL_API_URL"):
        v = os.environ.get(key, "").strip()
        if v:
            return v.rstrip("/")
    return ""


def _resolve_api_key(explicit: Optional[str]) -> str:
    k = (explicit or "").strip()
    if k:
        return k
    for key in ("OPENAI_COMPAT_API_KEY", "DOUBAO_API_KEY", "API_KEY", "GUI_OWL_API_KEY"):
        v = os.environ.get(key, "").strip()
        if v:
            return v
    return ""


def _redact_message_for_log(msg: dict) -> dict:
    """日志中隐藏 base64 截图。"""
    if not isinstance(msg, dict):
        return {"_": str(msg)}
    formatted = {}
    for key, value in msg.items():
        if key == "content" and isinstance(value, list):
            out = []
            for item in value:
                if isinstance(item, dict) and item.get("type") == "image_url" and "image_url" in item:
                    out.append({"type": "image_url", "image_url": {"url": "[BASE64_IMAGE_DATA]"}})
                else:
                    out.append(item)
            formatted[key] = out
        else:
            formatted[key] = value
    return formatted


def _message_content_to_text(content: Union[str, List, None]) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict):
                if block.get("type") == "text" and "text" in block:
                    parts.append(str(block["text"]))
                elif block.get("type") == "text" and isinstance(block.get("content"), str):
                    parts.append(block["content"])
            elif isinstance(block, str):
                parts.append(block)
        return "".join(parts)
    return str(content)


class OpenAICompatChatAgent:
    """
    标准 Chat Completions + vision；行为对齐 ``UITarsAgent`` 的 ``predict`` / ``reset``，
    供 SEM / 轻量 benchmark 使用。
    """

    def __init__(
        self,
        model: str,
        model_type: str = "doubao",
        max_tokens: int = 3000,
        top_p: Optional[float] = None,
        temperature: float = 0.0,
        max_trajectory_length: Optional[int] = None,
        max_image_history_length: int = 5,
        language: str = "Chinese",
        api_url: Optional[str] = None,
        api_key: Optional[str] = None,
        system_prompt: Optional[str] = None,
    ):
        self.model = model
        self.model_type = model_type
        self.max_tokens = max_tokens
        self.top_p = top_p
        self.temperature = temperature
        self.max_trajectory_length = max_trajectory_length
        self.history_n = max(1, int(max_image_history_length or 5))
        self.language = language
        self._api_url = _resolve_api_url(api_url)
        self._api_key = _resolve_api_key(api_key)
        self.system_prompt = system_prompt or COMPUTER_USE_NO_THINKING
        _model_type_norm = (self.model_type or "").strip().lower().replace("-", "_")
        _model_name_norm = (self.model or "").strip().lower().replace("-", "_")
        if _model_type_norm in {
            "absolute_1920",
            "absolute_screen",
            "screen_px",
            "pixel_1920",
            "openai",
            "gpt",
        }:
            self.system_prompt = (
                self.system_prompt
                + "\n\n## Coordinate Convention\n"
                + "- For <point>x y</point>, output absolute screen pixels in a 1920x1080 space.\n"
                + "- Do NOT output normalized 0-1000 or 0-1 coordinates.\n"
                + "- Keep x in [0,1919] and y in [0,1079]."
            )
        elif _model_type_norm in {"claude_1440", "claude_1440x810", "claude"}:
            self.system_prompt = (
                self.system_prompt
                + "\n\n## Coordinate Convention\n"
                + "- For <point>x y</point>, output absolute screen pixels in a 1440x810 space.\n"
                + "- Do NOT output normalized 0-1000 or 0-1 coordinates.\n"
                + "- Keep x in [0,1439] and y in [0,809]."
            )

        self.action_parse_res_factor = 1000
        self.platform = "ubuntu"
        self.logger = logging.getLogger("desktopenv.agent")

        self.thoughts: List[str] = []
        self.actions: List = []
        self.observations: List = []
        self.history_images: List[str] = []
        self.history_responses: List[str] = []

    def reset(self, _logger=None):
        if _logger is not None:
            self.logger = _logger
        self.thoughts = []
        self.actions = []
        self.observations = []
        self.history_images = []
        self.history_responses = []

    def _rollback_pending_turn(self, rollback_response: bool = False) -> None:
        if self.observations:
            self.observations.pop()
        if self.history_images:
            self.history_images.pop()
        if rollback_response and self.history_responses:
            self.history_responses.pop()

    def _chat_completion(self, messages: List[dict]) -> Union[str, dict]:
        if not self._api_url or not self._api_key:
            return {
                "error": "Missing API URL or API key",
                "details": "Set OPENAI_COMPAT_API_URL / OPENAI_COMPAT_API_KEY or DOUBAO_API_* or pass api_url/api_key.",
            }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        data: dict = {
            "model": self.model,
            "messages": messages,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
        }
        if self.top_p is not None:
            data["top_p"] = self.top_p

        try:
            resp = requests.post(self._api_url, headers=headers, json=data, timeout=120)
        except Exception as e:
            return {"error": f"Request exception: {e}", "details": str(e)}

        if resp.status_code != 200:
            try:
                body = resp.json()
            except Exception:
                body = resp.text
            return {
                "error": f"Request failed with status code {resp.status_code}",
                "details": resp.text,
                "body": body,
            }

        try:
            choice = resp.json()["choices"][0]["message"]
            raw = choice.get("content")
        except (KeyError, IndexError, ValueError) as e:
            return {"error": "Malformed API response", "details": resp.text[:2000], "body": str(e)}

        text = _message_content_to_text(raw)
        return text if text.strip() else raw if isinstance(raw, str) else str(raw)

    def predict(self, task_instruction: str, obs: dict) -> Tuple[Union[str, Dict, None], List]:
        self.task_instruction = task_instruction

        assert len(self.observations) == len(self.actions) and len(self.actions) == len(
            self.thoughts
        ), "The number of observations and actions should be the same."

        screenshot = obs["screenshot"]
        if isinstance(screenshot, bytes):
            screenshot = base64.b64encode(screenshot).decode("utf-8")

        self.history_images.append(screenshot)
        self.observations.append({"screenshot": screenshot, "accessibility_tree": None})

        if len(self.history_images) > self.history_n:
            self.history_images = self.history_images[-self.history_n :]

        images = self.history_images

        messages: List[dict] = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": self.system_prompt.format(
                            instruction=task_instruction,
                            language=self.language,
                        ),
                    }
                ],
            }
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
                                    "image_url": {"url": f"data:image/png;base64,{images[image_num]}"},
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
                            "image_url": {"url": f"data:image/png;base64,{images[image_num]}"},
                        }
                    ],
                }
            )
            image_num += 1
        else:
            messages.append(
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{images[image_num]}"},
                        }
                    ],
                }
            )
            image_num += 1

        try_times = 3
        origin_resized_height = 1080
        origin_resized_width = 1920
        prediction: Union[str, dict, None] = None

        while True:
            if try_times <= 0:
                self.logger.error("Reach max retry times to fetch response from client, as error flag.")
                self._rollback_pending_turn(rollback_response=False)
                return prediction, ["FAIL"]
            try:
                self.logger.info("Messages: %s", _redact_message_for_log(messages[-1]))
                prediction = self._chat_completion(messages)
            except Exception as e:
                self.logger.error(f"Error when fetching response from client, with error:\n{e}")
                prediction = None
                try_times -= 1
                continue

            if isinstance(prediction, dict) and prediction.get("error"):
                det = prediction.get("details") or prediction.get("body") or ""
                self.logger.error(
                    "LLM HTTP error: %s | %s",
                    prediction.get("error"),
                    str(det)[:800] if det else "",
                )
                prediction = None
                try_times -= 1
                continue

            try:
                parsed_dict = parse_action_to_structure_output(
                    prediction,
                    self.action_parse_res_factor,
                    origin_resized_height,
                    origin_resized_width,
                    self.model_type,
                )
                parsing_response_to_pyautogui_code(
                    parsed_dict,
                    origin_resized_height,
                    origin_resized_width,
                    platform=self.platform,
                    model_type=self.model_type,
                )
                break
            except Exception as e:
                self.logger.error(f"Error when parsing response from client, with error:\n{e}")
                prediction = None
                try_times -= 1

        self.history_responses.append(prediction)

        try:
            parsed_dict = parse_action_to_structure_output(
                prediction,
                self.action_parse_res_factor,
                origin_resized_height,
                origin_resized_width,
                self.model_type,
            )
            parsed_pyautogui_code = parsing_response_to_pyautogui_code(
                parsed_dict,
                origin_resized_height,
                origin_resized_width,
                platform=self.platform,
                model_type=self.model_type,
            )
        except Exception as e:
            self.logger.error(f"Parsing action error: {prediction}, with error:\n{e}")
            self._rollback_pending_turn(rollback_response=True)
            return prediction, ["FAIL"]

        thoughts = ""
        for parsed_response in parsed_dict:
            if "thought" in parsed_response and parsed_response["thought"]:
                thoughts += parsed_response["thought"]
        self.thoughts.append(thoughts)

        for parsed_response in parsed_dict:
            if "action_type" in parsed_response:
                if parsed_response["action_type"] == FINISH_WORD:
                    self.actions.append(["DONE"])
                    return prediction, ["DONE"]
                if parsed_response["action_type"] == WAIT_WORD:
                    self.actions.append(["WAIT"])
                    return prediction, ["WAIT"]
                if parsed_response["action_type"] == ENV_FAIL_WORD:
                    self.actions.append(["FAIL"])
                    return prediction, ["FAIL"]

        self.actions.append([parsed_pyautogui_code])
        return prediction, [parsed_pyautogui_code]
