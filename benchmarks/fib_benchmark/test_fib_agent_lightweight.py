"""
FIB Benchmark 轻量级测试脚本
直接使用 Playwright 控制浏览器，无需虚拟化环境

使用方法:
1. 确保 FIB 模拟器正在运行（http://localhost:8080）
2. 运行此脚本：
   python test_fib_agent_lightweight.py --model your_model_name
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

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BENCHMARKS = os.path.dirname(_SCRIPT_DIR)
ROOT = os.path.dirname(_BENCHMARKS)
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "OSWorld-main"))
sys.path.insert(0, _BENCHMARKS)
from benchmarks.paths import get_results_dir
from benchmarks.utils import save_success_episode

# 设置默认 API 配置
if "DOUBAO_API_KEY" not in os.environ:
    os.environ["DOUBAO_API_KEY"] = "sk-ui-tars-asd1231hascx12"
if "DOUBAO_API_URL" not in os.environ:
    os.environ["DOUBAO_API_URL"] = "http://180.184.148.133:11149/v1/chat/completions"

from playwright.sync_api import sync_playwright, Page
from mm_agents.uitars15_v2 import UITarsAgent
from mm_agents.uitars15_v1 import UITARSAgent as UITarsAgentV1
from mm_agents.uitars_agent import UITARSAgent as UITarsAgentBase
from mm_agents.o3_agent import O3Agent
from PIL import Image
import io
import base64
from benchmarks.lightweight_observation_utils import (
    OBSERVATION_MODE_A11Y_TREE,
    OBSERVATION_MODE_SCREENSHOT,
    OBSERVATION_MODE_SCREENSHOT_720P,
    build_lightweight_observation,
    normalize_observation_mode,
)
from benchmarks.coord_postprocess import is_claude_1440_model_type, scale_claude_1440_to_viewport

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)  # 确保输出到控制台
    ]
)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)  # 确保日志级别正确

# 不做坐标转换的模型：模型输出什么坐标就执行什么坐标（如 doubao-seed / 本地 vLLM Qwen 直接按 viewport 或截图空间给坐标）
MODELS_NO_COORD_CONVERT = frozenset([
    "doubao-seed-1-6-vision-250815",
    "kimi-k2.5",
    "Pro/moonshotai/Kimi-K2.5",
    "qwen3.5-9b",
])

_MODELS_NO_COORD_CONVERT_LOWER = frozenset(m.lower() for m in MODELS_NO_COORD_CONVERT)


def should_skip_coord_convert(model, agent_name=None, model_type=None):
    """为 True 时 execute_action_on_page 不再把坐标从 agent 分辨率缩放到 viewport。"""
    mt = (model_type or "").strip().lower().replace("-", "_")
    if is_claude_1440_model_type(mt):
        return True
    if mt == "evocua" or mt.startswith("evocua_"):
        return True
    an = (agent_name or "").strip().lower()
    if an in {"openai_compat_chat", "gui_owl_vllm", "vlaa_gui"}:
        return True
    if model and str(model).strip().lower() in _MODELS_NO_COORD_CONVERT_LOWER:
        return True
    if model and "gui-owl" in str(model).lower():
        return True
    if model and "qwen3.5" in str(model).lower():
        return True
    return False


def _resolve_exec_coords(
    ox: float,
    oy: float,
    *,
    no_coord_convert: bool,
    model_type: str | None,
    actual_width: int,
    actual_height: int,
    agent_width: int,
    agent_height: int,
) -> tuple[int, int, int, int]:
    if is_claude_1440_model_type(model_type):
        x, y = scale_claude_1440_to_viewport(ox, oy)
        max_x, max_y = actual_width, actual_height
    elif no_coord_convert:
        x, y = int(ox), int(oy)
        max_x, max_y = actual_width, actual_height
    else:
        x = int(ox / agent_width * 1000)
        y = int(oy / agent_height * 1000)
        max_x, max_y = 1920, 1080
    if x > max_x or y > max_y or x < 0 or y < 0:
        x = max(0, min(x, max_x - 1))
        y = max(0, min(y, max_y - 1))
    return x, y, max_x, max_y


# FIB 任务指令（与 benchmark 子任务 F1–F20 对应，完整 Si Wafer 流程）
FIB_TASK_INSTRUCTION = """在 FIB 模拟器中完成 Si Wafer 的完整流程（从进样到截面制备与成像结束）。请按顺序完成以下步骤。

【第一步：选择 FIB 模拟器】
0. 若当前在模拟器选择页面（有 X-ray Diffraction、Focused Ion Beam 等图标），请先点击「Focused Ion Beam」或 FIB 图标，进入 FIB 模拟器页面后再继续后续步骤。

【进样与电子束】
1. 点击 VENT 左侧的按钮中间进行放气，等待完成后再点击 PUMP 左侧的按钮中间进行抽真空
2. 在 SAMPLE 下拉框中选择 Si Wafer
3. 电子束：ACC VOLTAGE 5Kv、BEAM CURRENT 0.1nA，点击电子束 HT
4. 电子束 MAGNIFICATION 500x，点击 LIVE VIEW，调节 FOCUS，点击 AUTO BRIGHTNESS & CONTRAST，点击 CENTRE FEATURE 并在 e beam view 中点击 X 特征居中
5. MAGNIFICATION 调到 3000x，WD 选 7mm；TILT 选 10°
6. 用 STAGE Z 将特征调回中心，点击电子束 LIVE VIEW 停止；再设 TILT 52°，调节 Stage Z，点击 AUTO BRIGHTNESS，勾选 Surface，必要时 Centre Feature

【离子束与第一次铣削】
7. 离子束 ACC VOLTAGE 30Kv、BEAM CURRENT 10pA，点击离子束 HT，MAGNIFICATION 3000x，点击离子束 LIVE VIEW，用 BEAM SHIFT 将特征居中，再点击 LIVE VIEW 停止
8. PATTERN 选 Rectangular Si milling，将黄色方框拖到蓝色框内，点击 START，等待完成后点击 DELETE PATTERN

【第二块矩形与 Pt 沉积】
9. 离子束 BEAM CURRENT 选 30nA，再次选 Rectangular Si milling，拖放后 START；完成后 DELETE PATTERN，BEAM CURRENT 调回 10pA
10. 勾选 Pt Needle 插入针；PATTERN 选 Pt Deposition，拖放到蓝色框内，START（可做两次沉积）
11. 离子束 MAGNIFICATION 5000x，点击 SNAPSHOT

【截面切割与清理】
12. PATTERN 选 Cross Section Cutting，拖放到蓝色框，BEAM CURRENT 选 3nA，START；完成后 PATTERN 选 Cleaning Cross Section Cutting，BEAM CURRENT 选 0.1nA，拖放后 START
13. 勾选 Cross Section 做截面成像，必要时多次 Capture；最后将 Tilt 设为 0°，完成流程（Si 路径会提示 Centre Stage）

请按以上顺序完成整个任务。"""


def get_agent(agent_name: str, **kwargs):
    """根据名称获取对应的 agent"""
    if agent_name == "uitars15_v2":
        # UITarsAgent 需要的参数
        required_params = {
            "model": kwargs.get("model", "ByteDance-Seed/UI-TARS-1.5-7B"),
            "model_type": kwargs.get("model_type", "doubao"),
            "max_tokens": kwargs.get("max_tokens", 3000),
            "top_p": kwargs.get("top_p", None),
            "temperature": kwargs.get("temperature", 0),
            "max_trajectory_length": kwargs.get("max_trajectory_length", None),
            "max_image_history_length": kwargs.get("max_image_history_length", 5),
            "use_thinking": kwargs.get("use_thinking", False),
            "language": kwargs.get("language", "Chinese"),
        }
        return UITarsAgent(**required_params)
    
    elif agent_name == "uitars15_v1":
        # UITARSAgent (v1) 需要 runtime_conf
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
            max_trajectory_length=kwargs.get("max_trajectory_length", 50),
            model_type=kwargs.get("model_type", "qwen25vl"),
        )
    
    elif agent_name == "uitars":
        # UITARSAgent (base) 需要 runtime_conf
        runtime_conf = kwargs.get("runtime_conf", {
            "infer_mode": "qwen2vl_user",
            "prompt_style": "qwen2vl_user",
            "input_swap": True,
            "temperature": kwargs.get("temperature", 0),
            "top_p": kwargs.get("top_p", 0.9),
            "max_tokens": kwargs.get("max_tokens", 3000),
            "language": kwargs.get("language", "Chinese"),
            "max_steps": kwargs.get("max_steps", 50),
            "history_n": kwargs.get("max_image_history_length", 5),
            "screen_height": 1080,
            "screen_width": 1920,
        })
        return UITarsAgentBase(
            model=kwargs.get("model", "ByteDance-Seed/UI-TARS-1.5-7B"),
            runtime_conf=runtime_conf,
            max_trajectory_length=kwargs.get("max_trajectory_length", 50),
            observation_type=kwargs.get("observation_type", "screenshot"),
        )
    
    elif agent_name == "openai_compat_chat":
        from benchmarks.openai_compat_support import create_openai_compat_chat_agent
        return create_openai_compat_chat_agent(**kwargs)

    elif agent_name == "vlaa_gui":
        from benchmarks.vlaa_gui_support import get_vlaa_gui_agent
        return get_vlaa_gui_agent(**kwargs)

    elif agent_name == "o3":
        return O3Agent(
            model=kwargs.get("model", "o3"),
            max_tokens=kwargs.get("max_tokens", 3000),
            max_steps=kwargs.get("max_steps", 50),
        )

    elif agent_name == "gui_owl_vllm":
        from mm_agents.gui_owl_vllm_agent import GuiOwlVllmAgent
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


def infer_current_fib_subtask(page: Page):
    try:
        return page.evaluate("""
            () => {
                const api = window.FIB_BENCHMARK_API;
                if (api && typeof api.inferCurrentSubtaskId === 'function') {
                    return api.inferCurrentSubtaskId();
                }
                return null;
            }
        """)
    except Exception:
        return None


def record_fib_agent_action(page: Page, action, subtask_id=None):
    try:
        page.evaluate(
            """
            (payload) => {
                const api = window.FIB_BENCHMARK_API;
                if (api && typeof api.recordAgentAction === 'function') {
                    api.recordAgentAction(payload.subtaskId || null, payload.actionText || "");
                }
            }
            """,
            {
                "subtaskId": subtask_id,
                "actionText": str(action),
            },
        )
    except Exception:
        pass

def add_mouse_indicator_to_page(page: Page, x: int, y: int):
    """在页面上添加鼠标位置指示器"""
    try:
        page.evaluate(f"""
            () => {{
                // 移除旧的指示器
                const oldIndicator = document.getElementById('mouse-indicator');
                if (oldIndicator) {{
                    oldIndicator.remove();
                }}
                
                // 创建新的指示器
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
                
                // 3秒后自动移除
                setTimeout(() => {{
                    indicator.remove();
                }}, 3000);
            }}
        """)
    except Exception as e:
        logger.debug(f"添加鼠标指示器失败: {e}")

def add_mouse_marker_to_screenshot(screenshot_bytes: bytes, x: int, y: int) -> bytes:
    """在截图上标记鼠标位置"""
    try:
        from PIL import Image, ImageDraw
        
        # 打开图片
        img = Image.open(io.BytesIO(screenshot_bytes))
        draw = ImageDraw.Draw(img)
        
        # 绘制鼠标位置标记（红色圆圈和十字）
        radius = 15
        # 外圈
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], 
                    outline='red', width=3)
        # 内圈
        draw.ellipse([x - 5, y - 5, x + 5, y + 5], 
                    fill='red', outline='red')
        # 十字线
        draw.line([x - radius - 5, y, x + radius + 5, y], fill='red', width=2)
        draw.line([x, y - radius - 5, x, y + radius + 5], fill='red', width=2)
        
        # 保存回字节
        output = io.BytesIO()
        img.save(output, format='PNG')
        return output.getvalue()
    except Exception as e:
        logger.debug(f"在截图上标记鼠标位置失败: {e}")
        return screenshot_bytes

def page_to_observation(
    page: Page,
    instruction: str,
    mouse_pos=None,
    observation_mode: str = OBSERVATION_MODE_SCREENSHOT,
):
    """将 Playwright Page 转换为 agent 观察格式"""
    global _last_mouse_pos
    try:
        observation, _last_mouse_pos = build_lightweight_observation(
            page,
            instruction,
            observation_mode=observation_mode,
            mouse_pos=mouse_pos,
            last_mouse_pos=_last_mouse_pos,
            annotate_mouse_fn=add_mouse_marker_to_screenshot,
        )
        if observation.get("screenshot"):
            logger.debug(f"获取截图成功，大小: {len(observation['screenshot'])} bytes")
    except Exception as e:
        logger.error(f"获取截图失败: {e}")
        observation = {
            "screenshot": b"",
            "accessibility_tree": None,
            "terminal": None,
            "instruction": instruction,
        }
    return observation


def execute_action_on_page(page: Page, action, agent_screen_size: tuple = (1920, 1080), actual_screen_size: tuple = None, no_coord_convert: bool = False, model_type: str = None):
    """在页面上执行动作
    
    action 可能是：
    - 字符串（pyautogui 代码）
    - 列表（包含动作字符串）
    - 字典（结构化动作）
    
    agent_screen_size: Agent 期望的屏幕分辨率 (width, height)，默认 (1920, 1080)
    no_coord_convert: 若为 True，不进行坐标转换，模型输出的坐标直接执行（用于 doubao-seed 等）
    
    返回: (success: bool, mouse_pos: tuple or None)
    """
    import re
    
    try:
        # 如果是列表，取第一个元素
        if isinstance(action, list):
            if len(action) == 0:
                return (False, None)
            action = action[0]
        
        # 如果是字符串（pyautogui 代码），解析并转换为 Playwright 操作
        if isinstance(action, str):
            if action in ["DONE", "WAIT", "FAIL"]:
                if action == "WAIT":
                    time.sleep(5)
                    logger.info("等待 5 秒")
                elif action == "DONE":
                    logger.info("任务完成")
                return (True, None)
            
            # 解析 pyautogui 代码并转换为 Playwright 操作
            logger.info(f"执行动作代码: {action}")
            result = parse_and_execute_pyautogui(
                page,
                action,
                agent_screen_size,
                actual_screen_size,
                no_coord_convert=no_coord_convert,
                model_type=model_type,
            )
            # parse_and_execute_pyautogui 现在返回 (success, mouse_pos)
            if isinstance(result, tuple):
                return result
            else:
                return (result, None)
        
        # 如果是字典（结构化动作）
        elif isinstance(action, dict):
            action_type = action.get("function", "")
            params = action.get("args", {})
            
            if action_type == "click":
                start_box = params.get("start_box", "")
                if start_box:
                    coords = re.findall(r'[\d.]+', start_box)
                    if len(coords) >= 2:
                        x = float(coords[0])
                        y = float(coords[1])
                        if x <= 1.0 and y <= 1.0:
                            viewport = page.viewport_size
                            x = int(x * viewport['width'])
                            y = int(y * viewport['height'])
                        # 在页面上显示鼠标位置指示器
                        add_mouse_indicator_to_page(page, int(x), int(y))
                        time.sleep(0.2)
                        
                        # 使用 page.mouse.click() 来点击坐标
                        page.mouse.click(int(x), int(y))
                        logger.info(f"点击坐标: ({x}, {y})")
                        return (True, (int(x), int(y)))
            
            elif action_type == "type":
                content = params.get("content", "")
                if content:
                    page.keyboard.type(content)
                    logger.info(f"输入文本: {content}")
                    return (True, None)
        
        logger.warning(f"未支持的动作格式: {type(action)}")
        return (False, None)
        
    except Exception as e:
        logger.error(f"执行动作失败: {e}")
        return (False, None)


def scale_coordinates(x: float, y: float, 
                     agent_screen_width: int = 1920, 
                     agent_screen_height: int = 1080,
                     actual_screen_width: int = None,
                     actual_screen_height: int = None) -> tuple[int, int]:
    """
    将 Agent 生成的坐标转换到实际屏幕分辨率
    
    支持两种模式：
    1. 归一化坐标（0-1之间）：直接转换到实际分辨率
    2. 绝对坐标：从 Agent 期望分辨率缩放到实际分辨率
    
    Args:
        x, y: Agent 生成的坐标
        agent_screen_width, agent_screen_height: Agent 期望的屏幕分辨率（默认 1920x1080）
        actual_screen_width, actual_screen_height: 实际屏幕分辨率
    
    Returns:
        转换后的坐标 (x, y)
    """
    if actual_screen_width is None or actual_screen_height is None:
        return int(x), int(y)
    
    # 判断是否为归一化坐标
    # 严格检查：只有当坐标都在 0-1 范围内时，才认为是归一化坐标
    # UITarsAgent 通常生成绝对坐标（基于1920x1080），但也可能生成归一化坐标
    is_normalized = (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0)
    
    if is_normalized:
        # 归一化坐标：直接转换到实际分辨率
        scaled_x = x * actual_screen_width
        scaled_y = y * actual_screen_height
        logger.info(f"📐 归一化坐标转换: ({x:.4f}, {y:.4f}) [归一化] "
                    f"→ ({scaled_x:.1f}, {scaled_y:.1f}) [实际分辨率: {actual_screen_width}x{actual_screen_height}]")
    else:
        # 绝对坐标：从 Agent 期望分辨率缩放到实际分辨率
        if agent_screen_width == actual_screen_width and agent_screen_height == actual_screen_height:
            return int(x), int(y)
        
        scale_x = actual_screen_width / agent_screen_width
        scale_y = actual_screen_height / agent_screen_height
        
        scaled_x = x * scale_x
        scaled_y = y * scale_y
        
        logger.info(f"📐 绝对坐标缩放: ({x}, {y}) [Agent分辨率: {agent_screen_width}x{agent_screen_height}] "
                    f"→ ({scaled_x:.1f}, {scaled_y:.1f}) [实际分辨率: {actual_screen_width}x{actual_screen_height}]")
    
    return int(scaled_x), int(scaled_y)


def parse_and_execute_pyautogui(page: Page, code: str, agent_screen_size: tuple = (1920, 1080), actual_screen_size: tuple = None, no_coord_convert: bool = False, model_type: str = None):
    """解析 pyautogui 代码并转换为 Playwright 操作
    
    no_coord_convert: 若为 True，模型输出的坐标直接使用，不做 /1920*1000 等转换（用于 doubao-seed）
    """
    import re
    
    try:
        # 获取实际屏幕分辨率
        if actual_screen_size is None:
            # 如果没有提供，使用 viewport 大小（Playwright 的 mouse.click() 坐标是相对于 viewport 的）
            # 注意：不能使用 window.innerWidth/innerHeight，因为可能包含滚动条等，导致坐标偏移
            viewport = page.viewport_size
            actual_width = viewport['width']
            actual_height = viewport['height']
        else:
            actual_width, actual_height = actual_screen_size
        
        agent_width, agent_height = agent_screen_size
        
        logger.info(f"🖥️  屏幕分辨率信息:")
        logger.info(f"   Agent 期望分辨率: {agent_width}x{agent_height}")
        logger.info(f"   实际浏览器分辨率: {actual_width}x{actual_height}")
        if agent_width != actual_width or agent_height != actual_height:
            logger.warning(f"⚠️  分辨率不匹配！将进行坐标转换（支持归一化和绝对坐标）")
        # 第一步：移除 markdown 代码块标记和多余内容
        # 移除 ```python, ```py, ``` 等标记
        code = re.sub(r'```\w*\n?', '', code)  # 移除开头的 ```
        code = re.sub(r'```\n?', '', code)  # 移除结尾的 ```
        code = re.sub(r"'''", '', code)  # 移除三个单引号
        code = re.sub(r'"""', '', code)  # 移除三个双引号
        
        # 移除 "Thought:" 等前缀内容（如果存在）
        if 'Thought:' in code:
            # 提取 Action: 之后的内容
            action_match = re.search(r'Action:\s*(.*)', code, re.DOTALL)
            if action_match:
                code = action_match.group(1).strip()
        
        # 移除 "Action:" 前缀（如果存在）
        code = re.sub(r'^Action:\s*', '', code, flags=re.MULTILINE)
        
        # 第二步：清理代码：移除导入语句和注释
        lines = code.split('\n')
        cleaned_lines = []
        for line in lines:
            for stmt in line.split(';'):
                stmt = stmt.strip()
                if (
                    stmt.startswith('import ')
                    or stmt.startswith('from ')
                    or stmt.startswith('#')
                    or stmt.startswith("'''")
                    or stmt.startswith('"""')
                    or stmt.startswith('Observation:')
                    or stmt.startswith('Thought:')
                    or not stmt
                ):
                    continue
                cleaned_lines.append(stmt)
        
        # 重新组合代码
        code = '\n'.join(cleaned_lines)
        
        # 如果代码为空，返回 False
        if not code.strip():
            logger.warning("⚠️  代码为空，无法执行")
            return (False, None)
        
        logger.info(f"📝 清理后的代码: {code[:200]}...")
        # 解析 click(x, y) - 支持多种格式，使用多行模式
        # 支持整数和浮点数坐标
        click_patterns = [
            r'pyautogui\.click\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)(?:\s*,[^)]*)?\)',
            r'pyautogui\.click\((?:[^)]*?)x\s*=\s*(-?[\d.]+)\s*,\s*y\s*=\s*(-?[\d.]+)(?:[^)]*)\)',
            r'click\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)(?:\s*,[^)]*)?\)',
        ]
        x, y = None, None
        for pattern in click_patterns:
            click_match = re.search(pattern, code, re.MULTILINE)
            if click_match:
                original_x, original_y = float(click_match.group(1)), float(click_match.group(2))
                logger.info(f"📍 Agent 原始坐标: ({original_x}, {original_y})")
                x, y, max_x, max_y = _resolve_exec_coords(
                    original_x,
                    original_y,
                    no_coord_convert=no_coord_convert,
                    model_type=model_type,
                    actual_width=actual_width,
                    actual_height=actual_height,
                    agent_width=agent_width,
                    agent_height=agent_height,
                )
                logger.info(f"   最终执行坐标: ({x}, {y})")
                break
        
        # 如果成功提取到坐标，执行点击操作
        if x is not None and y is not None:
            if not is_claude_1440_model_type(model_type) and not no_coord_convert:
                max_x, max_y = 1920, 1080
            
            # 如果坐标超出范围，记录警告但继续执行
            if x > max_x or y > max_y or x < 0 or y < 0:
                logger.warning(f"⚠️  坐标超出范围: ({x}, {y}), 最大范围: ({max_x}, {max_y})")
                # 将坐标限制在范围内
                x = max(0, min(x, max_x - 1))
                y = max(0, min(y, max_y - 1))
                logger.info(f"   已调整坐标至: ({x}, {y})")
            logger.info(f"🖱️  准备点击坐标: ({x}, {y})")

            # 添加详细的坐标调试信息
            try:
                debug_info = page.evaluate(f"""
                        () => {{
                            const rect = document.documentElement.getBoundingClientRect();
                            const bodyRect = document.body.getBoundingClientRect();
                            const viewport = {{width: window.innerWidth, height: window.innerHeight}};
                            const screen = {{width: window.screen.width, height: window.screen.height}};
                            const devicePixelRatio = window.devicePixelRatio || 1;

                            // 检查页面是否有CSS缩放
                            const computedStyle = window.getComputedStyle(document.documentElement);
                            const transform = computedStyle.transform;
                            let scaleX = 1, scaleY = 1;
                            if (transform && transform !== 'none') {{
                                const matrix = new DOMMatrix(transform);
                                scaleX = matrix.m11;
                                scaleY = matrix.m22;
                            }}

                            return {{
                                documentElement: {{
                                    width: rect.width,
                                    height: rect.height,
                                    left: rect.left,
                                    top: rect.top
                                }},
                                body: {{
                                    width: bodyRect.width,
                                    height: bodyRect.height,
                                    left: bodyRect.left,
                                    top: bodyRect.top
                                }},
                                viewport: viewport,
                                screen: screen,
                                devicePixelRatio: devicePixelRatio,
                                scrollX: window.scrollX,
                                scrollY: window.scrollY,
                                cssScale: {{x: scaleX, y: scaleY}},
                                targetCoords: {{x: {x}, y: {y}}}
                            }};
                        }}
                    """)
                logger.info(f"📊 页面调试信息:")
                logger.info(f"   目标坐标: ({x}, {y})")
                logger.info(f"   Viewport: {debug_info['viewport']['width']}x{debug_info['viewport']['height']}")
                logger.info(f"   Document: {debug_info['documentElement']['width']}x{debug_info['documentElement']['height']}")
                logger.info(f"   Body: {debug_info['body']['width']}x{debug_info['body']['height']}")
                logger.info(f"   Scroll: ({debug_info['scrollX']}, {debug_info['scrollY']})")
                logger.info(f"   Device Pixel Ratio: {debug_info['devicePixelRatio']}")
                logger.info(f"   CSS Scale: {debug_info['cssScale']}")

                # 警告可能的坐标偏移原因
                dpr = debug_info['devicePixelRatio']
                css_scale = debug_info['cssScale']
                if dpr != 1.0:
                    logger.warning(f"⚠️  设备像素比不为1: {dpr}，这可能导致坐标偏移！")
                    logger.warning(f"   Playwright mouse.click() 使用CSS像素坐标，但高DPI可能影响定位")
                if css_scale['x'] != 1.0 or css_scale['y'] != 1.0:
                    logger.warning(f"⚠️  页面CSS缩放不为1: {css_scale}，这可能导致坐标偏移！")
                    logger.warning(f"   如果页面被CSS缩放，坐标计算需要考虑缩放因子")
            except Exception as e:
                logger.warning(f"获取页面调试信息失败: {e}")

            try:
                # 在页面上显示鼠标位置指示器
                add_mouse_indicator_to_page(page, x, y)
                time.sleep(0.2)  # 短暂延迟，让指示器显示

                # 使用 page.mouse.click() 来点击坐标
                page.mouse.click(x, y)
                logger.info(f"✅ 点击成功: ({x}, {y})")
                time.sleep(0.5)  # 短暂延迟
                return (True, (x, y))  # 返回成功状态和鼠标位置
            except Exception as e:
                logger.error(f"❌ 点击失败: ({x}, {y}), 错误: {e}")
                return (False, None)
        
        # 解析 doubleClick(x, y)
        double_click_patterns = [
            r'pyautogui\.doubleClick\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)(?:\s*,[^)]*)?\)',
            r'pyautogui\.doubleClick\((?:[^)]*?)x\s*=\s*(-?[\d.]+)\s*,\s*y\s*=\s*(-?[\d.]+)(?:[^)]*)\)',
            r'doubleClick\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)(?:\s*,[^)]*)?\)',
        ]
        for pattern in double_click_patterns:
            match = re.search(pattern, code, re.MULTILINE)
            if match:
                original_x, original_y = float(match.group(1)), float(match.group(2))
                logger.info(f"📍 Agent 原始坐标: ({original_x}, {original_y})")
                x, y, _, _ = _resolve_exec_coords(
                    original_x,
                    original_y,
                    no_coord_convert=no_coord_convert,
                    model_type=model_type,
                    actual_width=actual_width,
                    actual_height=actual_height,
                    agent_width=agent_width,
                    agent_height=agent_height,
                )
                logger.info(f"   最终执行坐标: ({x}, {y})")
                logger.info(f"🖱️  准备双击坐标: ({x}, {y})")
                try:
                    # 在页面上显示鼠标位置指示器
                    add_mouse_indicator_to_page(page, x, y)
                    time.sleep(0.2)
                    
                    # 使用 page.mouse.dblclick() 来双击坐标
                    page.mouse.dblclick(x, y)
                    logger.info(f"✅ 双击成功: ({x}, {y})")
                    time.sleep(0.5)
                    return (True, (x, y))
                except Exception as e:
                    logger.error(f"❌ 双击失败: ({x}, {y}), 错误: {e}")
                    return (False, None)
        
        # 解析 moveTo(x, y) + dragTo(x, y) 组合（Agent 输出拖拽时通常包含 moveTo 起点）
        move_to_pattern = r'pyautogui\.moveTo\(([\d.]+),\s*([\d.]+)\s*\)'
        move_match = re.search(move_to_pattern, code, re.MULTILINE)
        drag_patterns = [
            r'pyautogui\.dragTo\(([\d.]+),\s*([\d.]+)\s*\)',
            r'pyautogui\.dragTo\(([\d.]+),\s*([\d.]+)\s*,\s*duration\s*=\s*([\d.]+)\s*\)',
        ]
        for pattern in drag_patterns:
            drag_match = re.search(pattern, code, re.MULTILINE)
            if drag_match:
                # 目标坐标：dragTo 的参数
                original_x, original_y = float(drag_match.group(1)), float(drag_match.group(2))
                duration = float(drag_match.group(3)) if drag_match.lastindex >= 3 else 0.2
                logger.info(f"📍 dragTo 原始坐标: ({original_x}, {original_y}), duration={duration}")
                end_x, end_y, _, _ = _resolve_exec_coords(
                    original_x,
                    original_y,
                    no_coord_convert=no_coord_convert,
                    model_type=model_type,
                    actual_width=actual_width,
                    actual_height=actual_height,
                    agent_width=agent_width,
                    agent_height=agent_height,
                )

                start_x, start_y = None, None
                if move_match:
                    sx_raw, sy_raw = float(move_match.group(1)), float(move_match.group(2))
                    start_x, start_y, _, _ = _resolve_exec_coords(
                        sx_raw,
                        sy_raw,
                        no_coord_convert=no_coord_convert,
                        model_type=model_type,
                        actual_width=actual_width,
                        actual_height=actual_height,
                        agent_width=agent_width,
                        agent_height=agent_height,
                    )
                    logger.info(f"📍 moveTo 起点: ({start_x}, {start_y}) -> dragTo 终点: ({end_x}, {end_y})")

                logger.info(f"🖱️  准备拖拽: 起点={start_x} 终点=({end_x}, {end_y})")
                try:
                    # 正确拖拽顺序：先 move 到起点再 down，否则 down 在错误位置
                    if start_x is not None and start_y is not None:
                        page.mouse.move(start_x, start_y)
                        time.sleep(0.05)
                    page.mouse.down()
                    time.sleep(0.05)
                    # 使用 steps 产生插值 mousemove，帮助 GSAP Draggable 等库正确识别拖拽
                    steps = max(5, int(duration * 20))
                    page.mouse.move(end_x, end_y, steps=steps)
                    time.sleep(max(0, duration - 0.1))
                    page.mouse.up()
                    logger.info(f"✅ dragTo 成功: ({end_x}, {end_y})")
                    time.sleep(0.3)
                    return (True, (end_x, end_y))
                except Exception as e:
                    logger.error(f"❌ dragTo 失败: ({end_x}, {end_y}), 错误: {e}")
                    return (False, None)
        
        # 解析 typewrite(text) - 支持单引号和双引号
        type_patterns = [
            r"pyautogui\.typewrite\(['\"](.*?)['\"]\)",
            r"pyautogui\.typewrite\(['\"](.*?)['\"],\s*interval=.*?\)",  # 带 interval 参数
        ]
        for pattern in type_patterns:
            type_match = re.search(pattern, code, re.DOTALL | re.MULTILINE)
            if type_match:
                text = type_match.group(1)
                # 处理转义字符
                text = text.replace('\\n', '\n').replace('\\t', '\t')
                logger.info(f"⌨️  准备输入文本: {text[:50]}...")  # 只显示前50个字符
                try:
                    page.keyboard.type(text, delay=50)  # 添加延迟，模拟真实输入
                    logger.info(f"✅ 输入成功")
                    time.sleep(0.3)
                    return (True, None)
                except Exception as e:
                    logger.error(f"❌ 输入失败: {e}")
                    return (False, None)
        
        # 解析 press(key)
        press_patterns = [
            r"pyautogui\.press\(['\"](.*?)['\"]\)",
            r"pyautogui\.press\(['\"](.*?)['\"],\s*presses=.*?\)",  # 带 presses 参数
        ]
        for pattern in press_patterns:
            press_match = re.search(pattern, code, re.MULTILINE)
            if press_match:
                key = press_match.group(1)
                # 映射特殊按键
                key_map = {
                    'enter': 'Enter',
                    'tab': 'Tab',
                    'space': 'Space',
                    'esc': 'Escape',
                    'backspace': 'Backspace',
                    'delete': 'Delete',
                    'up': 'ArrowUp',
                    'down': 'ArrowDown',
                    'left': 'ArrowLeft',
                    'right': 'ArrowRight',
                }
                key = key_map.get(key.lower(), key)
                try:
                    page.keyboard.press(key)
                    logger.info(f"按键: {key}")
                    time.sleep(0.3)
                    return (True, None)
                except Exception as e:
                    logger.error(f"❌ 按键失败: {e}")
                    return (False, None)
        
        # 解析 hotkey(key1, key2, ...)
        hotkey_match = re.search(r"pyautogui\.hotkey\((.*?)\)", code, re.MULTILINE)
        if hotkey_match:
            keys_str = hotkey_match.group(1)
            raw_keys = [k.strip().strip('"\'') for k in keys_str.split(',') if k.strip()]
            key_alias = {
                'ctrl': 'Control',
                'control': 'Control',
                'alt': 'Alt',
                'shift': 'Shift',
                'cmd': 'Meta',
                'command': 'Meta',
                'win': 'Meta',
                'windows': 'Meta',
            }
            keys = [key_alias.get(k.lower(), k) for k in raw_keys]
            if not keys:
                logger.warning(f"⚠️ 无法解析 hotkey 参数: {keys_str}")
                return (False, None)
            try:
                combo = '+'.join(keys)
                page.keyboard.press(combo)
                logger.info(f"✅ 组合键: {combo}")
                time.sleep(0.3)
                return (True, None)
            except Exception as e:
                logger.error(f"❌ 组合键失败: {e}")
                return (False, None)
        
        # 解析 scroll：支持 scroll(clicks) 或 scroll(clicks, x=x, y=y)
        scroll_with_xy = re.search(
            r"pyautogui\.scroll\((-?\d+)\s*,\s*x\s*=\s*([\d.]+)\s*,\s*y\s*=\s*([\d.]+)\s*\)",
            code, re.MULTILINE | re.IGNORECASE
        )
        if scroll_with_xy:
            clicks = int(scroll_with_xy.group(1))
            orig_x, orig_y = float(scroll_with_xy.group(2)), float(scroll_with_xy.group(3))
            x, y, _, _ = _resolve_exec_coords(
                orig_x,
                orig_y,
                no_coord_convert=no_coord_convert,
                model_type=model_type,
                actual_width=actual_width,
                actual_height=actual_height,
                agent_width=agent_width,
                agent_height=agent_height,
            )
            try:
                add_mouse_indicator_to_page(page, x, y)
                time.sleep(0.1)
                page.mouse.move(x, y)
                time.sleep(0.1)
                if clicks > 0:
                    page.mouse.wheel(0, -clicks * 100)
                else:
                    page.mouse.wheel(0, abs(clicks) * 100)
                logger.info(f"✅ 在 ({x}, {y}) 滚动: {clicks} 次")
                time.sleep(0.5)
                return (True, (x, y))
            except Exception as e:
                logger.error(f"❌ 带坐标滚动失败: ({x}, {y}), 错误: {e}")
                return (False, None)

        scroll_match = re.search(r"pyautogui\.scroll\((-?\d+)\)", code, re.MULTILINE)
        if scroll_match:
            clicks = int(scroll_match.group(1))
            if clicks > 0:
                page.mouse.wheel(0, -clicks * 100)  # 向上滚动
            else:
                page.mouse.wheel(0, abs(clicks) * 100)  # 向下滚动
            logger.info(f"滚动: {clicks} 次")
            time.sleep(0.5)
            return (True, None)
        
        logger.warning(f"⚠️  无法解析的动作代码: {code[:200]}...")  # 显示前200个字符
        logger.warning(f"完整代码内容:\n{code}")
        return (False, None)
        
    except Exception as e:
        logger.error(f"❌ 解析动作代码失败: {e}")
        logger.error(f"代码内容:\n{code}")
        import traceback
        logger.debug(traceback.format_exc())
        return (False, None)


def check_api_connection(api_url: str = None, timeout: int = 5):
    """检查 API 连接是否可用"""
    import requests
    
    if api_url is None:
        api_url = os.environ.get("DOUBAO_API_URL", "")
    
    if not api_url:
        logger.warning("⚠️  API URL 未设置")
        return False
    
    try:
        # 尝试连接 API 服务器（只检查连接，不发送完整请求）
        logger.info(f"🔍 检查 API 连接: {api_url}")
        
        # 解析 URL
        from urllib.parse import urlparse
        parsed = urlparse(api_url)
        host = parsed.hostname
        port = parsed.port or (443 if parsed.scheme == 'https' else 80)
        
        # 简单的 TCP 连接测试
        import socket
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
        logger.error(f"   请检查：")
        logger.error(f"   1. API URL 是否正确: {api_url}")
        logger.error(f"   2. 网络连接是否正常")
        logger.error(f"   3. API 服务器是否运行")
        return False


def extract_benchmark_log(page: Page):
    """从浏览器中提取 FIB benchmark 日志"""
    try:
        if not page.evaluate("() => typeof window.FIB_BENCHMARK !== 'undefined'"):
            return None

        result = page.evaluate("""
            () => {
                if (typeof window.FIB_BENCHMARK !== 'undefined') {
                    if (typeof window.FIB_BENCHMARK.finalize === 'function') {
                        return JSON.stringify(window.FIB_BENCHMARK.finalize());
                    }
                    if (typeof window.FIB_BENCHMARK.episode !== 'undefined') {
                        return JSON.stringify(window.FIB_BENCHMARK.episode);
                    }
                }
                return null;
            }
        """)

        if result:
            return json.loads(result)
        return None
    except Exception as e:
        logger.error(f"❌ 无法从浏览器提取日志: {e}")
    return None


def run_fib_test_lightweight(
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps: int = 120,
    fib_url: str = "http://localhost:8080/",
    result_dir: str = get_results_dir("fib"),
    headless: bool = False,
    observation_mode: str = OBSERVATION_MODE_SCREENSHOT,
    **agent_kwargs
) -> dict:
    """轻量级 FIB 测试 - 直接使用 Playwright，无需虚拟化环境
    
    Returns:
        dict: 包含测试结果的字典，格式为:
            {
                "success": bool,  # 测试是否成功
                "benchmark_log": dict or None,  # benchmark 日志
                "episode_dir": str  # episode 目录路径
            }
    """
    
    os.makedirs(result_dir, exist_ok=True)
    observation_mode = normalize_observation_mode(observation_mode)
    if observation_mode == OBSERVATION_MODE_A11Y_TREE and agent_name != "uitars":
        raise ValueError("FIB a11y_tree mode currently supports agent_name='uitars' only.")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    episode_dir = os.path.join(result_dir, f"episode_{timestamp}")
    os.makedirs(episode_dir, exist_ok=True)
    
    benchmark_js_path = os.path.join(os.path.dirname(__file__), "../simulator-master/static/benchmark_fib.js")
    if os.path.exists(benchmark_js_path):
        try:
            dest_js_path = os.path.join(episode_dir, "benchmark_fib.js")
            shutil.copy2(benchmark_js_path, dest_js_path)
            logger.info(f"💾 已保存 benchmark_fib.js 到: {dest_js_path}")
        except Exception as e:
            logger.warning(f"⚠️  复制 benchmark_fib.js 失败: {e}")
    else:
        logger.warning(f"⚠️  benchmark_fib.js 文件不存在: {benchmark_js_path}")
    
    logger.info(f"开始 FIB 轻量级测试 - Agent: {agent_name}, Model: {model}")
    logger.info(f"FIB URL: {fib_url}")
    logger.info(f"结果目录: {episode_dir}")
    
    # 初始化 agent
    logger.info(f"初始化 Agent: {agent_name}...")
    agent_kwargs["model"] = model or agent_kwargs.get("model", "ByteDance-Seed/UI-TARS-1.5-7B")
    agent_kwargs["model_type"] = agent_kwargs.get("model_type", "doubao")
    agent_kwargs["max_tokens"] = agent_kwargs.get("max_tokens", 3000)
    agent_kwargs["temperature"] = agent_kwargs.get("temperature", 0)
    agent_kwargs["top_p"] = agent_kwargs.get("top_p", None)
    agent_kwargs["max_trajectory_length"] = agent_kwargs.get("max_trajectory_length", None)
    agent_kwargs["max_image_history_length"] = agent_kwargs.get("max_image_history_length", 5)
    agent_kwargs["use_thinking"] = agent_kwargs.get("use_thinking", False)
    agent_kwargs["language"] = agent_kwargs.get("language", "Chinese")
    agent_kwargs["observation_type"] = "a11y_tree" if observation_mode == OBSERVATION_MODE_A11Y_TREE else "screenshot"
    
    # 检查 API 连接
    api_url = os.environ.get("DOUBAO_API_URL", "")
    if api_url:
        if not check_api_connection(api_url, timeout=10):
            logger.warning("   API 连接检查失败，但将继续尝试运行测试")
            logger.warning("   如果后续出现连接错误，请检查 API 配置和网络连接")
    else:
        logger.warning("   DOUBAO_API_URL 环境变量未设置")
    
    agent = get_agent(agent_name, **agent_kwargs)
    
    # 尝试从 agent 获取屏幕分辨率配置
    agent_screen_size = (1920, 1080)  # 默认值
    try:
        if hasattr(agent, 'screen_size') and agent.screen_size:
            agent_screen_size = tuple(agent.screen_size) if isinstance(agent.screen_size, (list, tuple)) else (1920, 1080)
        elif hasattr(agent, 'screen_width') and hasattr(agent, 'screen_height'):
            agent_screen_size = (agent.screen_width, agent.screen_height)
        elif hasattr(agent, 'width') and hasattr(agent, 'height'):
            agent_screen_size = (agent.width, agent.height)
    except Exception as e:
        logger.debug(f"无法从 agent 获取屏幕分辨率，使用默认值: {e}")
    
    logger.info(f"📐 Agent 屏幕分辨率配置: {agent_screen_size[0]}x{agent_screen_size[1]}")
    observation_screen_size = (1280, 720) if observation_mode == OBSERVATION_MODE_SCREENSHOT_720P else agent_screen_size
    
    # 使用 Agent 期望的分辨率作为 viewport（确保坐标一致性）
    viewport_width, viewport_height = agent_screen_size
    
    # 使用 Playwright 控制浏览器
    with sync_playwright() as p:
        logger.info(f"启动浏览器 (headless={headless})...")
        try:
            browser = p.chromium.launch(headless=headless)
        except Exception as e:
            logger.warning(f"启动浏览器失败，尝试 headless 模式: {e}")
            browser = p.chromium.launch(headless=True)
            headless = True
        
        # 设置 viewport 为 Agent 期望的分辨率
        # 注意：Playwright 的 viewport 设置会影响页面渲染，但可能与实际浏览器窗口不一致
        logger.info(f"📐 设置 Playwright viewport: {viewport_width}x{viewport_height}")
        context = browser.new_context(
            viewport={'width': viewport_width, 'height': viewport_height},
            device_scale_factor=1.0  # 明确设置设备缩放因子为1，避免DPI问题
        )
        page = context.new_page()
        
        try:
            # 打开页面（默认为模拟器选择页，Agent 需先点击 Focused Ion Beam 进入 FIB 模拟器）
            logger.info(f"打开页面: {fib_url}")
            page.goto(fib_url, wait_until='networkidle', timeout=60000)
            
            logger.info("等待页面完全加载...")
            time.sleep(5)
            
            try:
                page.wait_for_load_state("domcontentloaded", timeout=10000)
                page.wait_for_load_state("load", timeout=10000)
                logger.info("✅ 页面加载完成")
            except Exception as e:
                logger.warning(f"等待页面加载时出现警告: {e}")
            
            time.sleep(2)
            
            # 若当前是模拟器选择页，提示 Agent 先点击进入 FIB
            current_url = page.url
            if "FIB_simulator.html" not in current_url:
                logger.info("📌 当前在模拟器选择页面，请由 Agent 先点击「Focused Ion Beam」进入 FIB 模拟器")
            
            # 获取实际浏览器窗口和视口大小
            actual_viewport = page.viewport_size
            actual_size = page.evaluate("""
                () => {
                    return {
                        windowWidth: window.innerWidth,
                        windowHeight: window.innerHeight,
                        screenWidth: window.screen.width,
                        screenHeight: window.screen.height,
                        viewportWidth: window.innerWidth,
                        viewportHeight: window.innerHeight,
                        devicePixelRatio: window.devicePixelRatio || 1
                    };
                }
            """)
            
            logger.info(f"🖥️  浏览器尺寸信息:")
            logger.info(f"   Viewport (配置): {actual_viewport['width']}x{actual_viewport['height']}")
            logger.info(f"   窗口大小 (innerWidth/Height): {actual_size['windowWidth']}x{actual_size['windowHeight']}")
            logger.info(f"   屏幕大小 (screen.width/height): {actual_size['screenWidth']}x{actual_size['screenHeight']}")
            logger.info(f"   设备像素比 (devicePixelRatio): {actual_size['devicePixelRatio']}")
            
            # 使用 viewport 大小作为实际分辨率（Playwright 坐标系统基于 viewport）
            # 注意：Playwright 的 mouse.click() 坐标是相对于 viewport 的
            actual_screen_width = actual_viewport['width']
            actual_screen_height = actual_viewport['height']
            
            # 验证 viewport 是否与配置一致
            if actual_viewport['width'] != viewport_width or actual_viewport['height'] != viewport_height:
                logger.warning(f"⚠️  Viewport 大小与配置不一致！")
                logger.warning(f"   配置: {viewport_width}x{viewport_height}")
                logger.warning(f"   实际: {actual_viewport['width']}x{actual_viewport['height']}")
            else:
                logger.info(f"  Viewport 大小与配置一致: {viewport_width}x{viewport_height}")
            
            # 等待 benchmark_fib.js 初始化
            logger.info("等待 benchmark logger 初始化...")
            time.sleep(3)  # 增加等待时间
            
            # 确保页面完全稳定后再获取第一个观察
            logger.info("等待页面完全稳定...")
            try:
                # 等待页面中的关键元素（如果有的话）
                # 这里可以添加等待特定元素的代码
                page.wait_for_load_state("networkidle", timeout=5000)
            except:
                pass  # 如果超时，继续执行
            time.sleep(2)  # 额外等待，确保所有JavaScript都已执行完成
            
            # 仅在已进入 FIB 模拟器页面时检查 benchmark
            try:
                benchmark_status = page.evaluate("""
                    () => {
                        return {
                            hasBenchmark: typeof window.FIB_BENCHMARK !== 'undefined',
                            hasEpisode: typeof window.FIB_BENCHMARK !== 'undefined' && 
                                        typeof window.FIB_BENCHMARK.episode !== 'undefined',
                            currentUrl: window.location.href,
                            pathname: window.location.pathname
                        };
                    }
                """)
                current_url_js = benchmark_status.get('currentUrl', '')
                
                if "FIB_simulator.html" in current_url_js:
                    if benchmark_status.get('hasBenchmark'):
                        logger.info("✅ Benchmark 对象已初始化")
                        if benchmark_status.get('hasEpisode'):
                            logger.info("✅ Benchmark episode 对象已创建")
                        else:
                            logger.warning("⚠️  Benchmark episode 对象未创建")
                    else:
                        logger.warning("⚠️  已在 FIB 页面但 Benchmark 未初始化，请检查 benchmark_fib.js 是否加载")
                else:
                    logger.info("📌 当前在模拟器选择页，Benchmark 将在进入 FIB 模拟器后初始化")
            
            except Exception as e:
                logger.warning(f"检查 benchmark 初始化状态时出错: {e}")
            
            try:
                page.evaluate(f"""
                    () => {{
                        if (typeof window.FIB_BENCHMARK !== 'undefined' && 
                            typeof window.FIB_BENCHMARK.episode !== 'undefined') {{
                            window.FIB_BENCHMARK.episode.agent_name = '{agent_name}';
                        }}
                    }}
                """)
            except Exception as e:
                logger.debug(f"设置 agent 名称失败: {e}")
            
            logger.info("开始执行任务...")
            logger.info(f"任务指令: {FIB_TASK_INSTRUCTION[:200]}...")
            
            observation = page_to_observation(page, FIB_TASK_INSTRUCTION, observation_mode=observation_mode)
            step_count = 0
            mouse_pos = None  # 初始化鼠标位置
            no_convert = should_skip_coord_convert(
                agent_kwargs.get("model"), agent_name, agent_kwargs.get("model_type")
            )
            
            while step_count < max_steps:
                logger.info("")
                logger.info("=" * 60)
                logger.info(f"=== Step {step_count + 1}/{max_steps} ===")
                logger.info("=" * 60)
                
                # Agent 生成动作
                try:
                    logger.info("🤖 Agent 正在生成动作...")
                    logger.info(f"📡 API 配置: URL={os.environ.get('DOUBAO_API_URL', 'Not set')}")
                    
                    response, actions = agent.predict(FIB_TASK_INSTRUCTION, observation)
                    
                    # 检查返回结果
                    if response is None and (actions is None or actions == ["FAIL"] or actions == ["DONE"]):
                        logger.error("❌ Agent API 调用失败或返回空结果")
                        logger.error("   可能原因：")
                        logger.error("   1. API 服务器连接超时或不可用")
                        logger.error("   2. API Key 或 URL 配置错误")
                        logger.error("   3. 网络连接问题")
                        logger.error("   跳过此步骤，继续下一个步骤")
                        step_count += 1
                        time.sleep(2)
                        continue
                    
                    logger.info(f"📝 Agent 响应: {response[:200] if response else 'None'}...")
                    logger.info(f"📋 Agent 生成的动作数量: {len(actions) if actions else 0}")
                    if actions:
                        for i, act in enumerate(actions):
                            logger.info(f"   动作 {i+1}: {str(act)[:150]}")
                            
                    # 检查是否是失败动作
                    if actions and len(actions) > 0:
                        if actions[0] in ["FAIL", "DONE", "client error"]:
                            logger.warning(f"⚠️  Agent 返回失败动作: {actions[0]}")
                            logger.warning("   跳过此步骤，继续下一个步骤")
                            step_count += 1
                            time.sleep(1)
                            continue
                            
                except AttributeError:
                    # 如果 agent 没有 predict 方法
                    logger.info("Agent 没有 predict 方法，使用 step 方法")
                    actions = [agent.step(observation, FIB_TASK_INSTRUCTION)]
                    response = None
                except Exception as e:
                    logger.error(f"❌ Agent 生成动作时出错: {e}")
                    logger.error(f"   错误类型: {type(e).__name__}")
                    import traceback
                    logger.error(f"   错误详情:\n{traceback.format_exc()}")
                    logger.error("跳过此步骤，继续下一个步骤")
                    step_count += 1
                    time.sleep(2)
                    continue
                
                # 如果没有生成动作，跳过
                if not actions or len(actions) == 0:
                    logger.warning("⚠️  Agent 没有生成任何动作，跳过此步骤")
                    step_count += 1
                    time.sleep(1)
                    continue
                
                for action in actions:
                    logger.info(f"   执行动作: {action}")
                    logger.info(f"   动作类型: {type(action).__name__}, 动作内容: {str(action)[:200]}")
                    
                    # 保存执行前的截图（用于调试）
                    try:
                        current_subtask_id = infer_current_fib_subtask(page)
                        record_fib_agent_action(page, action, current_subtask_id)
                        before_screenshot = page.screenshot(type='png')
                        before_path = os.path.join(episode_dir, f"step_{step_count + 1}_before.png")
                        with open(before_path, "wb") as f:
                            f.write(before_screenshot)
                        logger.info(f"💾 已保存执行前截图: {before_path}")
                    except Exception as e:
                        logger.warning(f"保存执行前截图失败: {e}")
                    
                    # 执行动作（传递 agent 的屏幕分辨率配置和实际屏幕大小）
                    action_result = execute_action_on_page(
                        page,
                        action,
                        observation_screen_size,
                        (actual_screen_width, actual_screen_height),
                        no_coord_convert=no_convert,
                        model_type=agent_kwargs.get("model_type"),
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
                        if mouse_pos:
                            logger.info(f"📍 鼠标位置: {mouse_pos}")
                    
                    # 等待界面更新和稳定
                    logger.debug("等待界面更新...")
                    time.sleep(1.5)  # 初始等待，给界面时间更新
                    
                    # 等待页面稳定（检查是否有加载中的元素）
                    try:
                        # 等待页面加载完成
                        page.wait_for_load_state("networkidle", timeout=3000)
                    except:
                        pass  # 如果超时，继续执行
                    
                    time.sleep(1.5)  # 额外等待，确保动画和DOM更新完成
                    
                    step_count += 1
                    
                    # ⚠️ 重要：立即更新 observation，让 Agent 看到界面变化
                    logger.info("📸 更新观察（获取新截图）...")
                    # 如果有鼠标位置，在截图上标记
                    new_observation = page_to_observation(
                        page,
                        FIB_TASK_INSTRUCTION,
                        mouse_pos=mouse_pos,
                        observation_mode=observation_mode,
                    )
                    
                    # 保存执行后的截图（使用带鼠标标记的截图）
                    try:
                        after_screenshot = new_observation['screenshot']  # 使用带标记的截图
                        after_path = os.path.join(episode_dir, f"step_{step_count}_after.png")
                        with open(after_path, "wb") as f:
                            f.write(after_screenshot)
                        logger.info(f"💾 已保存截图（带鼠标标记）: {after_path}")
                        if mouse_pos:
                            logger.info(f"   鼠标位置标记在: {mouse_pos}")
                    except Exception as e:
                        logger.warning(f"保存执行后截图失败: {e}")
                    
                    # 比较前后截图，确认界面是否变化
                    if 'screenshot' in observation and 'screenshot' in new_observation:
                        if observation['screenshot'] == new_observation['screenshot']:
                            logger.warning("⚠️  警告：截图未发生变化，界面可能没有更新")
                        else:
                            logger.info("✅ 截图已更新，界面发生变化")
                    
                    observation = new_observation
                    logger.info(f"📊 新截图大小: {len(observation['screenshot'])} bytes")
                    
                    # 检查任务是否完成
                    status_obj = {"success": False}
                    try:
                        status = page.evaluate("""
                            () => {
                                if (typeof window.FIB_BENCHMARK !== 'undefined') {
                                    const ep = window.FIB_BENCHMARK.episode;
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
                    
                    # 检查是否完成（在 for 循环内）
                    if status_obj.get("success"):
                        logger.info("✅ 任务完成，退出动作循环")
                        break
                
                # 检查是否完成（在 while 循环内）
                if status_obj.get("success"):
                    logger.info("✅ 任务完成，退出主循环")
                    break
            
            # 提取并保存 benchmark 日志（若当前不在 FIB 页则先导航到 FIB 再提取，否则 window.FIB_BENCHMARK 不存在）
            logger.info("="*60)
            fib_simulator_url = fib_url.rstrip("/") + "/static/simulator/fib_simulator/FIB_simulator.html"
            current_url_before_extract = page.url
            if "FIB_simulator.html" not in current_url_before_extract:
                logger.info("当前不在 FIB 模拟器页，先导航到 FIB 页再提取日志...")
                try:
                    page.goto(fib_simulator_url, wait_until="domcontentloaded", timeout=15000)
                    time.sleep(2)  # 等待 benchmark_fib.js 执行并初始化 window.FIB_BENCHMARK
                except Exception as nav_err:
                    logger.warning(f"导航到 FIB 页失败: {nav_err}")
            logger.info("提取 benchmark 日志...")
            benchmark_log = extract_benchmark_log(page)
            
            test_success = False
            if benchmark_log:
                benchmark_log["observation_mode"] = observation_mode
                log_path = os.path.join(episode_dir, f"{benchmark_log.get('episode_id', 'episode')}.json")
                with open(log_path, "w", encoding="utf-8") as f:
                    json.dump(benchmark_log, f, indent=2, ensure_ascii=False)
                logger.info(f"✅ Benchmark 日志已保存: {log_path}")
                
                test_success = benchmark_log.get('success', False)
                
                # 打印摘要
                print("\n" + "="*60)
                print("测试结果摘要")
                print("="*60)
                print(f"任务ID: {benchmark_log.get('task_id')}")
                print(f"Episode ID: {benchmark_log.get('episode_id')}")
                print(f"Agent: {benchmark_log.get('agent_name', agent_name)}")
                print(f"成功: {'✅ 是' if test_success else '❌ 否'}")
                
                if "summary" in benchmark_log:
                    s = benchmark_log["summary"]
                    print(f"实际步骤数: {s.get('actual_steps', 0)}")
                    print(f"步骤效率: {s.get('step_efficiency', 0):.2%}")
                
                if "grounding_metrics" in benchmark_log:
                    gm = benchmark_log["grounding_metrics"]
                    print(f"控件定位准确率: {gm.get('widget_grounding_accuracy', 0):.2%}")
                    print(f"文本理解准确率: {gm.get('text_grounding_accuracy', 0):.2%}")
                    print(f"状态理解准确率: {gm.get('state_grounding_accuracy', 0):.2%}")
                
                if "subtasks" in benchmark_log:
                    print("\n子任务完成情况:")
                    for st in benchmark_log["subtasks"]:
                        status = "✅" if st.get("success") else "❌"
                        print(f"  {status} {st.get('name')} ({st.get('subtask_id')}): {st.get('attempts', 0)} 次尝试")
                
                print("="*60)
            else:
                logger.warning("⚠️  无法提取 benchmark 日志")
                # 即使提取失败，也保存一个占位文件，记录提取失败的信息（含当前 URL 便于排查）
                current_url_at_fail = page.url
                placeholder_log = {
                    "error": "无法提取 benchmark 日志",
                    "reason": "window.FIB_BENCHMARK 对象可能未正确初始化",
                    "episode_dir": episode_dir,
                    "timestamp": datetime.now().isoformat(),
                    "agent_name": agent_name,
                    "current_url": current_url_at_fail,
                    "note": "请检查 benchmark_fib.js 是否正确加载到页面中"
                }
                log_path = os.path.join(episode_dir, "benchmark_log_extraction_failed.json")
                with open(log_path, "w", encoding="utf-8") as f:
                    json.dump(placeholder_log, f, indent=2, ensure_ascii=False)
                logger.warning(f"⚠️  已保存提取失败信息到: {log_path}")
                logger.warning("   可能的原因：benchmark_fib.js 未正确加载或页面 URL 不包含 FIB_simulator.html")
            
        except Exception as e:
            logger.error(f"测试过程中出错: {e}", exc_info=True)
            test_success = False
            benchmark_log = None
        finally:
            # 保持浏览器打开一段时间以便查看结果
            logger.info("测试完成，浏览器将在 10 秒后关闭...")
            time.sleep(10)
            browser.close()

        # 保存成功 episode 的完整轨迹
        if test_success:
            save_success_episode(episode_dir, "fib")

        # 返回测试结果
        return {
            "success": test_success,
            "benchmark_log": benchmark_log,
            "episode_dir": episode_dir
        }


def run_multiple_fib_tests(
    num_runs: int = 1,
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps: int = 120,
    fib_url: str = "http://localhost:8080/",
    result_dir: str = get_results_dir("fib"),
    headless: bool = False,
    observation_mode: str = OBSERVATION_MODE_SCREENSHOT,
    **agent_kwargs
):
    """运行多次 FIB 测试并统计结果
    
    Args:
        num_runs: 测试运行次数
        其他参数同 run_fib_test_lightweight
    """
    logger.info("="*80)
    logger.info(f"开始运行 {num_runs} 次测试")
    logger.info("="*80)
    
    results = []
    success_count = 0
    failed_count = 0
    
    # 统计信息
    total_steps = []
    step_efficiencies = []
    widget_grounding_accuracies = []
    text_grounding_accuracies = []
    state_grounding_accuracies = []
    durations = []
    
    for run_num in range(1, num_runs + 1):
        logger.info("")
        logger.info("="*80)
        logger.info(f"第 {run_num}/{num_runs} 次测试")
        logger.info("="*80)
        
        try:
            result = run_fib_test_lightweight(
                agent_name=agent_name,
                model=model,
                max_steps=max_steps,
                fib_url=fib_url,
                result_dir=result_dir,
                headless=headless,
                observation_mode=observation_mode,
                **agent_kwargs
            )
            
            results.append(result)
            
            if result["success"]:
                success_count += 1
                logger.info(f"✅ 第 {run_num} 次测试成功")
            else:
                failed_count += 1
                logger.info(f"❌ 第 {run_num} 次测试失败")
            
            # 收集统计信息
            if result.get("benchmark_log"):
                log = result["benchmark_log"]
                
                # 步骤数
                if "summary" in log:
                    s = log["summary"]
                    total_steps.append(s.get("actual_steps", 0))
                    step_efficiencies.append(s.get("step_efficiency", 0))
                
                # Grounding 指标
                if "grounding_metrics" in log:
                    gm = log["grounding_metrics"]
                    widget_grounding_accuracies.append(gm.get("widget_grounding_accuracy", 0))
                    text_grounding_accuracies.append(gm.get("text_grounding_accuracy", 0))
                    state_grounding_accuracies.append(gm.get("state_grounding_accuracy", 0))
                
                # 持续时间
                if "timestamps" in log and log["timestamps"].get("duration_sec"):
                    durations.append(log["timestamps"]["duration_sec"])
        
        except Exception as e:
            logger.error(f"❌ 第 {run_num} 次测试出错: {e}")
            failed_count += 1
            results.append({
                "success": False,
                "benchmark_log": None,
                "episode_dir": None,
                "error": str(e)
            })
        
        # 在测试之间稍作等待
        if run_num < num_runs:
            logger.info(f"等待 3 秒后开始下一次测试...")
            time.sleep(3)
    
    # 打印统计摘要
    logger.info("")
    logger.info("="*80)
    logger.info("测试统计摘要")
    logger.info("="*80)
    logger.info(f"总测试次数: {num_runs}")
    logger.info(f"成功次数: {success_count} ✅")
    logger.info(f"失败次数: {failed_count} ❌")
    logger.info(f"成功率: {success_count / num_runs * 100:.2f}%")
    logger.info("")
    
    if total_steps:
        logger.info(f"平均步骤数: {sum(total_steps) / len(total_steps):.2f}")
        logger.info(f"  最小: {min(total_steps)}, 最大: {max(total_steps)}")
    
    if step_efficiencies:
        logger.info(f"平均步骤效率: {sum(step_efficiencies) / len(step_efficiencies):.2%}")
    
    if widget_grounding_accuracies:
        logger.info(f"平均控件定位准确率: {sum(widget_grounding_accuracies) / len(widget_grounding_accuracies):.2%}")
    
    if text_grounding_accuracies:
        logger.info(f"平均文本理解准确率: {sum(text_grounding_accuracies) / len(text_grounding_accuracies):.2%}")
    
    if state_grounding_accuracies:
        logger.info(f"平均状态理解准确率: {sum(state_grounding_accuracies) / len(state_grounding_accuracies):.2%}")
    
    if durations:
        logger.info(f"平均持续时间: {sum(durations) / len(durations):.2f} 秒")
        logger.info(f"  最短: {min(durations):.2f} 秒, 最长: {max(durations):.2f} 秒")
    
    logger.info("")
    logger.info("="*80)
    
    # 保存统计结果到文件
    stats = {
        "total_runs": num_runs,
        "success_count": success_count,
        "failed_count": failed_count,
        "success_rate": success_count / num_runs if num_runs > 0 else 0,
        "observation_mode": observation_mode,
        "results": [
            {
                "run": i + 1,
                "success": r["success"],
                "episode_dir": r.get("episode_dir"),
                "episode_id": r.get("benchmark_log", {}).get("episode_id") if r.get("benchmark_log") else None
            }
            for i, r in enumerate(results)
        ],
        "statistics": {
            "avg_steps": sum(total_steps) / len(total_steps) if total_steps else None,
            "avg_step_efficiency": sum(step_efficiencies) / len(step_efficiencies) if step_efficiencies else None,
            "avg_widget_grounding_accuracy": sum(widget_grounding_accuracies) / len(widget_grounding_accuracies) if widget_grounding_accuracies else None,
            "avg_text_grounding_accuracy": sum(text_grounding_accuracies) / len(text_grounding_accuracies) if text_grounding_accuracies else None,
            "avg_state_grounding_accuracy": sum(state_grounding_accuracies) / len(state_grounding_accuracies) if state_grounding_accuracies else None,
            "avg_duration": sum(durations) / len(durations) if durations else None,
        },
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
    parser = argparse.ArgumentParser(description="FIB Benchmark 轻量级测试脚本")
    
    parser.add_argument("--agent", type=str, default="uitars15_v2",
                       choices=["uitars15_v2", "uitars15_v1", "uitars", "o3", "gui_owl_vllm"],
                       help="要使用的 agent")
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
    
    parser.add_argument("--fib_url", type=str,
                       default="http://localhost:8080/",
                       help="起始 URL（默认模拟器选择页，Agent 先点击进入 FIB；若需直进 FIB 可设为 .../FIB_simulator.html）")
    parser.add_argument("--max_steps", type=int, default=120,
                       help="最大步骤数（完整流程约 20 个子任务）")
    parser.add_argument("--headless", action="store_true",
                       help="无头模式运行（不显示浏览器窗口）")
    
    parser.add_argument("--result_dir", type=str, default=get_results_dir("fib"),
                       help="结果保存目录")
    parser.add_argument("--num_runs", type=int, default=1,
                       help="测试运行次数（默认1次，多次测试会统计成功率）")
    parser.add_argument("--observation_mode", choices=["screenshot", "screenshot_720p", "a11y_tree"], default="screenshot",
                       help="模型输入观测模式")
    
    args = parser.parse_args()
    
    if args.api_key:
        os.environ["API_KEY"] = args.api_key
        os.environ["DOUBAO_API_KEY"] = args.api_key
        os.environ["GUI_OWL_API_KEY"] = args.api_key
    if args.api_url:
        u = args.api_url.rstrip("/")
        os.environ["API_URL"] = u
        os.environ["DOUBAO_API_URL"] = u
        os.environ["GUI_OWL_API_URL"] = u
    
    logger.info("="*60)
    logger.info("API 配置:")
    logger.info(f"  API Key: {os.environ.get('DOUBAO_API_KEY', '未设置')[:20]}...")
    logger.info(f"  API URL: {os.environ.get('DOUBAO_API_URL', '未设置')}")
    logger.info(f"  模型: {args.model}")
    logger.info(f"  测试次数: {args.num_runs}")
    logger.info("="*60)
    
    if args.num_runs > 1:
        run_multiple_fib_tests(
            num_runs=args.num_runs,
            agent_name=args.agent,
            model=args.model,
            model_type=args.model_type,
            temperature=args.temperature,
            max_tokens=args.max_tokens,
            max_steps=args.max_steps,
            fib_url=args.fib_url,
            result_dir=args.result_dir,
            headless=args.headless,
            observation_mode=args.observation_mode,
        )
    else:
        run_fib_test_lightweight(
            agent_name=args.agent,
            model=args.model,
            model_type=args.model_type,
            temperature=args.temperature,
            max_tokens=args.max_tokens,
            max_steps=args.max_steps,
            fib_url=args.fib_url,
            result_dir=args.result_dir,
            headless=args.headless,
            observation_mode=args.observation_mode,
        )


if __name__ == "__main__":
    main()

