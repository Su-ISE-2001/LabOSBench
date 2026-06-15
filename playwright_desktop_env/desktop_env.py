"""
Playwright-based DesktopEnv with the same interface as OS-World's DesktopEnv.
Uses PlaywrightController; imports evaluators from OSWorld-main when available.
"""
from __future__ import annotations

import logging
import os
import sys
import time
from typing import Any, Dict, List, Optional, Tuple, Union

import gymnasium as gym

from .controllers.playwright_controller import PlaywrightController

# Load evaluators from OSWorld-main so evaluate() works
_OSWORLD_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "OSWorld-main"))
if _OSWORLD_ROOT not in sys.path:
    sys.path.insert(0, _OSWORLD_ROOT)
try:
    from desktop_env.evaluators import metrics, getters
except ImportError:
    metrics = None
    getters = None

logger = logging.getLogger("desktopenv.env")

Metric = type(None)
Getter = type(None)
MAX_RETRIES = 3


class DesktopEnv(gym.Env):
    """Playwright-based desktop environment compatible with OS-World run loop."""

    def __init__(
        self,
        provider_name: str = "playwright",
        action_space: str = "pyautogui",
        cache_dir: str = "cache",
        screen_size: Tuple[int, int] = (1920, 1080),
        headless: bool = False,
        require_a11y_tree: bool = False,
        require_terminal: bool = False,
        os_type: str = "Ubuntu",
        enable_proxy: bool = False,
        client_password: str = "",
        launch_url: str = "about:blank",
        **kwargs,
    ):
        self.provider_name = "playwright"
        self.screen_width = screen_size[0]
        self.screen_height = screen_size[1]
        self.cache_dir_base = cache_dir
        self.headless = headless
        self.require_a11y_tree = require_a11y_tree
        self.require_terminal = require_terminal
        self.os_type = os_type
        self.enable_proxy = enable_proxy
        self.client_password = client_password or "password"
        self.launch_url = launch_url
        self.path_to_vm = None
        self.vm_ip = "127.0.0.1"
        self.is_environment_used = False
        self.instruction = None
        self.action_space = action_space
        self._traj_no = -1
        self._step_no = 0
        self.action_history = []
        self._browser = None
        self._playwright = None
        self.controller = PlaywrightController()
        self.setup_controller = None
        self._start_emulator()

    def _start_emulator(self):
        try:
            from playwright.sync_api import sync_playwright
            self._playwright = sync_playwright().start()
            self._browser = self._playwright.chromium.launch(headless=self.headless)
            context = self._browser.new_context(
                viewport={"width": self.screen_width, "height": self.screen_height}
            )
            page = context.new_page()
            page.goto(self.launch_url, wait_until="domcontentloaded", timeout=30000)
            self.controller.set_page(page)
        except Exception as e:
            logger.error("Playwright start failed: %s", e)
            raise

    def close(self):
        if self._browser:
            try:
                self._browser.close()
            except Exception as e:
                logger.warning("Browser close: %s", e)
        if self._playwright:
            try:
                self._playwright.stop()
            except Exception as e:
                logger.warning("Playwright stop: %s", e)
        self._browser = None
        self._playwright = None
        self.controller.set_page(None)

    def reset(
        self,
        task_config: Optional[Dict[str, Any]] = None,
        seed=None,
        options=None,
    ) -> Dict[str, Any]:
        self._traj_no += 1
        self._step_no = 0
        self.action_history.clear()
        if task_config:
            self._set_task_info(task_config)
            url = task_config.get("launch_url") or task_config.get("url") or self.launch_url
            try:
                self.controller.page.goto(url, wait_until="domcontentloaded", timeout=60000)
            except Exception as e:
                logger.warning("reset goto %s: %s", url, e)
        observation = self._get_obs()
        return observation

    def _get_obs(self):
        return {
            "screenshot": self.controller.get_screenshot(),
            "accessibility_tree": self.controller.get_accessibility_tree()
            if self.require_a11y_tree
            else None,
            "terminal": self.controller.get_terminal_output() if self.require_terminal else None,
            "instruction": self.instruction,
        }

    def _set_task_info(self, task_config: Dict[str, Any]):
        self.task_id = task_config.get("id", "task")
        self.cache_dir = os.path.join(self.cache_dir_base, self.task_id)
        os.makedirs(self.cache_dir, exist_ok=True)
        self.instruction = task_config.get("instruction", "")
        self.config = task_config.get("config", [])
        self._set_evaluator_info(task_config)

    def _set_evaluator_info(self, task_config: Dict[str, Any]):
        if not task_config.get("evaluator") or metrics is None or getters is None:
            self.evaluator = {}
            self.metric = None
            self.result_getter = None
            self.expected_getter = None
            self.metric_options = {}
            return
        self.evaluator = task_config["evaluator"]
        func = self.evaluator.get("func")
        if isinstance(func, list):
            self.metric = [getattr(metrics, f) for f in func]
        else:
            self.metric = getattr(metrics, func) if func else None
        self.metric_conj = self.evaluator.get("conj", "and")
        res = self.evaluator.get("result", [])
        if res:
            self.result_getter = (
                [getattr(getters, "get_{}".format(r["type"])) for r in res]
                if isinstance(res, list)
                else getattr(getters, "get_{}".format(res["type"]))
            )
        else:
            self.result_getter = None
        exp = self.evaluator.get("expected", [])
        if exp:
            self.expected_getter = (
                [getattr(getters, "get_{}".format(e["type"])) if e else None for e in exp]
                if isinstance(exp, list)
                else getattr(getters, "get_{}".format(exp["type"]))
            )
        else:
            self.expected_getter = None
        self.metric_options = self.evaluator.get("options", {})

    def step(self, action, pause=0.5):
        self._step_no += 1
        self.action_history.append(action)
        reward = 0
        done = False
        info = {}
        if action in ["WAIT", "FAIL", "DONE"] or (
            isinstance(action, dict) and action.get("action_type") in ["WAIT", "FAIL", "DONE"]
        ):
            if action == "FAIL" or (isinstance(action, dict) and action.get("action_type") == "FAIL"):
                done = True
                info = {"fail": True}
            elif action == "DONE" or (isinstance(action, dict) and action.get("action_type") == "DONE"):
                done = True
                info = {"done": True}
            time.sleep(pause)
        else:
            self.controller.execute_action(action)
            time.sleep(pause)
        observation = self._get_obs()
        return observation, reward, done, info

    def evaluate(self):
        if not getattr(self, "evaluator", None):
            return 0.0
        if self.evaluator.get("func") == "infeasible":
            if self.action_history:
                last = self.action_history[-1]
                if last == "FAIL" or (isinstance(last, dict) and last.get("action_type") == "FAIL"):
                    return 1
            return 0
        metric = getattr(self, "metric", None)
        if metric is None:
            return 0.0
        try:
            res_list = self.evaluator.get("result")
            res_getter = getattr(self, "result_getter", None)
            exp_getter = getattr(self, "expected_getter", None)
            opt = getattr(self, "metric_options", {}) or {}
            if isinstance(metric, list):
                results = []
                res_cfgs = res_list if isinstance(res_list, list) else [res_list]
                getters_list = res_getter if isinstance(res_getter, list) else [res_getter] * len(metric)
                for idx, m in enumerate(metric):
                    cfg = res_cfgs[idx] if idx < len(res_cfgs) else res_cfgs[0]
                    rstate = getters_list[idx](self, cfg)
                    exp_cfgs = self.evaluator.get("expected") or []
                    exp_cfgs = exp_cfgs if isinstance(exp_cfgs, list) else [exp_cfgs]
                    o = (opt[idx] if isinstance(opt, list) and idx < len(opt) else opt) or {}
                    if exp_getter and idx < len(exp_cfgs) and exp_cfgs[idx]:
                        estate = (exp_getter[idx] if isinstance(exp_getter, list) else exp_getter)(self, exp_cfgs[idx])
                        results.append(m(rstate, estate, **o))
                    else:
                        results.append(m(rstate, **o))
                return sum(results) / len(results) if getattr(self, "metric_conj", "and") == "and" else max(results)
            rstate = res_getter(self, res_list)
            if exp_getter and self.evaluator.get("expected"):
                estate = exp_getter(self, self.evaluator["expected"])
                return metric(rstate, estate, **opt)
            return metric(rstate, **opt)
        except Exception as e:
            logger.error("evaluate failed: %s", e)
            return 0.0

    def render(self, mode="rgb_array"):
        if mode == "rgb_array":
            return self.controller.get_screenshot()
        raise ValueError("Unsupported render mode: {}".format(mode))
