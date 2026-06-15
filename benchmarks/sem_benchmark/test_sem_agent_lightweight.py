"""
SEM Benchmark 轻量级测试脚本
直接使用 Playwright 控制浏览器，无需虚拟化环境

使用方法:
1. 确保 SEM 模拟器正在运行（http://localhost:8080）
2. 运行此脚本：
   python test_sem_agent_lightweight.py --max_steps 30 --use-system-chrome
"""

import argparse
import json
import logging
import os
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path

# 添加项目根目录到路径
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BENCHMARKS = os.path.dirname(_SCRIPT_DIR)
ROOT = os.path.dirname(_BENCHMARKS)
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "OSWorld-main"))
sys.path.insert(0, _BENCHMARKS)
from benchmarks.paths import get_results_dir

# 设置默认 API 配置：支持 API_KEY/API_URL 或 DOUBAO_API_* 或 KIMI_API_*，可通过 --api_key/--api_url 覆盖
# uitars15_v2 直接读取 DOUBAO_API_KEY/DOUBAO_API_URL，需确保二者被设置
_DEFAULT_API_KEY = "sk-ui-tars-asd1231hascx12"
_DEFAULT_API_URL = "http://180.184.148.133:11149/v1/chat/completions"

if "API_KEY" not in os.environ:
    os.environ["API_KEY"] = os.environ.get("DOUBAO_API_KEY") or os.environ.get("KIMI_API_KEY") or _DEFAULT_API_KEY
if "API_URL" not in os.environ:
    os.environ["API_URL"] = os.environ.get("DOUBAO_API_URL") or os.environ.get("KIMI_API_URL") or _DEFAULT_API_URL
if "DOUBAO_API_KEY" not in os.environ:
    os.environ["DOUBAO_API_KEY"] = os.environ.get("API_KEY") or _DEFAULT_API_KEY
if "DOUBAO_API_URL" not in os.environ:
    os.environ["DOUBAO_API_URL"] = os.environ.get("API_URL") or _DEFAULT_API_URL

from playwright.sync_api import sync_playwright, Page
from mm_agents.openai_compat_chat_agent import OpenAICompatChatAgent
from mm_agents.uitars15_v2 import UITarsAgent
from mm_agents.uitars15_v1 import UITARSAgent as UITarsAgentV1
from mm_agents.uitars_agent import UITARSAgent as UITarsAgentBase
from mm_agents.o3_agent import O3Agent
from mm_agents.gui_owl_vllm_agent import GuiOwlVllmAgent
from PIL import Image
import io
import base64

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# SEM 系统/角色提示（可选，会拼接到任务指令前，用于设定角色、约束等）
SEM_SYSTEM_PROMPT = """你是一名资深SEM操作员，擅长高分辨率成像。"""

# SEM 任务指令（对应子任务 S1～S11）
SEM_TASK_INSTRUCTION = """请在 SEM 模拟器中完成一次完整的扫描流程并保存清晰的图像。
具体步骤如下：
1. 点击 VENT 按钮让空气进入样品腔室
2. 点击 OPEN 按钮打开腔室（等待 OPEN 变为 CLOSE 后再进行下一步）
3. 点击 CLOSE 按钮关闭腔室
4. 点击 EVACUATE 按钮抽真空
5. 在 Sample 下拉框中选择一种样品
6. 点击 HT 高压按钮开启高压：可点击的是「HT」文字右侧的圆形按钮（不是左侧的「HT」文字本身）
7. 将加速电压滑块（ACCELERATING VOLTAGE）从 0Kv 拖动到 10Kv 位置
8. 拖动 CONTRAST 对应的滑块（#slider-contrast）调整对比度
9. 拖动 FOCUS COARSE 滑块（#slider-focus-c）调整画面清晰度
10. 点击 SLOW SCAN 1 或 SLOW SCAN 2 按钮开始扫描
11. 点击 SAVE IMAGE 按钮保存图像

请严格按照以上步骤顺序完成整个任务。"""

# 完整指令 = 系统提示 + 任务指令（传给 agent 的 instruction）
def get_full_instruction(instruction_override: str = None, system_prompt_override: str = None):
    sys_p = system_prompt_override if system_prompt_override is not None else SEM_SYSTEM_PROMPT
    task = instruction_override if instruction_override is not None else SEM_TASK_INSTRUCTION
    return (sys_p + "\n\n" + task).strip()


def get_agent(agent_name: str, **kwargs):
    """根据名称获取对应的 agent"""
    if agent_name == "uitars15_v2":
        required_params = {
            "model": kwargs.get("model", "ByteDance-Seed/UI-TARS-1.5-7B"),
            "model_type": kwargs.get("model_type", "doubao"),
            "max_tokens": kwargs.get("max_tokens", 3000),
            "top_p": kwargs.get("top_p", None),
            "temperature": kwargs.get("temperature", 0),
            "max_trajectory_length": kwargs.get("max_trajectory_length", None),
            "max_image_history_length": kwargs.get("max_image_history_length", 3),
            "use_thinking": kwargs.get("use_thinking", False),
            "language": kwargs.get("language", "Chinese"),
        }
        return UITarsAgent(**required_params)

    elif agent_name in ("claude", "anthropic", "claude_computer_use"):
        from benchmarks.claude_benchmark_support import configure_claude_env, create_claude_agent

        configure_claude_env(
            api_key=kwargs.get("api_key"),
            api_url=kwargs.get("api_url"),
            model=kwargs.get("model"),
        )
        return create_claude_agent(**kwargs)

    elif agent_name == "openai_compat_chat":
        from benchmarks.openai_compat_support import create_openai_compat_chat_agent
        return create_openai_compat_chat_agent(**kwargs)

    elif agent_name == "vlaa_gui":
        from benchmarks.vlaa_gui_support import get_vlaa_gui_agent
        return get_vlaa_gui_agent(**kwargs)

    elif agent_name == "uitars15_v1":
        runtime_conf = kwargs.get("runtime_conf", {
            "temperature": kwargs.get("temperature", 0),
            "top_p": kwargs.get("top_p", 0.9),
            "max_tokens": kwargs.get("max_tokens", 3000),
            "language": kwargs.get("language", "Chinese"),
            "history_n": 5,
        })
        return UITarsAgentV1(
            model=kwargs.get("model", "ByteDance-Seed/UI-TARS-1.5-7B"),
            runtime_conf=runtime_conf,
            max_trajectory_length=kwargs.get("max_trajectory_length", 30),
            model_type=kwargs.get("model_type", "qwen25vl"),
        )

    elif agent_name == "uitars":
        runtime_conf = kwargs.get("runtime_conf", {
            "temperature": kwargs.get("temperature", 0),
            "top_p": kwargs.get("top_p", 0.9),
            "max_tokens": kwargs.get("max_tokens", 3000),
            "language": kwargs.get("language", "Chinese"),
            "history_n": 5,
        })
        return UITarsAgentBase(
            model=kwargs.get("model", "ByteDance-Seed/UI-TARS-1.5-7B"),
            runtime_conf=runtime_conf,
            max_trajectory_length=kwargs.get("max_trajectory_length", 30),
            model_type=kwargs.get("model_type", "qwen25vl"),
        )

    elif agent_name == "o3":
        return O3Agent(
            model=kwargs.get("model", "o3"),
            max_tokens=kwargs.get("max_tokens", 3000),
            max_steps=kwargs.get("max_steps", 30),
        )

    elif agent_name == "gui_owl_vllm":
        api_url = (
            kwargs.get("api_url")
            or os.environ.get("GUI_OWL_API_URL")
            or os.environ.get("DOUBAO_API_URL")
            or os.environ.get("API_URL")
        )
        api_key = (
            kwargs.get("api_key")
            or os.environ.get("GUI_OWL_API_KEY")
            or os.environ.get("DOUBAO_API_KEY")
            or os.environ.get("API_KEY")
        )
        return GuiOwlVllmAgent(
            model=kwargs.get("model", "gui-owl-1.5-8b-instruct"),
            max_tokens=kwargs.get("max_tokens", 3000),
            top_p=kwargs.get("top_p", None),
            temperature=kwargs.get("temperature", 0),
            max_trajectory_length=kwargs.get("max_trajectory_length", None),
            max_image_history_length=kwargs.get("max_image_history_length", 5),
            language=kwargs.get("language", "Chinese"),
            api_url=api_url,
            api_key=api_key,
            coordinate_model_type=kwargs.get("model_type", "doubao"),
        )

    else:
        raise ValueError(
            f"Unknown agent: {agent_name}. Available: "
            "['uitars15_v2', 'openai_compat_chat', 'vlaa_gui', 'uitars15_v1', 'uitars', 'o3', 'gui_owl_vllm']"
        )


# 全局变量：记录最后的鼠标位置
_last_mouse_pos = None


def clear_last_mouse_pos():
    """清空上次鼠标位置，reload 后调用，避免新尝试的第一张截图带有上一尝试的红色靶心"""
    global _last_mouse_pos
    _last_mouse_pos = None


def add_mouse_indicator_to_page(page: Page, x: int, y: int):
    """在页面上添加鼠标位置指示器"""
    try:
        page.evaluate(f"""
            () => {{
                const oldIndicator = document.getElementById('mouse-indicator');
                if (oldIndicator) {{
                    oldIndicator.remove();
                }}
                const indicator = document.createElement('div');
                indicator.id = 'mouse-indicator';
                indicator.style.position = 'fixed';
                indicator.style.left = '{x - 10}px';
                indicator.style.top = '{y - 10}px';
                indicator.style.width = '20px';
                indicator.style.height = '20px';
                indicator.style.border = '3px solid red';
                indicator.style.borderRadius = '50%';
                indicator.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                indicator.style.pointerEvents = 'none';
                indicator.style.zIndex = '99999';
                indicator.style.transition = 'all 0.1s';
                document.body.appendChild(indicator);
                setTimeout(() => {{ indicator.remove(); }}, 3000);
            }}
        """)
    except Exception as e:
        logger.debug(f"添加鼠标指示器失败: {e}")


def add_mouse_marker_to_screenshot(screenshot_bytes: bytes, x: int, y: int) -> bytes:
    """在截图上标记鼠标位置"""
    try:
        from PIL import Image, ImageDraw
        img = Image.open(io.BytesIO(screenshot_bytes))
        draw = ImageDraw.Draw(img)
        radius = 15
        draw.ellipse([x - radius, y - radius, x + radius, y + radius],
                    outline='red', width=3)
        draw.ellipse([x - 5, y - 5, x + 5, y + 5],
                    fill='red', outline='red')
        draw.line([x - radius - 5, y, x + radius + 5, y], fill='red', width=2)
        draw.line([x, y - radius - 5, x, y + radius + 5], fill='red', width=2)
        output = io.BytesIO()
        img.save(output, format='PNG')
        return output.getvalue()
    except Exception as e:
        logger.debug(f"在截图上标记鼠标位置失败: {e}")
        return screenshot_bytes


def page_to_observation(page: Page, instruction: str, mouse_pos=None):
    """将 Playwright Page 转换为 agent 观察格式"""
    global _last_mouse_pos
    try:
        screenshot_bytes = page.screenshot(type='png', full_page=False)
        if mouse_pos:
            x, y = mouse_pos
            screenshot_bytes = add_mouse_marker_to_screenshot(screenshot_bytes, x, y)
            _last_mouse_pos = mouse_pos
        elif _last_mouse_pos:
            x, y = _last_mouse_pos
            screenshot_bytes = add_mouse_marker_to_screenshot(screenshot_bytes, x, y)
    except Exception as e:
        logger.error(f"获取截图失败: {e}")
        try:
            screenshot_bytes = page.screenshot(type='png')
        except:
            screenshot_bytes = b''

    return {
        "screenshot": screenshot_bytes,
        "accessibility_tree": None,
        "terminal": None,
        "instruction": instruction
    }


def execute_action_on_page(
    page: Page,
    action,
    agent_screen_size: tuple = (1920, 1080),
    actual_screen_size: tuple = None,
    model: str = None,
    coord_mode: str | None = None,
    no_coord_convert: bool = False,
    model_type: str | None = None,
):
    """在页面上执行动作（委托 FIB 执行器，支持 claude_1440 坐标缩放与完整 pyautogui 动作）。"""
    from fib_benchmark.test_fib_agent_lightweight import (
        execute_action_on_page as fib_execute,
        should_skip_coord_convert,
    )

    if not no_coord_convert:
        no_coord_convert = should_skip_coord_convert(model, None, model_type)
    return fib_execute(
        page,
        action,
        agent_screen_size,
        actual_screen_size,
        no_coord_convert=no_coord_convert,
        model_type=model_type,
    )


def parse_and_execute_pyautogui(page: Page, code: str, agent_screen_size: tuple = (1920, 1080), actual_screen_size: tuple = None, model: str = None):
    """解析 pyautogui 代码并转换为 Playwright 操作"""
    import re
    try:
        if actual_screen_size is None:
            viewport = page.viewport_size
            actual_width = viewport['width']
            actual_height = viewport['height']
        else:
            actual_width, actual_height = actual_screen_size

        agent_width, agent_height = agent_screen_size
        # 按模型选择坐标空间：UI-TARS/默认/kimi-k2.5 使用 1000x1000；doubao/seed-1-6 等输出 1920x1080 像素坐标
        _model = (model or "").lower()
        if "uitars" in _model or "bytedance" in _model or "ui-tars" in _model or "kimi" in _model or (not model):
            use_1000_space = True  # 默认/UI-TARS/kimi-k2.5：原始 1000x1000 转换
        else:
            use_1000_space = False  # doubao/seed-1-6 等：agent 像素坐标
        coord_width, coord_height = agent_width, agent_height

        code = re.sub(r'```\w*\n?', '', code)
        code = re.sub(r'```\n?', '', code)
        code = re.sub(r"'''", '', code)
        code = re.sub(r'"""', '', code)
        if 'Thought:' in code:
            action_match = re.search(r'Action:\s*(.*)', code, re.DOTALL)
            if action_match:
                code = action_match.group(1).strip()
        code = re.sub(r'^Action:\s*', '', code, flags=re.MULTILINE)

        lines = code.split('\n')
        cleaned_lines = []
        for line in lines:
            line = line.strip()
            if (line.startswith('import ') or line.startswith('from ') or
                line.startswith('#') or line.startswith("'''") or
                line.startswith('"""') or not line):
                continue
            cleaned_lines.append(line)
        code = '\n'.join(cleaned_lines)

        if not code.strip():
            logger.warning("⚠️  代码为空，无法执行")
            return (False, None)

        click_patterns = [
            r'pyautogui\.click\(([\d.]+),\s*([\d.]+)\)',
            r'pyautogui\.click\(x=([\d.]+),\s*y=([\d.]+)\)',
            r'pyautogui\.click\(([\d.]+),\s*([\d.]+),\s*button=',
            r'click\(([\d.]+),\s*([\d.]+)\)',
        ]
        x, y = None, None
        for pattern in click_patterns:
            click_match = re.search(pattern, code, re.MULTILINE)
            if click_match:
                original_x, original_y = float(click_match.group(1)), float(click_match.group(2))
                if use_1000_space:
                    # UI-TARS：agent 输出 1920x1080，转换为 1000x1000 后直接点击
                    x = int(original_x / 1920 * 1000)
                    y = int(original_y / 1080 * 1000)
                else:
                    # 其他模型：agent 输出 1920x1080 像素坐标，按视口缩放
                    x = int(original_x * actual_width / coord_width)
                    y = int(original_y * actual_height / coord_height)
                break

        if x is not None and y is not None:
            if use_1000_space:
                max_x, max_y = 1000, 1000
                if x > max_x or y > max_y or x < 0 or y < 0:
                    x = max(0, min(x, max_x - 1))
                    y = max(0, min(y, max_y - 1))
            else:
                x = max(0, min(x, actual_width - 1))
                y = max(0, min(y, actual_height - 1))
            try:
                add_mouse_indicator_to_page(page, x, y)
                time.sleep(0.2)
                # 使用 elementFromPoint + element.click() 确保 jQuery/benchmark 的 click 监听能触发
                # （Playwright mouse.click 有时不触发某些 jQuery 绑定）
                clicked = page.evaluate(
                    """([cx, cy]) => {
                        const el = document.elementFromPoint(cx, cy);
                        if (el && typeof el.click === 'function') {
                            el.click();
                            return true;
                        }
                        return false;
                    }""",
                    [x, y],
                )
                if not clicked:
                    page.mouse.click(x, y)
                logger.info(f"✅ 点击成功: ({x}, {y})")
                time.sleep(0.5)
                return (True, (x, y))
            except Exception as e:
                logger.error(f"❌ 点击失败: ({x}, {y}), 错误: {e}")
                return (False, None)

        type_patterns = [
            r"pyautogui\.typewrite\(['\"](.*?)['\"]\)",
            r"pyautogui\.typewrite\(['\"](.*?)['\"],\s*interval=.*?\)",
        ]
        for pattern in type_patterns:
            type_match = re.search(pattern, code, re.DOTALL | re.MULTILINE)
            if type_match:
                text = type_match.group(1).replace('\\n', '\n').replace('\\t', '\t')
                try:
                    page.keyboard.type(text, delay=50)
                    logger.info(f"✅ 输入成功")
                    time.sleep(0.3)
                    return (True, None)
                except Exception as e:
                    logger.error(f"❌ 输入失败: {e}")
                    return (False, None)

        press_patterns = [
            r"pyautogui\.press\(['\"](.*?)['\"],\s*presses=(\d+)\)",
            r"pyautogui\.press\(['\"](.*?)['\"]\)",
        ]
        key_map = {
            'enter': 'Enter', 'tab': 'Tab', 'space': 'Space',
            'esc': 'Escape', 'backspace': 'Backspace', 'delete': 'Delete',
            'up': 'ArrowUp', 'down': 'ArrowDown', 'left': 'ArrowLeft', 'right': 'ArrowRight',
        }
        for pattern in press_patterns:
            press_match = re.search(pattern, code, re.MULTILINE)
            if press_match:
                key_name = press_match.group(1)
                presses = 1
                if len(press_match.groups()) >= 2:
                    try:
                        presses = int(press_match.group(2))
                    except (ValueError, IndexError):
                        presses = 1
                key = key_map.get(key_name.lower(), key_name)
                try:
                    for _ in range(presses):
                        page.keyboard.press(key)
                        time.sleep(0.05)
                    logger.info(f"按键: {key} x{presses}")
                    time.sleep(0.2)
                    return (True, None)
                except Exception as e:
                    logger.error(f"❌ 按键失败: {e}")
                    return (False, None)

        drag_match = re.search(
            r'pyautogui\.moveTo\(([\d.]+),\s*([\d.]+)\)\s*\n?\s*pyautogui\.dragTo\(([\d.]+),\s*([\d.]+)(?:,\s*duration=([\d.]+))?\)',
            code, re.MULTILINE
        )
        if drag_match:
            sx = float(drag_match.group(1))
            sy = float(drag_match.group(2))
            ex = float(drag_match.group(3))
            ey = float(drag_match.group(4))
            duration = float(drag_match.group(5) or 0.5)
            x1 = int(sx * actual_width / coord_width)
            y1 = int(sy * actual_height / coord_height)
            x2 = int(ex * actual_width / coord_width)
            y2 = int(ey * actual_height / coord_height)
            try:
                page.mouse.move(x1, y1)
                time.sleep(0.1)
                page.mouse.down()
                time.sleep(0.05)
                steps = max(5, int(duration * 30))
                for i in range(1, steps + 1):
                    tx = int(x1 + (x2 - x1) * i / steps)
                    ty = int(y1 + (y2 - y1) * i / steps)
                    page.mouse.move(tx, ty)
                    time.sleep(duration / steps)
                page.mouse.up()
                logger.info(f"✅ 拖动成功: ({x1},{y1}) -> ({x2},{y2})")
                return (True, (x2, y2))
            except Exception as e:
                logger.error(f"❌ 拖动失败: {e}")
                return (False, None)

        move_drag_match = re.search(r'pyautogui\.moveTo\(([\d.]+),\s*([\d.]+)\)', code, re.MULTILINE)
        drag_to_match = re.search(r'pyautogui\.dragTo\(([\d.]+),\s*([\d.]+)(?:,\s*duration=([\d.]+))?\)', code, re.MULTILINE)
        if move_drag_match and drag_to_match:
            sx, sy = float(move_drag_match.group(1)), float(move_drag_match.group(2))
            ex, ey = float(drag_to_match.group(1)), float(drag_to_match.group(2))
            duration = float(drag_to_match.group(3) or 0.5) if drag_to_match.lastindex >= 3 else 0.5
            x1 = int(sx * actual_width / coord_width)
            y1 = int(sy * actual_height / coord_height)
            x2 = int(ex * actual_width / coord_width)
            y2 = int(ey * actual_height / coord_height)
            try:
                page.mouse.move(x1, y1)
                time.sleep(0.1)
                page.mouse.down()
                time.sleep(0.05)
                steps = max(5, int(duration * 30))
                for i in range(1, steps + 1):
                    tx = int(x1 + (x2 - x1) * i / steps)
                    ty = int(y1 + (y2 - y1) * i / steps)
                    page.mouse.move(tx, ty)
                    time.sleep(duration / steps)
                page.mouse.up()
                logger.info(f"✅ 拖动成功: ({x1},{y1}) -> ({x2},{y2})")
                return (True, (x2, y2))
            except Exception as e:
                logger.error(f"❌ 拖动失败: {e}")
                return (False, None)

        double_click_patterns = [
            r'pyautogui\.doubleClick\(([\d.]+),\s*([\d.]+)\)',
            r'pyautogui\.doubleClick\(x=([\d.]+),\s*y=([\d.]+)\)',
        ]
        for pattern in double_click_patterns:
            dc_match = re.search(pattern, code, re.MULTILINE)
            if dc_match:
                ox, oy = float(dc_match.group(1)), float(dc_match.group(2))
                x = int(ox * actual_width / coord_width)
                y = int(oy * actual_height / coord_height)
                try:
                    add_mouse_indicator_to_page(page, x, y)
                    time.sleep(0.1)
                    page.mouse.dblclick(x, y)
                    logger.info(f"✅ 双击成功: ({x}, {y})")
                    return (True, (x, y))
                except Exception as e:
                    logger.error(f"❌ 双击失败: {e}")
                    return (False, None)

        hotkey_match = re.search(r"pyautogui\.hotkey\((.*?)\)", code, re.MULTILINE)
        if hotkey_match:
            keys_str = hotkey_match.group(1)
            keys = [k.strip().strip('"\'') for k in keys_str.split(',')]
            try:
                combo = '+'.join(keys)
                page.keyboard.press(combo)
                logger.info(f"✅ 组合键: {combo}")
                time.sleep(0.2)
                return (True, None)
            except Exception as e:
                logger.error(f"❌ 组合键失败: {e}")
                return (False, None)

        scroll_match = re.search(r"pyautogui\.scroll\((-?\d+)\)", code, re.MULTILINE)
        if scroll_match:
            delta = int(scroll_match.group(1))
            try:
                page.mouse.wheel(0, -delta * 50)
                logger.info(f"✅ 滚动: {delta}")
                time.sleep(0.3)
                return (True, None)
            except Exception as e:
                logger.error(f"❌ 滚动失败: {e}")
                return (False, None)

        knob_rotate_match = re.search(
            r'knob_rotate\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*[\'"]?(left|right)[\'"]?\s*,\s*(\d+)\s*\)',
            code, re.MULTILINE | re.IGNORECASE
        )
        if knob_rotate_match:
            kx, ky = float(knob_rotate_match.group(1)), float(knob_rotate_match.group(2))
            direction = knob_rotate_match.group(3).lower()
            steps = int(knob_rotate_match.group(4))
            x = int(kx * actual_width / coord_width)
            y = int(ky * actual_height / coord_height)
            key = 'ArrowRight' if direction == 'right' else 'ArrowLeft'
            try:
                add_mouse_indicator_to_page(page, x, y)
                time.sleep(0.1)
                page.mouse.click(x, y)
                time.sleep(0.2)
                for _ in range(steps):
                    page.keyboard.press(key)
                    time.sleep(0.05)
                logger.info(f"✅ 旋钮旋转: ({x},{y}) {direction} x{steps}")
                return (True, (x, y))
            except Exception as e:
                logger.error(f"❌ 旋钮旋转失败: {e}")
                return (False, None)

        move_to_match = re.search(r'pyautogui\.moveTo\(([\d.]+),\s*([\d.]+)\)', code, re.MULTILINE)
        if move_to_match and not drag_to_match:
            mx, my = float(move_to_match.group(1)), float(move_to_match.group(2))
            x = int(mx * actual_width / coord_width)
            y = int(my * actual_height / coord_height)
            try:
                page.mouse.move(x, y)
                logger.info(f"✅ 移动鼠标: ({x}, {y})")
                return (True, (x, y))
            except Exception as e:
                logger.error(f"❌ 移动失败: {e}")
                return (False, None)

        logger.warning(f"⚠️  无法解析的动作代码: {code[:200]}...")
        return (False, None)

    except Exception as e:
        logger.error(f"❌ 解析动作代码失败: {e}")
        return (False, None)


def check_api_connection(api_url: str = None, timeout: int = 5):
    """检查 API 连接是否可用"""
    import socket
    from urllib.parse import urlparse
    if api_url is None:
        api_url = os.environ.get("API_URL", "")
    if not api_url:
        logger.warning("⚠️  API URL 未设置")
        return False
    try:
        parsed = urlparse(api_url)
        host = parsed.hostname
        port = parsed.port or (443 if parsed.scheme == 'https' else 80)
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        if result == 0:
            logger.info("✅ API 服务器连接正常")
            return True
        else:
            logger.error(f"❌ 无法连接到 API 服务器 {host}:{port}")
            return False
    except Exception as e:
        logger.error(f"❌ API 连接检查失败: {e}")
        return False


def extract_benchmark_log(page: Page, agent_steps: int = None):
    """从浏览器中提取 benchmark 日志"""
    try:
        benchmark_check = page.evaluate("""
            () => {
                return {
                    hasBenchmark: typeof window.SEM_BENCHMARK !== 'undefined',
                    hasEpisode: typeof window.SEM_BENCHMARK !== 'undefined' && 
                                typeof window.SEM_BENCHMARK.episode !== 'undefined',
                    benchmarkType: typeof window.SEM_BENCHMARK
                };
            }
        """)

        logger.info(f"🔍 Benchmark 对象检查: {benchmark_check}")

        if not benchmark_check.get('hasBenchmark'):
            logger.warning("⚠️  window.SEM_BENCHMARK 对象不存在，可能 benchmark_sem.js 未正确加载")
            return None

        if not benchmark_check.get('hasEpisode'):
            logger.warning("⚠️  window.SEM_BENCHMARK.episode 对象不存在")
            return None

        result = page.evaluate("""
            () => {
                if (typeof window.SEM_BENCHMARK !== 'undefined') {
                    if (typeof window.SEM_BENCHMARK.finalize === 'function') {
                        return JSON.stringify(window.SEM_BENCHMARK.finalize());
                    }
                    if (typeof window.SEM_BENCHMARK.episode !== 'undefined') {
                        return JSON.stringify(window.SEM_BENCHMARK.episode);
                    }
                }
                return null;
            }
        """)

        if result:
            log_data = json.loads(result)
            # 若传入 Agent 实际步数，用其覆盖页面内的 actual_steps；步骤效率仅在不成功时为 0，成功时为 最优步数/实际步数
            if agent_steps is not None and isinstance(log_data.get("summary"), dict):
                s = log_data["summary"]
                s["actual_steps"] = agent_steps
                opt = s.get("optimal_steps", 12)
                if not log_data.get("success", False):
                    s["step_efficiency"] = 0.0  # 未跑完基准路径，效率为 0
                else:
                    s["step_efficiency"] = min(1.0, opt / max(agent_steps, 1)) if opt > 0 else 0.0
            logger.info(f"✅ 成功提取 benchmark 日志，Episode ID: {log_data.get('episode_id', 'unknown')}")
            return log_data
        else:
            logger.warning("⚠️  提取的日志结果为空")
            return None

    except Exception as e:
        logger.error(f"❌ 无法从浏览器提取日志: {e}")
        import traceback
        logger.debug(traceback.format_exc())
    return None


def run_sem_test_lightweight(
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps: int = 50,
    sem_url: str = "http://localhost:8080/static/simulator/sem_simulator/SEM_simulator.html",
    result_dir: str = get_results_dir("sem"),
    headless: bool = False,
    use_system_chrome: bool = False,
    instruction_file: str = None,
    system_prompt: str = None,
    **agent_kwargs
) -> dict:
    """轻量级 SEM 测试 - 直接使用 Playwright"""

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    benchmark_js_path = os.path.join(project_root, "simulator-master", "static", "benchmark_sem.js")

    os.makedirs(result_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    episode_dir = os.path.join(result_dir, f"episode_{timestamp}")
    os.makedirs(episode_dir, exist_ok=True)

    if os.path.exists(benchmark_js_path):
        try:
            dest_js_path = os.path.join(episode_dir, "benchmark_sem.js")
            shutil.copy2(benchmark_js_path, dest_js_path)
            logger.info(f"💾 已保存 benchmark_sem.js 到: {dest_js_path}")
        except Exception as e:
            logger.warning(f"⚠️  复制 benchmark_sem.js 失败: {e}")
    else:
        logger.warning(f"⚠️  benchmark_sem.js 文件不存在: {benchmark_js_path}")

    logger.info(f"开始 SEM 轻量级测试 - Agent: {agent_name}, Model: {model}")
    logger.info(f"SEM URL: {sem_url}")
    logger.info(f"结果目录: {episode_dir}")

    agent_kwargs["model"] = model or agent_kwargs.get("model", "ByteDance-Seed/UI-TARS-1.5-7B")
    agent_kwargs["model_type"] = agent_kwargs.get("model_type", "doubao")
    agent_kwargs["max_tokens"] = agent_kwargs.get("max_tokens", 3000)
    agent_kwargs["temperature"] = agent_kwargs.get("temperature", 0)
    agent_kwargs["top_p"] = agent_kwargs.get("top_p", None)
    agent_kwargs["max_trajectory_length"] = agent_kwargs.get("max_trajectory_length", None)
    agent_kwargs["max_image_history_length"] = agent_kwargs.get("max_image_history_length", 5)
    agent_kwargs["use_thinking"] = agent_kwargs.get("use_thinking", False)
    agent_kwargs["language"] = agent_kwargs.get("language", "Chinese")

    if os.environ.get("API_URL") and not check_api_connection(timeout=10):
        logger.warning("   API 连接检查失败，但将继续尝试运行测试")

    agent = get_agent(agent_name, **agent_kwargs)

    instruction_override = None
    if instruction_file and os.path.isfile(instruction_file):
        with open(instruction_file, "r", encoding="utf-8") as f:
            instruction_override = f.read().strip()
        logger.info(f"从文件加载任务指令: {instruction_file}")

    agent_screen_size = (1920, 1080)
    try:
        if hasattr(agent, 'screen_size') and agent.screen_size:
            agent_screen_size = tuple(agent.screen_size) if isinstance(agent.screen_size, (list, tuple)) else (1920, 1080)
        elif hasattr(agent, 'screen_width') and hasattr(agent, 'screen_height'):
            agent_screen_size = (agent.screen_width, agent.screen_height)
    except Exception:
        pass

    viewport_width, viewport_height = agent_screen_size

    def _launch_chromium(playwright_inst, headless_flag: bool, prefer_system_chrome: bool):
        """优先系统 Chrome；失败则回退到 Playwright 自带 Chromium（并去掉 channel，避免重试仍失败）。"""
        opts = {"headless": headless_flag}
        if prefer_system_chrome:
            opts["channel"] = "chrome"
            logger.info("尝试使用 channel=chrome（需本机已安装 Google Chrome 或已执行 playwright install chrome）")
        try:
            return playwright_inst.chromium.launch(**opts), headless_flag
        except Exception as e:
            if prefer_system_chrome:
                logger.warning(
                    "系统 Chrome 启动失败（常见原因：未安装 Google Chrome 或未执行 playwright install chrome），"
                    "回退到 Playwright 自带 Chromium: %s",
                    e,
                )
                fallback = {"headless": headless_flag}
                try:
                    return playwright_inst.chromium.launch(**fallback), headless_flag
                except Exception as e2:
                    logger.warning("自带 Chromium 启动失败，改 headless 再试: %s", e2)
                    fallback["headless"] = True
                    return playwright_inst.chromium.launch(**fallback), True
            logger.warning(f"启动浏览器失败，尝试 headless 模式: {e}")
            opts["headless"] = True
            if "channel" in opts:
                del opts["channel"]
            return playwright_inst.chromium.launch(**opts), True

    with sync_playwright() as p:
        logger.info(f"启动浏览器 (headless={headless})...")
        browser, headless = _launch_chromium(p, headless, use_system_chrome)

        context = browser.new_context(
            viewport={'width': viewport_width, 'height': viewport_height},
            device_scale_factor=1.0
        )
        page = context.new_page()

        try:
            logger.info(f"打开 SEM 模拟器: {sem_url}")
            page.goto(sem_url, wait_until='networkidle', timeout=60000)
            logger.info("等待页面完全加载...")
            time.sleep(5)

            try:
                page.wait_for_load_state("domcontentloaded", timeout=10000)
                page.wait_for_load_state("load", timeout=10000)
                logger.info("✅ 页面加载完成")
            except Exception as e:
                logger.warning(f"等待页面加载时出现警告: {e}")

            time.sleep(2)
            actual_viewport = page.viewport_size
            actual_screen_width = actual_viewport['width']
            actual_screen_height = actual_viewport['height']

            logger.info("等待 benchmark logger 初始化...")
            time.sleep(3)

            try:
                benchmark_status = page.evaluate("""
                    () => {
                        return {
                            hasBenchmark: typeof window.SEM_BENCHMARK !== 'undefined',
                            hasEpisode: typeof window.SEM_BENCHMARK !== 'undefined' && 
                                        typeof window.SEM_BENCHMARK.episode !== 'undefined',
                            currentUrl: window.location.href,
                            pathname: window.location.pathname
                        };
                    }
                """)

                if benchmark_status.get('hasBenchmark'):
                    logger.info("✅ Benchmark 对象已初始化")
                else:
                    logger.error("❌ Benchmark 对象未初始化！")
            except Exception as e:
                logger.warning(f"检查 benchmark 初始化状态时出错: {e}")

            try:
                page.evaluate(f"""
                    () => {{
                        if (typeof window.SEM_BENCHMARK !== 'undefined' && 
                            typeof window.SEM_BENCHMARK.episode !== 'undefined') {{
                            window.SEM_BENCHMARK.episode.agent_name = '{agent_name}';
                        }}
                    }}
                """)
            except Exception as e:
                logger.debug(f"设置 agent 名称失败: {e}")

            logger.info("开始执行任务...")
            full_instruction = get_full_instruction(
                instruction_override=instruction_override,
                system_prompt_override=system_prompt
            )
            logger.info(f"任务指令: {full_instruction[:200]}...")

            observation = page_to_observation(page, full_instruction)
            step_count = 0
            mouse_pos = None
            status_obj = {"success": False}

            while step_count < max_steps:
                logger.info("")
                logger.info("=" * 60)
                logger.info(f"=== Step {step_count + 1}/{max_steps} ===")
                logger.info("=" * 60)

                try:
                    logger.info("🤖 Agent 正在生成动作...")
                    response, actions = agent.predict(full_instruction, observation)

                    if response is None and (actions is None or actions == ["FAIL"] or actions == ["DONE"]):
                        logger.error("❌ Agent API 调用失败或返回空结果")
                        step_count += 1
                        time.sleep(2)
                        continue

                    logger.info(f"📋 Agent 生成的动作数量: {len(actions) if actions else 0}")

                    if actions and actions[0] in ["FAIL", "DONE", "client error"]:
                        logger.warning(f"⚠️  Agent 返回失败动作: {actions[0]}")
                        step_count += 1
                        time.sleep(1)
                        continue

                except AttributeError:
                    actions = [agent.step(observation, full_instruction)]
                    response = None
                except Exception as e:
                    logger.error(f"❌ Agent 生成动作时出错: {e}")
                    step_count += 1
                    time.sleep(2)
                    continue

                if not actions or len(actions) == 0:
                    logger.warning("⚠️  Agent 没有生成任何动作，跳过此步骤")
                    step_count += 1
                    time.sleep(1)
                    continue

                for action in actions:
                    logger.info(f"   执行动作: {str(action)[:200]}")

                    try:
                        before_screenshot = page.screenshot(type='png')
                        before_path = os.path.join(episode_dir, f"step_{step_count + 1}_before.png")
                        with open(before_path, "wb") as f:
                            f.write(before_screenshot)
                    except Exception as e:
                        logger.warning(f"保存执行前截图失败: {e}")

                    action_result = execute_action_on_page(
                        page, action, agent_screen_size, (actual_screen_width, actual_screen_height),
                        model=agent_kwargs.get("model"), model_type=agent_kwargs.get("model_type"),
                    )
                    if isinstance(action_result, tuple):
                        action_success, mouse_pos = action_result
                    else:
                        action_success = action_result
                        mouse_pos = None

                    if not action_success:
                        logger.warning(f"⚠️  动作执行可能失败: {action}")
                    else:
                        logger.info(f"✅ 动作执行成功")

                    time.sleep(1.5)
                    try:
                        page.wait_for_load_state("networkidle", timeout=3000)
                    except:
                        pass
                    time.sleep(1.5)

                    step_count += 1
                    new_observation = page_to_observation(page, full_instruction, mouse_pos=mouse_pos)

                    try:
                        after_screenshot = new_observation['screenshot']
                        after_path = os.path.join(episode_dir, f"step_{step_count}_after.png")
                        with open(after_path, "wb") as f:
                            f.write(after_screenshot)
                    except Exception as e:
                        logger.warning(f"保存执行后截图失败: {e}")

                    observation = new_observation

                    try:
                        status = page.evaluate("""
                            () => {
                                if (typeof window.SEM_BENCHMARK !== 'undefined') {
                                    const ep = window.SEM_BENCHMARK.episode;
                                    const subtasks = Object.values(ep._subtask_map);
                                    const allSuccess = subtasks.every(st => st.success);
                                    return JSON.stringify({success: allSuccess, subtasks: subtasks});
                                }
                                return JSON.stringify({success: false, subtasks: []});
                            }
                        """)
                        if status:
                            status_obj = json.loads(status)
                            if status_obj.get("success"):
                                logger.info("✅ 所有子任务已完成！")
                                break
                    except Exception as e:
                        logger.debug(f"检查任务状态时出错: {e}")

                    if status_obj.get("success"):
                        break

                if status_obj.get("success"):
                    break

            logger.info("=" * 60)
            logger.info("提取 benchmark 日志...")
            benchmark_log = extract_benchmark_log(page, agent_steps=step_count)

            test_success = False
            if benchmark_log:
                log_path = os.path.join(episode_dir, f"{benchmark_log.get('episode_id', 'episode')}.json")
                with open(log_path, "w", encoding="utf-8") as f:
                    json.dump(benchmark_log, f, indent=2, ensure_ascii=False)
                logger.info(f"✅ Benchmark 日志已保存: {log_path}")

                test_success = benchmark_log.get('success', False)

                print("\n" + "=" * 60)
                print("测试结果摘要")
                print("=" * 60)
                print(f"任务ID: {benchmark_log.get('task_id')}")
                print(f"Episode ID: {benchmark_log.get('episode_id')}")
                print(f"Agent: {benchmark_log.get('agent_name', agent_name)}")
                print(f"成功: {'✅ 是' if test_success else '❌ 否'}")

                if "summary" in benchmark_log:
                    s = benchmark_log["summary"]
                    # 实际步骤数 = 本 episode 内被记录的「操作」次数（每次点击/滑块完成等会 recordStep 一次）
                    print(f"实际步骤数: {s.get('actual_steps', 0)}")
                    print(f"步骤效率: {s.get('step_efficiency', 0):.2%}")

                if "subtasks" in benchmark_log:
                    print("\n子任务完成情况:")
                    # 尝试次数 = 该子任务对应控件被操作到的次数（仅当 Agent 触发了该按钮/滑块等才 +1，未操作则为 0）
                    for st in benchmark_log["subtasks"]:
                        status = "✅" if st.get("success") else "❌"
                        print(f"  {status} {st.get('name')}: {st.get('attempts', 0)} 次尝试")
                print("=" * 60)
            else:
                logger.warning("⚠️  无法提取 benchmark 日志")
                placeholder_log = {
                    "error": "无法提取 benchmark 日志",
                    "reason": "window.SEM_BENCHMARK 对象可能未正确初始化",
                    "episode_dir": episode_dir,
                    "timestamp": datetime.now().isoformat(),
                    "agent_name": agent_name,
                    "note": "请检查 benchmark_sem.js 是否正确加载到页面中"
                }
                log_path = os.path.join(episode_dir, "benchmark_log_extraction_failed.json")
                with open(log_path, "w", encoding="utf-8") as f:
                    json.dump(placeholder_log, f, indent=2, ensure_ascii=False)

        except Exception as e:
            logger.error(f"测试过程中出错: {e}", exc_info=True)
            test_success = False
            benchmark_log = None
        finally:
            logger.info("测试完成，浏览器将在 10 秒后关闭...")
            time.sleep(10)
            browser.close()

        return {
            "success": test_success,
            "benchmark_log": benchmark_log,
            "episode_dir": episode_dir
        }


def run_multiple_tests(
    num_runs: int = 1,
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps: int = 50,
    sem_url: str = "http://localhost:8080/static/simulator/sem_simulator/SEM_simulator.html",
    result_dir: str = get_results_dir("sem"),
    headless: bool = False,
    use_system_chrome: bool = False,
    instruction_file: str = None,
    system_prompt: str = None,
    **agent_kwargs
):
    """运行多次测试并统计结果"""
    logger.info("=" * 80)
    logger.info(f"开始运行 {num_runs} 次测试")
    logger.info("=" * 80)

    results = []
    success_count = 0
    failed_count = 0

    for run_num in range(1, num_runs + 1):
        logger.info("")
        logger.info("=" * 80)
        logger.info(f"第 {run_num}/{num_runs} 次测试")
        logger.info("=" * 80)

        try:
            result = run_sem_test_lightweight(
                agent_name=agent_name,
                model=model,
                max_steps=max_steps,
                sem_url=sem_url,
                result_dir=result_dir,
                headless=headless,
                use_system_chrome=use_system_chrome,
                instruction_file=instruction_file,
                system_prompt=system_prompt,
                **agent_kwargs
            )

            results.append(result)
            if result["success"]:
                success_count += 1
                logger.info(f"✅ 第 {run_num} 次测试成功")
            else:
                failed_count += 1
                logger.info(f"❌ 第 {run_num} 次测试失败")
        except Exception as e:
            logger.error(f"❌ 第 {run_num} 次测试出错: {e}")
            failed_count += 1
            results.append({"success": False, "benchmark_log": None, "episode_dir": None, "error": str(e)})

        if run_num < num_runs:
            logger.info(f"等待 3 秒后开始下一次测试...")
            time.sleep(3)

    logger.info("")
    logger.info("=" * 80)
    logger.info("测试统计摘要")
    logger.info("=" * 80)
    logger.info(f"总测试次数: {num_runs}")
    logger.info(f"成功次数: {success_count} ✅")
    logger.info(f"失败次数: {failed_count} ❌")
    logger.info(f"成功率: {success_count / num_runs * 100:.2f}%")
    logger.info("=" * 80)

    stats = {
        "total_runs": num_runs,
        "success_count": success_count,
        "failed_count": failed_count,
        "success_rate": success_count / num_runs if num_runs > 0 else 0,
        "results": [
            {
                "run": i + 1,
                "success": r["success"],
                "episode_dir": r.get("episode_dir"),
                "episode_id": r.get("benchmark_log", {}).get("episode_id") if r.get("benchmark_log") else None
            }
            for i, r in enumerate(results)
        ],
        "timestamp": datetime.now().isoformat(),
        "agent_name": agent_name,
        "model": model
    }

    stats_path = os.path.join(result_dir, f"test_statistics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    os.makedirs(result_dir, exist_ok=True)
    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    logger.info(f"💾 统计结果已保存到: {stats_path}")

    return stats


def main():
    parser = argparse.ArgumentParser(description="SEM Benchmark 轻量级测试脚本")

    parser.add_argument("--agent", type=str, default="uitars15_v2",
                       choices=["uitars15_v2", "openai_compat_chat", "uitars15_v1", "uitars", "o3", "gui_owl_vllm"],
                       help="要使用的 agent；GUI-Owl+vLLM 用 gui_owl_vllm")
    parser.add_argument("--model", type=str, default="ByteDance-Seed/UI-TARS-1.5-7B",
                       help="模型名称")
    parser.add_argument("--model_type", type=str, default="doubao",
                       choices=["doubao", "qwen25"],
                       help="模型类型")
    parser.add_argument("--temperature", type=float, default=0,
                       help="温度参数")
    parser.add_argument("--max_tokens", type=int, default=3000,
                       help="最大 token 数")
    parser.add_argument("--api_key", type=str, default=None,
                       help="API Key")
    parser.add_argument("--api_url", type=str, default=None,
                       help="API URL")

    parser.add_argument("--sem_url", type=str,
                       default="http://localhost:8080/static/simulator/sem_simulator/SEM_simulator.html",
                       help="SEM 模拟器 URL")
    parser.add_argument("--max_steps", type=int, default=50,
                       help="最大步骤数")
    parser.add_argument("--headless", action="store_true",
                       help="无头模式运行")
    parser.add_argument("--use-system-chrome", action="store_true",
                       help="使用系统已安装的 Chrome，无需 playwright install chromium")
    parser.add_argument("--instruction-file", type=str, default=None,
                       help="从文件加载任务指令，覆盖脚本中的 SEM_TASK_INSTRUCTION")
    parser.add_argument("--system-prompt", type=str, default=None,
                       help="覆盖脚本中的 SEM_SYSTEM_PROMPT（角色/约束等）")

    parser.add_argument("--result_dir", type=str, default=get_results_dir("sem"),
                       help="结果保存目录")
    parser.add_argument("--num_runs", type=int, default=1,
                       help="测试运行次数")

    args = parser.parse_args()

    if args.api_key:
        os.environ["API_KEY"] = args.api_key
        os.environ["DOUBAO_API_KEY"] = args.api_key
    if args.api_url:
        os.environ["API_URL"] = args.api_url
        os.environ["DOUBAO_API_URL"] = args.api_url.rstrip("/")

    logger.info("=" * 60)
    logger.info("API 配置:")
    logger.info(f"  API Key: {os.environ.get('API_KEY', '未设置')[:20]}...")
    logger.info(f"  API URL: {os.environ.get('API_URL', '未设置')}")
    logger.info(f"  DOUBAO_API_URL (agent 实际使用): {os.environ.get('DOUBAO_API_URL', '未设置')}")
    logger.info(f"  模型: {args.model}")
    logger.info(f"  测试次数: {args.num_runs}")
    logger.info("=" * 60)

    run_kwargs = dict(
        agent_name=args.agent,
        model=args.model,
        model_type=args.model_type,
        temperature=args.temperature,
        max_tokens=args.max_tokens,
        max_steps=args.max_steps,
        sem_url=args.sem_url,
        result_dir=args.result_dir,
        headless=args.headless,
        use_system_chrome=args.use_system_chrome,
        instruction_file=args.instruction_file,
        system_prompt=args.system_prompt,
    )
    if args.num_runs > 1:
        run_multiple_tests(num_runs=args.num_runs, **run_kwargs)
    else:
        run_sem_test_lightweight(**run_kwargs)


if __name__ == "__main__":
    main()
