"""
XRD Benchmark 轻量级测试脚本（完整流程）
直接使用 Playwright 控制浏览器，无需虚拟化环境。

使用方法:
1. 确保 XRD 模拟器正在运行（http://localhost:8080）
2. 完整流程测试：python test_xrd_agent_lightweight.py --model your_model_name
3. 单子任务 demo（S1～S8）：使用 test_xrd_subtask_demos.py
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

from fib_benchmark.test_fib_agent_lightweight import should_skip_coord_convert

# XRD 任务指令
XRD_TASK_INSTRUCTION = """Complete a full scan workflow in the XRD simulator and save the result. Follow these steps in order:

1. Select a specimen from the dropdown menu
2. Change the specimen: click the DOORS button to open the chamber, then click CLOSE to close the door after loading
3. After the door is fully closed, click the STANDBY button to power up and wait until ready
4. Use the angle adjustment buttons to set the start angle and end angle (ensure start angle < end angle)
5. Select the step size (STEP SIZE) from the dropdown
6. Select the scan rate (SCAN RATE) from the dropdown
7. Click the START SCAN button to begin scanning and wait for completion
8. Click the SAVE DIFFRACTOGRAM button to save the result

Complete the entire task in the order above."""

# 说明书操作指导摘录文件（用于 --with_manual_context 时加入上下文）
XRD_MANUAL_EXCERPT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "xrd_manual_excerpt.txt")


def load_xrd_manual_excerpt() -> str:
    """加载 XRD 说明书操作指导摘录（少量），用于增强 Agent 上下文。"""
    path = XRD_MANUAL_EXCERPT_PATH
    if not path or not os.path.isfile(path):
        logger.warning(f"说明书摘录文件不存在: {path}，将不使用说明书上下文")
        return ""
    try:
        with open(path, "r", encoding="utf-8") as f:
            text = f.read().strip()
        if text:
            logger.info(f"已加载说明书摘录，约 {len(text)} 字")
        return text
    except Exception as e:
        logger.warning(f"加载说明书摘录失败: {e}")
        return ""


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
            "temperature": kwargs.get("temperature", 0),
            "top_p": kwargs.get("top_p", 0.9),
            "max_tokens": kwargs.get("max_tokens", 3000),
            "language": kwargs.get("language", "Chinese"),
            "history_n": 5,
        })
        return UITarsAgentBase(
            model=kwargs.get("model", "ByteDance-Seed/UI-TARS-1.5-7B"),
            runtime_conf=runtime_conf,
            max_trajectory_length=kwargs.get("max_trajectory_length", 50),
            model_type=kwargs.get("model_type", "qwen25vl"),
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

def page_to_observation(page: Page, instruction: str, mouse_pos=None):
    """将 Playwright Page 转换为 agent 观察格式"""
    global _last_mouse_pos
    
    # 获取截图 - 使用 full_page 确保获取完整页面
    try:
        screenshot_bytes = page.screenshot(type='png', full_page=False)
        logger.debug(f"获取截图成功，大小: {len(screenshot_bytes)} bytes")
        
        # 如果有鼠标位置，在截图上标记
        if mouse_pos:
            x, y = mouse_pos
            logger.debug(f"在截图上标记鼠标位置: ({x}, {y})")
            screenshot_bytes = add_mouse_marker_to_screenshot(screenshot_bytes, x, y)
            _last_mouse_pos = mouse_pos
        elif _last_mouse_pos:
            # 即使没有新的鼠标位置，也标记最后的位置
            x, y = _last_mouse_pos
            logger.debug(f"在截图上标记最后已知的鼠标位置: ({x}, {y})")
            screenshot_bytes = add_mouse_marker_to_screenshot(screenshot_bytes, x, y)
        else:
            logger.debug("没有鼠标位置信息，不标记")
    except Exception as e:
        logger.error(f"获取截图失败: {e}")
        # 如果失败，尝试获取部分截图
        try:
            screenshot_bytes = page.screenshot(type='png')
        except:
            screenshot_bytes = b''  # 空截图
    
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
    no_coord_convert: bool = False,
    model_type: str | None = None,
):
    """在页面上执行动作（委托 FIB 执行器）。"""
    from fib_benchmark.test_fib_agent_lightweight import execute_action_on_page as fib_execute

    return fib_execute(
        page,
        action,
        agent_screen_size,
        actual_screen_size,
        no_coord_convert=no_coord_convert,
        model_type=model_type,
    )


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


def parse_and_execute_pyautogui(page: Page, code: str, agent_screen_size: tuple = (1920, 1080), actual_screen_size: tuple = None, no_coord_convert: bool = False):
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
            line = line.strip()
            # 跳过导入语句、注释和空行
            if (line.startswith('import ') or 
                line.startswith('from ') or 
                line.startswith('#') or 
                line.startswith("'''") or
                line.startswith('"""') or
                not line):
                continue
            cleaned_lines.append(line)
        
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
            r'pyautogui\.click\(([\d.]+),\s*([\d.]+)\)',  # click(x, y) - 支持浮点数
            r'pyautogui\.click\(x=([\d.]+),\s*y=([\d.]+)\)',  # click(x=x, y=y)
            r'pyautogui\.click\(([\d.]+),\s*([\d.]+),\s*button=',  # click(x, y, button=...)
            r'click\(([\d.]+),\s*([\d.]+)\)',  # 简化的 click(x, y)
        ]
        x, y = None, None
        for pattern in click_patterns:
            click_match = re.search(pattern, code, re.MULTILINE)
            if click_match:
                original_x, original_y = float(click_match.group(1)), float(click_match.group(2))
                logger.info(f"📍 Agent 原始坐标: ({original_x}, {original_y})")
                
                if no_coord_convert:
                    x, y = int(original_x), int(original_y)
                    max_x, max_y = actual_width, actual_height
                else:
                    x = int(original_x / 1920 * 1000)
                    y = int(original_y / 1080 * 1000)
                    max_x, max_y = 1920, 1080
                logger.info(f"   最终执行坐标: ({x}, {y})" + (" [no_coord_convert]" if no_coord_convert else ""))
                break
        
        # 如果成功提取到坐标，执行点击操作
        if x is not None and y is not None:
            # 验证坐标范围（no_coord_convert 时用 viewport，否则 1920x1080）
            if not no_coord_convert:
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
            r'pyautogui\.doubleClick\(([\d.]+),\s*([\d.]+)\)',
            r'pyautogui\.doubleClick\(x=([\d.]+),\s*y=([\d.]+)\)',
        ]
        for pattern in double_click_patterns:
            match = re.search(pattern, code, re.MULTILINE)
            if match:
                original_x, original_y = float(match.group(1)), float(match.group(2))
                logger.info(f"📍 Agent 原始坐标: ({original_x}, {original_y})")
                
                if no_coord_convert:
                    x, y = int(original_x), int(original_y)
                    max_x, max_y = actual_width, actual_height
                else:
                    x = int(original_x / 1920 * 1000)
                    y = int(original_y / 1080 * 1000)
                    max_x, max_y = 1920, 1080
                logger.info(f"   最终执行坐标: ({x}, {y})" + (" [no_coord_convert]" if no_coord_convert else ""))
                if x > max_x or y > max_y or x < 0 or y < 0:
                    logger.warning(f"⚠️  坐标超出范围: ({x}, {y})")
                    x = max(0, min(x, max_x - 1))
                    y = max(0, min(y, max_y - 1))
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
        
        # 解析 dragTo(x, y) 或 dragTo(x, y, duration=...)
        drag_patterns = [
            r'pyautogui\.dragTo\(([\d.]+),\s*([\d.]+)\s*\)',
            r'pyautogui\.dragTo\(([\d.]+),\s*([\d.]+)\s*,\s*duration\s*=\s*([\d.]+)\s*\)',
        ]
        for pattern in drag_patterns:
            drag_match = re.search(pattern, code, re.MULTILINE)
            if drag_match:
                original_x, original_y = float(drag_match.group(1)), float(drag_match.group(2))
                duration = float(drag_match.group(3)) if drag_match.lastindex >= 3 else 0.2
                logger.info(f"📍 dragTo 原始坐标: ({original_x}, {original_y}), duration={duration}")
                if no_coord_convert:
                    x, y = int(original_x), int(original_y)
                    x = max(0, min(x, actual_width - 1))
                    y = max(0, min(y, actual_height - 1))
                else:
                    x = int(original_x / 1920 * 1000)
                    y = int(original_y / 1080 * 1000)
                    x = max(0, min(x, 1920 - 1))
                    y = max(0, min(y, 1080 - 1))
                logger.info(f"🖱️  准备拖拽到: ({x}, {y})")
                try:
                    page.mouse.down()
                    time.sleep(0.05)
                    page.mouse.move(x, y)
                    time.sleep(max(0, duration - 0.05))
                    page.mouse.up()
                    logger.info(f"✅ dragTo 成功: ({x}, {y})")
                    time.sleep(0.3)
                    return (True, (x, y))
                except Exception as e:
                    logger.error(f"❌ dragTo 失败: ({x}, {y}), 错误: {e}")
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
            # 解析多个按键参数
            keys = [k.strip().strip('"\'') for k in keys_str.split(',')]
            # 转换为 Playwright 的按键组合
            if len(keys) == 2:
                # 常见的组合键
                if keys[0].lower() == 'ctrl' and keys[1].lower() == 'c':
                    page.keyboard.press('Control+c')
                elif keys[0].lower() == 'ctrl' and keys[1].lower() == 'v':
                    page.keyboard.press('Control+v')
                elif keys[0].lower() == 'ctrl' and keys[1].lower() == 'a':
                    page.keyboard.press('Control+a')
                else:
                    # 通用组合键
                    page.keyboard.press(f'{keys[0]}+{keys[1]}')
                logger.info(f"组合键: {'+'.join(keys)}")
                time.sleep(0.3)
                return (True, None)
        
        # 解析 scroll
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
    """从浏览器中提取 benchmark 日志"""
    try:
        # 首先检查 benchmark 对象是否存在
        benchmark_check = page.evaluate("""
            () => {
                return {
                    hasBenchmark: typeof window.XRD_BENCHMARK !== 'undefined',
                    hasEpisode: typeof window.XRD_BENCHMARK !== 'undefined' && 
                                typeof window.XRD_BENCHMARK.episode !== 'undefined',
                    benchmarkType: typeof window.XRD_BENCHMARK
                };
            }
        """)
        
        logger.info(f"🔍 Benchmark 对象检查: {benchmark_check}")
        
        if not benchmark_check.get('hasBenchmark'):
            logger.warning("⚠️  window.XRD_BENCHMARK 对象不存在，可能 benchmark_xrd.js 未正确加载")
            logger.warning("   请检查页面是否正确加载了 benchmark_xrd.js 脚本")
            return None
        
        if not benchmark_check.get('hasEpisode'):
            logger.warning("⚠️  window.XRD_BENCHMARK.episode 对象不存在")
            return None
        
        # 提取日志
        result = page.evaluate("""
            () => {
                if (typeof window.XRD_BENCHMARK !== 'undefined' && 
                    typeof window.XRD_BENCHMARK.episode !== 'undefined') {
                    const ep = window.XRD_BENCHMARK.episode;
                    if (typeof window.XRD_BENCHMARK.finalize === 'function') {
                        window.XRD_BENCHMARK.finalize();
                    } else if (ep.timestamps.end_time === null) {
                        const now = new Date().toISOString();
                        const tNow = performance.now();
                        const t0 = ep._t0 || tNow;
                        ep.timestamps.end_time = now;
                        ep.timestamps.duration_sec = (tNow - t0) / 1000.0;
                        if (typeof ep._subtask_map !== 'undefined') {
                            ep.subtasks = Object.values(ep._subtask_map);
                            ep.success = ep.subtasks.length > 0 && ep.subtasks.every(st => st.success);
                        } else {
                            ep.subtasks = [];
                            ep.success = false;
                        }
                    }
                    return JSON.stringify(ep);
                }
                return null;
            }
        """)
        
        if result:
            log_data = json.loads(result)
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


def run_xrd_test_lightweight(
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps: int = 50,
    xrd_url: str = "http://localhost:8080/static/simulator/xrd_simulator/XRD_simulator.html",
    result_dir: str = get_results_dir("xrd"),
    headless: bool = False,
    with_manual_context: bool = False,
    **agent_kwargs
) -> dict:
    """轻量级 XRD 测试 - 直接使用 Playwright，无需虚拟化环境
    
    Returns:
        dict: 包含测试结果的字典，格式为:
            {
                "success": bool,  # 测试是否成功
                "benchmark_log": dict or None,  # benchmark 日志
                "episode_dir": str  # episode 目录路径
            }
    """
    
    # 创建结果目录
    os.makedirs(result_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    episode_dir = os.path.join(result_dir, f"episode_{timestamp}")
    os.makedirs(episode_dir, exist_ok=True)
    
    # 复制 benchmark_xrd.js 文件到结果目录
    benchmark_js_path = "/mnt/afs/osworld/simulator-master/static/benchmark_xrd.js"
    if os.path.exists(benchmark_js_path):
        try:
            dest_js_path = os.path.join(episode_dir, "benchmark_xrd.js")
            shutil.copy2(benchmark_js_path, dest_js_path)
            logger.info(f"💾 已保存 benchmark_xrd.js 到: {dest_js_path}")
        except Exception as e:
            logger.warning(f"⚠️  复制 benchmark_xrd.js 失败: {e}")
    else:
        logger.warning(f"⚠️  benchmark_xrd.js 文件不存在: {benchmark_js_path}")
    
    logger.info(f"开始 XRD 轻量级测试 - Agent: {agent_name}, Model: {model}")
    logger.info(f"XRD URL: {xrd_url}")
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
            # 打开 XRD 模拟器页面
            logger.info(f"打开 XRD 模拟器: {xrd_url}")
            page.goto(xrd_url, wait_until='networkidle', timeout=60000)
            
            # 等待页面完全加载和渲染
            logger.info("等待页面完全加载...")
            time.sleep(5)  # 增加等待时间，确保页面完全渲染
            
            # 等待页面稳定（检查关键元素是否加载完成）
            try:
                # 等待页面中的关键元素出现（如果有的话）
                page.wait_for_load_state("domcontentloaded", timeout=10000)
                page.wait_for_load_state("load", timeout=10000)
                logger.info("✅ 页面加载完成")
            except Exception as e:
                logger.warning(f"等待页面加载时出现警告: {e}")
            
            time.sleep(2)  # 额外等待，确保所有动态内容都已渲染
            
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
            
            # 等待 benchmark_xrd.js 初始化
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
            
            # 检查 benchmark 对象是否已初始化
            try:
                benchmark_status = page.evaluate("""
                    () => {
                        return {
                            hasBenchmark: typeof window.XRD_BENCHMARK !== 'undefined',
                            hasEpisode: typeof window.XRD_BENCHMARK !== 'undefined' && 
                                        typeof window.XRD_BENCHMARK.episode !== 'undefined',
                            currentUrl: window.location.href,
                            pathname: window.location.pathname
                        };
                    }
                """)
                
                if benchmark_status.get('hasBenchmark'):
                    logger.info("✅ Benchmark 对象已初始化")
                    if benchmark_status.get('hasEpisode'):
                        logger.info("✅ Benchmark episode 对象已创建")
                    else:
                        logger.warning("⚠️  Benchmark episode 对象未创建")
                else:
                    logger.error("❌ Benchmark 对象未初始化！")
                    logger.error(f"   当前 URL: {benchmark_status.get('currentUrl', 'unknown')}")
                    logger.error(f"   路径: {benchmark_status.get('pathname', 'unknown')}")
                    logger.error("   可能的原因：")
                    logger.error("   1. benchmark_xrd.js 未正确加载")
                    logger.error("   2. 页面 URL 不包含 'XRD_simulator.html'（benchmark 脚本只在特定页面初始化）")
                    logger.error("   3. JavaScript 执行错误")
            except Exception as e:
                logger.warning(f"检查 benchmark 初始化状态时出错: {e}")
            
            # 设置 agent 名称
            try:
                page.evaluate(f"""
                    () => {{
                        if (typeof window.XRD_BENCHMARK !== 'undefined' && 
                            typeof window.XRD_BENCHMARK.episode !== 'undefined') {{
                            window.XRD_BENCHMARK.episode.agent_name = '{agent_name}';
                        }}
                    }}
                """)
            except Exception as e:
                logger.debug(f"设置 agent 名称失败: {e}")
            
            # 开始执行任务（可选：在指令前加入说明书操作指导作为上下文）
            task_instruction = XRD_TASK_INSTRUCTION
            if with_manual_context:
                excerpt = load_xrd_manual_excerpt()
                if excerpt:
                    task_instruction = excerpt + "\n\n" + XRD_TASK_INSTRUCTION
                    logger.info("已启用说明书上下文（with_manual_context）")
            logger.info("开始执行任务...")
            logger.info(f"任务指令: {task_instruction[:200]}...")
            
            observation = page_to_observation(page, task_instruction)
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
                    
                    response, actions = agent.predict(task_instruction, observation)
                    
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
                    actions = [agent.step(observation, task_instruction)]
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
                        before_screenshot = page.screenshot(type='png')
                        before_path = os.path.join(episode_dir, f"step_{step_count + 1}_before.png")
                        with open(before_path, "wb") as f:
                            f.write(before_screenshot)
                        logger.info(f"💾 已保存执行前截图: {before_path}")
                    except Exception as e:
                        logger.warning(f"保存执行前截图失败: {e}")
                    
                    # 执行动作（传递 agent 的屏幕分辨率配置和实际屏幕大小）
                    action_result = execute_action_on_page(
                        page, action, agent_screen_size, (actual_screen_width, actual_screen_height),
                        no_coord_convert=no_convert, model_type=agent_kwargs.get("model_type"),
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
                    new_observation = page_to_observation(page, task_instruction, mouse_pos=mouse_pos)
                    
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
                                if (typeof window.XRD_BENCHMARK !== 'undefined') {
                                    const ep = window.XRD_BENCHMARK.episode;
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
            
            # 提取并保存 benchmark 日志
            logger.info("="*60)
            logger.info("提取 benchmark 日志...")
            benchmark_log = extract_benchmark_log(page)
            
            test_success = False
            if benchmark_log:
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
                        print(f"  {status} {st.get('name')}: {st.get('attempts', 0)} 次尝试")
                
                print("="*60)
            else:
                logger.warning("⚠️  无法提取 benchmark 日志")
                # 即使提取失败，也保存一个占位文件，记录提取失败的信息
                placeholder_log = {
                    "error": "无法提取 benchmark 日志",
                    "reason": "window.XRD_BENCHMARK 对象可能未正确初始化",
                    "episode_dir": episode_dir,
                    "timestamp": datetime.now().isoformat(),
                    "agent_name": agent_name,
                    "note": "请检查 benchmark_xrd.js 是否正确加载到页面中"
                }
                log_path = os.path.join(episode_dir, "benchmark_log_extraction_failed.json")
                with open(log_path, "w", encoding="utf-8") as f:
                    json.dump(placeholder_log, f, indent=2, ensure_ascii=False)
                logger.warning(f"⚠️  已保存提取失败信息到: {log_path}")
                logger.warning("   可能的原因：")
                logger.warning("   1. benchmark_xrd.js 未正确加载到页面")
                logger.warning("   2. 页面 URL 不包含 'XRD_simulator.html'（benchmark 脚本只在特定页面初始化）")
                logger.warning("   3. JavaScript 执行错误导致 benchmark 对象未创建")
            
        except Exception as e:
            logger.error(f"测试过程中出错: {e}", exc_info=True)
            test_success = False
            benchmark_log = None
        finally:
            # 保持浏览器打开一段时间以便查看结果
            logger.info("测试完成，浏览器将在 10 秒后关闭...")
            time.sleep(10)
            browser.close()
        
        # 返回测试结果
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
    xrd_url: str = "http://localhost:8080/static/simulator/xrd_simulator/XRD_simulator.html",
    result_dir: str = get_results_dir("xrd"),
    headless: bool = False,
    with_manual_context: bool = False,
    **agent_kwargs
):
    """运行多次测试并统计结果
    
    Args:
        num_runs: 测试运行次数
        其他参数同 run_xrd_test_lightweight
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
            result = run_xrd_test_lightweight(
                agent_name=agent_name,
                model=model,
                max_steps=max_steps,
                xrd_url=xrd_url,
                result_dir=result_dir,
                headless=headless,
                with_manual_context=with_manual_context,
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
    parser = argparse.ArgumentParser(description="XRD Benchmark 轻量级测试脚本")
    
    # Agent 配置
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
    
    # 环境配置
    parser.add_argument("--xrd_url", type=str,
                       default="http://localhost:8080/static/simulator/xrd_simulator/XRD_simulator.html",
                       help="XRD 模拟器 URL")
    parser.add_argument("--max_steps", type=int, default=50,
                       help="最大步骤数")
    parser.add_argument("--headless", action="store_true",
                       help="无头模式运行（不显示浏览器窗口）")
    
    # 结果配置
    parser.add_argument("--result_dir", type=str, default=get_results_dir("xrd"),
                       help="结果保存目录")
    parser.add_argument("--num_runs", type=int, default=1,
                       help="测试运行次数（默认1次，多次测试会统计成功率）")
    parser.add_argument("--with_manual_context", action="store_true",
                       help="在任务指令前加入 XRD 说明书操作指导摘录作为上下文，观察 GUIAgent 能力是否有提升")
    
    args = parser.parse_args()
    
    # 设置 API 配置
    if args.api_key:
        os.environ["API_KEY"] = args.api_key
        os.environ["DOUBAO_API_KEY"] = args.api_key
        os.environ["GUI_OWL_API_KEY"] = args.api_key
    if args.api_url:
        u = args.api_url.rstrip("/")
        os.environ["API_URL"] = u
        os.environ["DOUBAO_API_URL"] = u
        os.environ["GUI_OWL_API_URL"] = u
    
    # 打印配置信息
    logger.info("="*60)
    logger.info("API 配置:")
    logger.info(f"  API Key: {os.environ.get('DOUBAO_API_KEY', '未设置')[:20]}...")
    logger.info(f"  API URL: {os.environ.get('DOUBAO_API_URL', '未设置')}")
    logger.info(f"  模型: {args.model}")
    logger.info(f"  测试次数: {args.num_runs}")
    logger.info(f"  说明书上下文: {'是' if args.with_manual_context else '否'}")
    logger.info("="*60)
    
    # 运行测试
    if args.num_runs > 1:
        # 多次测试并统计
        run_multiple_tests(
            num_runs=args.num_runs,
            agent_name=args.agent,
            model=args.model,
            model_type=args.model_type,
            temperature=args.temperature,
            max_tokens=args.max_tokens,
            max_steps=args.max_steps,
            xrd_url=args.xrd_url,
            result_dir=args.result_dir,
            headless=args.headless,
            with_manual_context=args.with_manual_context,
        )
    else:
        # 单次测试
        run_xrd_test_lightweight(
            agent_name=args.agent,
            model=args.model,
            model_type=args.model_type,
            temperature=args.temperature,
            max_tokens=args.max_tokens,
            max_steps=args.max_steps,
            xrd_url=args.xrd_url,
            result_dir=args.result_dir,
            headless=args.headless,
            with_manual_context=args.with_manual_context,
        )


if __name__ == "__main__":
    main()

