"""
Playwright-based controller with the same interface as OS-World's PythonController.
Used when provider_name=playwright; translates pyautogui-style commands to Playwright API.
"""
import logging
import re
from typing import Any, Dict, Optional

logger = logging.getLogger("desktopenv.playwright_controller")


class PlaywrightController:
    """Controller that uses a Playwright page for screenshot and action execution."""

    def __init__(self, page=None):
        self._page = page
        self._recording = False

    def set_page(self, page):
        self._page = page

    @property
    def page(self):
        return self._page

    def get_screenshot(self) -> Optional[bytes]:
        if not self._page:
            logger.warning("No page set for screenshot")
            return None
        try:
            return self._page.screenshot(type="png", full_page=False)
        except Exception as e:
            logger.error("Screenshot failed: %s", e)
            return None

    def get_accessibility_tree(self) -> Optional[str]:
        # Playwright a11y snapshot is dict; OS-World often expects XML string. Return None for compatibility.
        if not self._page:
            return None
        try:
            snap = self._page.accessibility.snapshot()
            return str(snap) if snap else None
        except Exception:
            return None

    def get_terminal_output(self) -> Optional[str]:
        return None

    def get_file(self, file_path: str) -> Optional[bytes]:
        return None

    def execute_action(self, action):
        if action in ["WAIT", "FAIL", "DONE"]:
            return
        if isinstance(action, dict) and action.get("action_type") in ["WAIT", "FAIL", "DONE"]:
            return
        if isinstance(action, dict):
            self._execute_dict_action(action)
        else:
            self.execute_python_command(action)

    def _execute_dict_action(self, action: dict):
        action_type = action.get("action_type")
        params = action.get("parameters") or {
            k: v for k, v in action.items() if k != "action_type"
        }
        if not self._page:
            return
        try:
            if action_type == "CLICK":
                x = params.get("x")
                y = params.get("y")
                if x is not None and y is not None:
                    self._page.mouse.click(x, y)
                else:
                    self._page.mouse.click(0, 0)
            elif action_type == "MOVE_TO":
                x = params.get("x", 0)
                y = params.get("y", 0)
                self._page.mouse.move(x, y)
            elif action_type == "TYPING":
                text = params.get("text", "")
                self._page.keyboard.type(text, delay=50)
            elif action_type == "PRESS":
                key = params.get("key", "")
                self._page.keyboard.press(key)
            elif action_type == "SCROLL":
                dy = params.get("dy", 0)
                dx = params.get("dx", 0)
                self._page.mouse.wheel(dx, dy)
        except Exception as e:
            logger.error("Execute dict action failed: %s", e)

    def execute_python_command(self, command) -> Optional[Dict[str, Any]]:
        """Translate pyautogui-style command string to Playwright and execute."""
        if not self._page:
            logger.warning("No page set for execute_python_command")
            return None
        if isinstance(command, dict):
            command = command.get("command", "")
        cmd = (command or "").strip()
        try:
            self._run_pyautogui_style(cmd)
            return {"output": "", "status": "ok"}
        except Exception as e:
            logger.error("execute_python_command failed: %s", e)
            return {"output": "", "status": "error", "error": str(e)}

    def _run_pyautogui_style(self, cmd: str):
        # pyautogui.click(x, y) or pyautogui.click(x=100, y=200)
        m = re.search(r"pyautogui\.click\s*\(\s*(?:x\s*=\s*)?(\d+)\s*,\s*(?:y\s*=\s*)?(\d+)", cmd)
        if m:
            self._page.mouse.click(int(m.group(1)), int(m.group(2)))
            return
        m = re.search(r"pyautogui\.click\s*\(\s*\)", cmd)
        if m:
            self._page.mouse.click(0, 0)
            return
        # pyautogui.moveTo(x, y)
        m = re.search(r"pyautogui\.moveTo\s*\(\s*(?:x\s*=\s*)?(\d+)\s*,\s*(?:y\s*=\s*)?(\d+)", cmd)
        if m:
            self._page.mouse.move(int(m.group(1)), int(m.group(2)))
            return
        # pyautogui.typewrite('text') or pyautogui.typewrite("text")
        m = re.search(r'pyautogui\.typewrite\s*\(\s*["\']([^"\']*)["\']\s*\)', cmd)
        if m:
            self._page.keyboard.type(m.group(1), delay=30)
            return
        # pyautogui.press('key')
        m = re.search(r"pyautogui\.press\s*\(\s*['\"]([^'\"]+)['\"]\s*\)", cmd)
        if m:
            self._page.keyboard.press(m.group(1))
            return
        # pyautogui.scroll(amount) or vscroll/hscroll
        m = re.search(r"pyautogui\.(?:vscroll|scroll)\s*\(\s*(-?\d+)", cmd)
        if m:
            self._page.mouse.wheel(0, int(m.group(1)))
            return
        m = re.search(r"pyautogui\.hscroll\s*\(\s*(-?\d+)", cmd)
        if m:
            self._page.mouse.wheel(int(m.group(1)), 0)
            return
        # doubleClick, rightClick
        m = re.search(r"pyautogui\.doubleClick\s*\(\s*(?:x\s*=\s*)?(\d+)\s*,\s*(?:y\s*=\s*)?(\d+)", cmd)
        if m:
            self._page.mouse.dblclick(int(m.group(1)), int(m.group(2)))
            return
        m = re.search(r"pyautogui\.rightClick\s*\(\s*(?:x\s*=\s*)?(\d+)\s*,\s*(?:y\s*=\s*)?(\d+)", cmd)
        if m:
            self._page.mouse.click(int(m.group(1)), int(m.group(2)), button="right")
            return
        logger.warning("Unhandled pyautogui command (skipped): %s", cmd[:80])

    def run_python_script(self, script: str) -> Optional[Dict[str, Any]]:
        return {"status": "error", "output": "", "error": "Playwright controller does not run Python scripts"}

    def run_bash_script(self, script: str, timeout: int = 30, working_dir: Optional[str] = None) -> Optional[Dict[str, Any]]:
        return {"status": "error", "output": "", "error": "Playwright controller does not run bash", "returncode": -1}

    def start_recording(self):
        self._recording = True
        logger.info("Recording start (no-op in Playwright mode)")

    def end_recording(self, dest: str):
        self._recording = False
        logger.info("Recording end (no-op in Playwright mode), dest=%s", dest)

    def get_vm_platform(self):
        return "Playwright"

    def get_vm_machine(self):
        return "browser"

    def get_vm_screen_size(self):
        if not self._page:
            return {"width": 1920, "height": 1080}
        try:
            viewport = self._page.viewport_size
            return {"width": viewport.get("width", 1920), "height": viewport.get("height", 1080)}
        except Exception:
            return {"width": 1920, "height": 1080}
