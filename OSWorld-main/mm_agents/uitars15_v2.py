
import os
import re
import base64
import requests
import logging
from typing import Optional, Dict, List, Tuple, Union
from loguru import logger

import ast
import base64
import math
import re

FINISH_WORD = "finished"
WAIT_WORD = "wait"
ENV_FAIL_WORD = "error_env"
CALL_USER = "call_user"

IMAGE_FACTOR = 28
MIN_PIXELS = 100 * 28 * 28
MAX_PIXELS = 16384 * 28 * 28
MAX_RATIO = 200


def _parse_coordinate_number_tokens(ori_box: str):
    """
    Normalize start_box/end_box strings from different VLMs.
    GUI-Owl / 部分模型会输出 [100, 200, 300, 400] 或带引号、<bbox> 包裹，直接 split 会得到 '[100' 导致 float 失败。
    EvoCUA 等常输出 **空格分隔** 的 \"100 200\"（无逗号）；若只按逗号 split 会整段变成一个 token，
    float 失败后正则只取到第一个数 → 误判为单坐标 → _coords_to_box4 走对角线 (v,v)，出现 x==y。
    """
    if ori_box is None:
        return []
    s = str(ori_box).strip().strip("'\"")
    s = re.sub(r"</?bbox>", "", s, flags=re.IGNORECASE)
    s = s.replace("(", "").replace(")", "").replace("[", "").replace("]", "")
    # 从整串按顺序提取所有数值（兼容逗号、空格、混合格式）
    tok = re.findall(r"-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?", s)
    nums = []
    for t in tok:
        try:
            nums.append(float(t))
        except ValueError:
            continue
    return nums


def _coords_to_box4(raw) -> tuple[float, float, float, float]:
    """Turn model box output into (x1, y1, x2, y2); supports 1–4+ numbers and loose strings."""
    if raw is None:
        raise ValueError("box is None")
    s = str(raw).strip()
    if not s or s.lower() == "none":
        raise ValueError(f"invalid box string: {raw!r}")
    coords = None
    try:
        coords = eval(s)
    except Exception:
        pass
    if not isinstance(coords, (tuple, list)):
        nums = _parse_coordinate_number_tokens(s)
        coords = nums
    if not coords:
        raise ValueError(f"no coordinates in box: {raw!r}")
    if len(coords) >= 4:
        return tuple(float(x) for x in coords[:4])  # type: ignore[return-value]
    if len(coords) == 2:
        x, y = float(coords[0]), float(coords[1])
        return x, y, x, y
    if len(coords) == 3:
        # Malformed triple: use first two as a point box (best effort).
        x, y = float(coords[0]), float(coords[1])
        return x, y, x, y
    if len(coords) == 1:
        # 仍只有一数：不完整输出，退化为对角点 (v,v)；正常应通过 _parse_coordinate_number_tokens 得到至少两数
        v = float(coords[0])
        return v, v, v, v
    raise ValueError(f"need 1+ numbers in box, got {len(coords)} from {raw!r}")


def _model_outputs_direct_screen_pixels(model_type: str) -> bool:
    """Direct screen-pixel mode: model emits 1920x1080 pixel coordinates."""
    m = (model_type or "").strip().lower().replace("-", "_")
    return m in {
        "absolute_1920",
        "absolute_screen",
        "screen_px",
        "pixel_1920",
        "openai",
        "gpt",
        "claude_1440",
        "claude_1440x810",
        "claude",
    }


def _model_outputs_absolute_screen_coords(model_type: str) -> bool:
    """Absolute-coordinate families that should skip /1000 normalization in parsing."""
    m = (model_type or "").strip().lower().replace("-", "_")
    return _model_outputs_direct_screen_pixels(m) or m == "evocua" or m.startswith("evocua_")


def convert_point_to_coordinates(text, is_answer=False, width=None, height=None):
    # 匹配 <point> 后的坐标：支持整数 (100 200) 或相对坐标 (0.104 0.918)
    pattern_int = r"<point>(\d+)\s+(\d+)</point>"
    pattern_float = r"<point>([\d.]+)\s+([\d.]+)</point>"

    def replace_int(match):
        x1, y1 = map(int, match.groups())
        return f"({x1},{y1})"

    def replace_float(match):
        x1, y1 = map(float, match.groups())
        if width is not None and height is not None and 0 < x1 <= 1 and 0 < y1 <= 1:
            x1, y1 = int(x1 * width), int(y1 * height)
        return f"({x1},{y1})"

    text = re.sub(r"\[EOS\]", "", text)
    text = re.sub(pattern_int, replace_int, text)
    text = re.sub(pattern_float, replace_float, text)
    return text.strip()


def _normalize_unicode_quotes_for_python_ast(s: str) -> str:
    """Map smart/typographic quotes to ASCII so ast.parse accepts the line."""
    return s.translate(
        str.maketrans(
            {
                "\u2018": "'",  # ‘
                "\u2019": "'",  # ’
                "\u201a": "'",  # ‚
                "\u201b": "'",  # ‛
                "\u201c": '"',  # “
                "\u201d": '"',  # ”
                "\u201e": '"',  # „
                "\u2032": "'",  # ′
                "\u2035": "'",  # ‵
                "\u00b4": "'",  # ´ acute (misused as apostrophe)
            }
        )
    )


def _strip_action_xml_markup(s: str) -> str:
    """Drop <action>… / repeated </action> tails some models append after Python Action lines."""
    s = (s or "").strip()
    if not s:
        return s
    s = re.sub(r"(?is)^\s*<\s*action\b[^>]*>\s*", "", s)
    s = re.sub(r"(?:\s*</\s*action\b[^>]*>\s*)+$", "", s, flags=re.I | re.MULTILINE)
    return s.strip()


# Split multiple actions after a *complete* call: outer `)` then blank line then `name(`.
# Do NOT use "')\\n\\n" alone — it matches the inner `)'` of start_box='(x,y)'… and truncates
# when the model omits the final `)` on click(...).
_ACTION_CHUNK_SEP = re.compile(
    r"(?<=\))\s*(?:\r?\n)\s*(?:\r?\n)\s*(?=[a-zA-Z_]\w*\s*\()",
    re.MULTILINE,
)


def normalize_action_str_for_ast(action_str: str) -> str:
    """Repair common VLM Action lines so ast.parse(..., mode='eval') succeeds.

    Models often emit malformed drag() such as:
    drag(start_box='[88, 830], end_box='[104, 830]')
    (missing quote/bracket on first box). Downstream drag() expects each box to
    eval to four numbers; expand 2-number points to (x,y,x,y).

    Truncated click/hover/start_box is also common, e.g. click(start_box='(97,851)
    with missing quote or outer paren, or an extra closing paren before the quote.

    Some models wrap or suffix XML-style ``</action>`` (often duplicated) after the call.
    """
    s = _strip_action_xml_markup(
        _normalize_unicode_quotes_for_python_ast((action_str or "").strip())
    )
    if not s:
        return s

    # click(start_box='(97,851) 或 click(start_box='(97,851' — 截断/缺 tuple 的 )
    _click_like = r"click|left_single|left_double|right_single|hover"
    m_bad_start_box = re.match(
        rf"^(?P<fn>{_click_like})\s*\(\s*start_box\s*=\s*(?P<q>['\"])\(\s*(?P<x>[\d.]+)\s*,\s*(?P<y>[\d.]+)\)*\s*(?P=q)\s*$",
        s,
        re.I,
    )
    if m_bad_start_box:
        fn, q, x, y = (
            m_bad_start_box.group("fn"),
            m_bad_start_box.group("q"),
            m_bad_start_box.group("x"),
            m_bad_start_box.group("y"),
        )
        return f"{fn}(start_box={q}({x},{y}){q})"
    # 常见截断：…(x,y) 缺引号/外层 )；…(x,y 无内层 )；或模型多打一个 ) 如 …(x,y))
    m_trunc_start_box = re.match(
        rf"^(?P<fn>{_click_like})\s*\(\s*start_box\s*=\s*(?P<q>['\"])\(\s*(?P<x>[\d.]+)\s*,\s*(?P<y>[\d.]+)\)*\s*$",
        s,
        re.I,
    )
    if m_trunc_start_box:
        fn, q, x, y = (
            m_trunc_start_box.group("fn"),
            m_trunc_start_box.group("q"),
            m_trunc_start_box.group("x"),
            m_trunc_start_box.group("y"),
        )
        return f"{fn}(start_box={q}({x},{y}){q})"

    # drag(..., start_box='[x,y]`, end_box=...) — 模型用反引号误当闭合引号
    if "drag(" in s.lower() and "`" in s:
        s = re.sub(r"(\]\s*)`(\s*,\s*end_box\s*=)", r"\1'\2", s)

    # drag(start_box='[88, 830], end_box='[104, 830]') — missing quote or ']' on first box
    # Allow optional ']' after the first pair before ", end_box="
    for q in ("'", '"'):
        pat = rf"""^drag\s*\(\s*start_box={q}\[\s*(\d+)\s*,\s*(\d+)\s*\]?\s*,\s*end_box={q}\[\s*(\d+)\s*,\s*(\d+)\s*\]{q}\s*\)\s*$"""
        m = re.match(pat, s, re.I | re.DOTALL | re.VERBOSE)
        if m:
            x1, y1, x2, y2 = m.group(1), m.group(2), m.group(3), m.group(4)
            return (
                f"drag(start_box='({x1},{y1},{x1},{y1})', end_box='({x2},{y2},{x2},{y2})')"
            )

    # drag(start_box='[88,830]', end_box='[104,830]') — syntactically valid AST but '[' may confuse; still 2 nums per box
    m2 = re.match(
        r"^drag\s*\(\s*start_box=(['\"])\[([\d,\s]+)\]\1\s*,\s*end_box=(['\"])\[([\d,\s]+)\]\3\s*\)\s*$",
        s,
        re.I | re.DOTALL,
    )
    if m2:
        n1 = _parse_coordinate_number_tokens(m2.group(2))
        n2 = _parse_coordinate_number_tokens(m2.group(4))
        if len(n1) >= 2 and len(n2) >= 2:

            def _box4(nums: list) -> str:
                if len(nums) >= 4:
                    a, b, c, d = int(nums[0]), int(nums[1]), int(nums[2]), int(nums[3])
                else:
                    a, b = int(nums[0]), int(nums[1])
                    c, d = a, b
                return f"({a},{b},{c},{d})"

            return f"drag(start_box='{_box4(n1)}', end_box='{_box4(n2)}')"

    return s


def _split_compound_action_chunk(chunk: str) -> list[str]:
    """把同一段里的多个函数调用拆开，如 click(...)\\nwait()、click(...);wait()。

    原先只按 `')\\n\\n` 切多动作，模型常写成 `')\\nwait()` 单换行，会整段交给 ast 导致失败。

    另：模型漏写 click 最外层 `)` 时会出现 ``start_box='(x,y)'\\n\\nwait()``；仅用 ``(?<=\\))`` 拆不开，
    需识别 **内层 tuple 的 )'** 后接空行再接下一函数（与合法 ``...(x,y)')\\n\\n`` 不冲突：后者中间还有外层 ``)``）。
    """
    chunk = (chunk or "").strip()
    if not chunk:
        return []
    primary = r"(?<=\))\s*(?:\r?\n|;)\s*(?=[a-zA-Z_]\w*\s*\()"
    lc = chunk.lstrip()
    # type(content='… )' … 里可能出现 )'\\n\\n；不要用内层 )' 规则拆，以免误切
    if lc.startswith("type("):
        parts = re.split(primary, chunk)
    else:
        parts = re.split(
            r"(?:(?<=\))\s*(?:\r?\n|;)|\)\s*'\s*(?:\r?\n)\s*(?:\r?\n))\s*(?=[a-zA-Z_]\w*\s*\()",
            chunk,
        )
    return [p.strip() for p in parts if p.strip()]


# 定义一个函数来解析每个 action
def parse_action(action_str):
    try:
        # 解析字符串为 AST 节点
        node = ast.parse(action_str, mode='eval')

        # 确保节点是一个表达式
        if not isinstance(node, ast.Expression):
            raise ValueError("Not an expression")

        # 获取表达式的主体
        call = node.body

        # 确保主体是一个函数调用
        if not isinstance(call, ast.Call):
            raise ValueError("Not a function call")

        # 获取函数名
        if isinstance(call.func, ast.Name):
            func_name = call.func.id
        elif isinstance(call.func, ast.Attribute):
            func_name = call.func.attr
        else:
            func_name = None

        # 获取关键字参数
        kwargs = {}
        for kw in call.keywords:
            key = kw.arg
            # 处理不同类型的值，这里假设都是常量
            if isinstance(kw.value, ast.Constant):
                value = kw.value.value
            elif isinstance(kw.value, ast.Str):  # 兼容旧版本 Python
                value = kw.value.s
            else:
                value = None
            kwargs[key] = value

        return {
            'function': func_name,
            'args': kwargs
        }

    except Exception as e:
        print(f"Failed to parse action '{action_str}': {e}")
        return None
    
def escape_single_quotes(text):
    # 匹配未转义的单引号（不匹配 \\'）
    pattern = r"(?<!\\)'"
    return re.sub(pattern, r"\\'", text)

def round_by_factor(number: int, factor: int) -> int:
    """Returns the closest integer to 'number' that is divisible by 'factor'."""
    return round(number / factor) * factor


def ceil_by_factor(number: int, factor: int) -> int:
    """Returns the smallest integer greater than or equal to 'number' that is divisible by 'factor'."""
    return math.ceil(number / factor) * factor


def floor_by_factor(number: int, factor: int) -> int:
    """Returns the largest integer less than or equal to 'number' that is divisible by 'factor'."""
    return math.floor(number / factor) * factor

def linear_resize(
    height: int, width: int, factor: int = IMAGE_FACTOR, min_pixels: int = MIN_PIXELS, max_pixels: int = MAX_PIXELS
) -> tuple[int, int]:
    if width * height > max_pixels:
        """
        如果图片超过/低于像素限制，则计算一个缩放因子resize_factor，使图片的像素数缩小到等于或小于max_pixels。这个缩放因子是通过开平方根计算的，确保纵横比保持不变,这样原始的相对坐标可以不经转换直接复用
        """
        resize_factor = math.sqrt(max_pixels / (width * height))
        width, height = int(width * resize_factor), int(height * resize_factor)
    if width * height < min_pixels:
        resize_factor = math.sqrt(min_pixels / (width * height))
        width, height = math.ceil(width * resize_factor), math.ceil(height * resize_factor)

    return height, width 

def smart_resize(
    height: int, width: int, factor: int = IMAGE_FACTOR, min_pixels: int = MIN_PIXELS, max_pixels: int = MAX_PIXELS
) -> tuple[int, int]:
    """
    Rescales the image so that the following conditions are met:

    1. Both dimensions (height and width) are divisible by 'factor'.

    2. The total number of pixels is within the range ['min_pixels', 'max_pixels'].

    3. The aspect ratio of the image is maintained as closely as possible.
    """
    if max(height, width) / min(height, width) > MAX_RATIO:
        raise ValueError(
            f"absolute aspect ratio must be smaller than {MAX_RATIO}, got {max(height, width) / min(height, width)}"
        )
    h_bar = max(factor, round_by_factor(height, factor))
    w_bar = max(factor, round_by_factor(width, factor))
    if h_bar * w_bar > max_pixels:
        beta = math.sqrt((height * width) / max_pixels)
        h_bar = floor_by_factor(height / beta, factor)
        w_bar = floor_by_factor(width / beta, factor)
    elif h_bar * w_bar < min_pixels:
        beta = math.sqrt(min_pixels / (height * width))
        h_bar = ceil_by_factor(height * beta, factor)
        w_bar = ceil_by_factor(width * beta, factor)
    return h_bar, w_bar

def parse_action_to_structure_output(text, factor, origin_resized_height, origin_resized_width, model_type="qwen25vl", max_pixels=16384*28*28, min_pixels=100*28*28):
    text = text.strip()

    if "<point>" in text:
        if _model_outputs_absolute_screen_coords(model_type):
            text = convert_point_to_coordinates(text, width=None, height=None)
        else:
            text = convert_point_to_coordinates(
                text, width=origin_resized_width, height=origin_resized_height
            )
    if "start_point=" in text:
        text = text.replace("start_point=", "start_box=")
    if "end_point=" in text:
        text = text.replace("end_point=", "end_box=")
    if "point=" in text:
        text = text.replace("point=", "start_box=")

    if model_type == "qwen25vl":
        smart_resize_height, smart_resize_width = smart_resize(
            origin_resized_height,
            origin_resized_width,
            factor=IMAGE_FACTOR,
            min_pixels=min_pixels,
            max_pixels=max_pixels,
        )

    # 正则表达式匹配 Action 字符串
    if text.startswith("Thought:"):
        thought_pattern = r"Thought: (.+?)(?=\s*Action: |$)"
        thought_hint = "Thought: "
    elif text.startswith("Reflection:"):
        thought_pattern = r"Reflection: (.+?)Action_Summary: (.+?)(?=\s*Action: |$)"
        thought_hint = "Reflection: "
    elif text.startswith("Action_Summary:"):
        thought_pattern = r"Action_Summary: (.+?)(?=\s*Action: |$)"
        thought_hint = "Action_Summary: "
    else:
        thought_pattern = r"Thought: (.+?)(?=\s*Action: |$)"
        thought_hint = "Thought: "
    reflection, thought = None, None
    thought_match = re.search(thought_pattern, text, re.DOTALL)
    if thought_match:
        if len(thought_match.groups()) == 1:
            thought = thought_match.group(1).strip()
        elif len(thought_match.groups()) == 2:
            thought = thought_match.group(2).strip()
            reflection = thought_match.group(1).strip()
    assert "Action:" in text
    action_str = text.split("Action: ")[-1]

    tmp_all_action = [p for p in _ACTION_CHUNK_SEP.split(action_str) if p.strip()]
    all_action: list[str] = []
    for raw_chunk in tmp_all_action:
        for action_str in _split_compound_action_chunk(raw_chunk):
            if "type(content" in action_str:
                # 正则表达式匹配 content 中的字符串并转义单引号
                def escape_quotes(match):
                    content = match.group(1)  # 获取 content 的值
                    return content

                # 使用正则表达式进行替换
                pattern = r"type\(content='(.*?)'\)"  # 匹配 type(content='...')
                content = re.sub(pattern, escape_quotes, action_str)

                # 处理字符串
                action_str = escape_single_quotes(content)
                action_str = "type(content='" + action_str + "')"
            all_action.append(action_str)

    def _action_str_for_ast(action: str) -> str:
        a = action.lstrip()
        # 仅 type() 内需要把换行变成 \\n 以便 ast；其它动作（含多行 click+wait）不要全局替换
        if "type(content" in a:
            a = a.replace("\n", "\\n")
        return normalize_action_str_for_ast(a)

    parsed_actions = [parse_action(_action_str_for_ast(action)) for action in all_action]
    actions = []
    for action_instance, raw_str in zip(parsed_actions, all_action):
        if action_instance == None:
            print(f"Action can't parse: {raw_str}")
            raise ValueError(f"Action can't parse: {raw_str}") 
        action_type = action_instance["function"]
        params = action_instance["args"]

        # import pdb; pdb.set_trace()
        action_inputs = {}
        for param_name, param in params.items():
            if param == "": continue
            param = param.lstrip()  # 去掉引号和多余的空格
            # 处理start_box或者end_box参数格式 '<bbox>x1 y1 x2 y2</bbox>'
            action_inputs[param_name.strip()] = param
            
            if "start_box" in param_name or "end_box" in param_name:
                ori_box = param
                numbers = _parse_coordinate_number_tokens(ori_box)
                if not numbers:
                    raise ValueError(f"无法从坐标串解析数字: {ori_box!r}")

                if _model_outputs_absolute_screen_coords(model_type):
                    float_numbers = [float(num) for num in numbers]
                elif model_type == "qwen25vl":
                    float_numbers = []
                    for num_idx, num in enumerate(numbers):
                        if (num_idx + 1) % 2 == 0:
                            float_numbers.append(float(num / smart_resize_height))
                        else:
                            float_numbers.append(float(num / smart_resize_width))
                else:
                    float_numbers = [num / factor for num in numbers]

                if len(float_numbers) == 2:
                    float_numbers = [float_numbers[0], float_numbers[1], float_numbers[0], float_numbers[1]]
                action_inputs[param_name.strip()] = str(float_numbers)

        # import pdb; pdb.set_trace()
        actions.append({
            "reflection": reflection,
            "thought": thought,
            "action_type": action_type,
            "action_inputs": action_inputs,
            "text": text
        })
    return actions

def parsing_response_to_pyautogui_code(
    responses,
    image_height: int,
    image_width: int,
    input_swap: bool = True,
    platform: str = "Ubuntu",
    model_type: str = "doubao",
) -> str:
    '''
    将M模型的输出解析为OSWorld中的action，生成pyautogui代码字符串
    参数:
        response: 包含模型输出的字典，结构类似于：
        {
            "action_type": "hotkey",
            "action_inputs": {
                "hotkey": "v ctrl",
                "start_box": None,
                "end_box": None
            }
        }
    返回:
        生成的pyautogui代码字符串
    '''

    abs_pixels = _model_outputs_absolute_screen_coords(model_type)
    direct_pixels = _model_outputs_direct_screen_pixels(model_type)
    # EvoCUA：原始预测 (x,y) → 执行坐标 x*1.92, y*1.08（对应约 1000 刻度到 1920×1080）
    _EVOCUA_SCALE_X = 1.92
    _EVOCUA_SCALE_Y = 1.08

    def _mid_xy_to_screen(mid_x: float, mid_y: float) -> tuple[float, float]:
        if direct_pixels:
            return round(float(mid_x), 3), round(float(mid_y), 3)
        if abs_pixels:
            return (
                round(float(mid_x) * _EVOCUA_SCALE_X, 3),
                round(float(mid_y) * _EVOCUA_SCALE_Y, 3),
            )
        return round(float(mid_x) * image_width, 3), round(float(mid_y) * image_height, 3)

    pyautogui_code = f"import pyautogui\nimport time\n"
    if isinstance(responses, dict):
        responses = [responses]
    for response_id, response in enumerate(responses):
        if "observation" in response:
            observation = response["observation"]
        else:
            observation = ""

        if "thought" in response:
            thought = response["thought"]
        else:
            thought = ""
        
        if response_id == 0:
            pyautogui_code += f"'''\nObservation:\n{observation}\n\nThought:\n{thought}\n'''\n"
        else:
            pyautogui_code += f"\ntime.sleep(1)\n"

        action_dict = response
        action_type = action_dict.get("action_type")
        action_inputs = action_dict.get("action_inputs", {})
        
        if action_type == "hotkey":
            # Parsing hotkey action
            if "key" in action_inputs:
                hotkey = action_inputs.get("key", "")
            else:
                hotkey = action_inputs.get("hotkey", "")

            if hotkey == "arrowleft":
                hotkey = "left"

            elif hotkey == "arrowright":
                hotkey = "right"
            
            elif hotkey == "arrowup":
                hotkey = "up"
            
            elif hotkey == "arrowdown":
                hotkey = "down"

            if hotkey:
                # Handle other hotkeys
                keys = hotkey.split()  # Split the keys by space
                convert_keys = []
                for key in keys:
                    if key == "space":
                        key = ' '
                    convert_keys.append(key)
                pyautogui_code += f"\npyautogui.hotkey({', '.join([repr(k) for k in convert_keys])})"
        
        elif action_type in ["press", "keydown"]:
            # Parsing press action
            if "key" in action_inputs:
                key_to_press = action_inputs.get("key", "")
            else:
                key_to_press = action_inputs.get("press", "")

            if key_to_press == "arrowleft":
                key_to_press = "left"

            elif key_to_press == "arrowright":
                key_to_press = "right"
            
            elif key_to_press == "arrowup":
                key_to_press = "up"
            
            elif key_to_press == "arrowdown":
                key_to_press = "down"
            
            elif key_to_press == "space":
                key_to_press = " "
                
            if key_to_press:
                # Simulate pressing a single key
                pyautogui_code += f"\npyautogui.keyDown({repr(key_to_press)})"
        
        elif action_type in ["release", "keyup"]:
            # Parsing press action
            if "key" in action_inputs:
                key_to_press = action_inputs.get("key", "")
            else:
                key_to_press = action_inputs.get("press", "")

            if key_to_press == "arrowleft":
                key_to_press = "left"

            elif key_to_press == "arrowright":
                key_to_press = "right"
            
            elif key_to_press == "arrowup":
                key_to_press = "up"
            
            elif key_to_press == "arrowdown":
                key_to_press = "down"
            
            elif key_to_press == "space":
                key_to_press = " "
                
            if key_to_press:
                # Simulate pressing a single key
                pyautogui_code += f"\npyautogui.keyUp({repr(key_to_press)})"

        elif action_type == "type":
            # Parsing typing action using clipboard
            content = action_inputs.get("content", "")
            content = escape_single_quotes(content)
            stripped_content = content
            if content.endswith("\n") or content.endswith("\\n"):
                stripped_content = stripped_content.rstrip("\\n").rstrip("\n")
            if content:
                if input_swap:
                    pyautogui_code += f"\nimport pyperclip"
                    pyautogui_code += f"\npyperclip.copy('{stripped_content}')"
                    pyautogui_code += f"\npyautogui.hotkey('ctrl', 'v')"
                    pyautogui_code += f"\ntime.sleep(0.5)\n"
                    if content.endswith("\n") or content.endswith("\\n"):
                        pyautogui_code += f"\npyautogui.press('enter')"
                else:
                    pyautogui_code += f"\npyautogui.write('{stripped_content}', interval=0.1)"
                    pyautogui_code += f"\ntime.sleep(0.5)\n"
                    if content.endswith("\n") or content.endswith("\\n"):
                        pyautogui_code += f"\npyautogui.press('enter')"

        
        elif action_type in ["drag", "select"]:
            # Parsing drag or select action based on start and end_boxes
            start_box = action_inputs.get("start_box")
            end_box = action_inputs.get("end_box")
            if start_box and end_box:
                x1, y1, x2, y2 = eval(start_box)  # Assuming box is in [x1, y1, x2, y2]
                sx, sy = _mid_xy_to_screen((x1 + x2) / 2, (y1 + y2) / 2)
                x1, y1, x2, y2 = eval(end_box)  # Assuming box is in [x1, y1, x2, y2]
                ex, ey = _mid_xy_to_screen((x1 + x2) / 2, (y1 + y2) / 2)
                pyautogui_code += (
                    f"\npyautogui.moveTo({sx}, {sy})\n"
                    f"\npyautogui.dragTo({ex}, {ey}, duration=1.0)\n"
                )

        elif action_type == "scroll":
            # Parsing scroll action
            start_box = action_inputs.get("start_box")
            if start_box:
                try:
                    x1, y1, x2, y2 = _coords_to_box4(start_box)
                    x, y = _mid_xy_to_screen((x1 + x2) / 2, (y1 + y2) / 2)
                except (ValueError, TypeError):
                    x = None
                    y = None
                
                # # 先点对应区域，再滚动
                # pyautogui_code += f"\npyautogui.click({x}, {y}, button='left')"
            else:
                x = None
                y = None
            direction = action_inputs.get("direction", "")
            
            if x == None:
                if "up" in direction.lower():
                    if platform.lower() == "ubuntu":
                        pyautogui_code += f"\npyautogui.scroll(-5)"
                    elif platform.lower() == "windows":
                        pyautogui_code += f"\npyautogui.scroll(-50)"
                elif "down" in direction.lower():
                    if platform.lower() == "ubuntu":
                        pyautogui_code += f"\npyautogui.scroll(5)"
                    elif platform.lower() == "windows":
                        pyautogui_code += f"\npyautogui.scroll(50)"
            else:
                if "up" in direction.lower():
                    if platform.lower() == "ubuntu":
                        pyautogui_code += f"\npyautogui.scroll(5, x={x}, y={y})"
                    elif platform.lower() == "windows":
                        pyautogui_code += f"\npyautogui.scroll(50, x={x}, y={y})"
                elif "down" in direction.lower():
                    if platform.lower() == "ubuntu":
                        pyautogui_code += f"\npyautogui.scroll(-5, x={x}, y={y})"
                    elif platform.lower() == "windows":
                        pyautogui_code += f"\npyautogui.scroll(-50, x={x}, y={y})"

        elif action_type in ["click", "left_single", "left_double", "right_single", "hover"]:
            # Parsing mouse click actions
            start_box = action_inputs.get("start_box")
            if start_box is not None and str(start_box).strip() and str(start_box).strip().lower() != "none":
                x1, y1, x2, y2 = _coords_to_box4(start_box)
                x, y = _mid_xy_to_screen((x1 + x2) / 2, (y1 + y2) / 2)
                if action_type == "left_single" or action_type == "click":
                    pyautogui_code += f"\npyautogui.click({x}, {y}, button='left')"
                elif action_type == "left_double":
                    pyautogui_code += f"\npyautogui.doubleClick({x}, {y}, button='left')"
                elif action_type == "right_single":
                    pyautogui_code += f"\npyautogui.click({x}, {y}, button='right')"
                elif action_type == "hover":
                    pyautogui_code += f"\npyautogui.moveTo({x}, {y})"
        
        elif action_type in ["finished"]:
            pyautogui_code = f"DONE"
        
        else:
            pyautogui_code += f"\n# Unrecognized action type: {action_type}"

    return pyautogui_code

def add_box_token(input_string):
    # Step 1: Split the string into individual actions
    if "Action: " in input_string and "start_box=" in input_string:
        suffix = input_string.split("Action: ")[0] + "Action: "
        actions = input_string.split("Action: ")[1:]
        processed_actions = []
        for action in actions:
            action = action.strip()
            # Step 2: Extract coordinates (start_box or end_box) using regex
            coordinates = re.findall(r"(start_box|end_box)='\((\d+),\s*(\d+)\)'", action)
            
            updated_action = action  # Start with the original action
            for coord_type, x, y in coordinates:
                # Convert x and y to integers
                updated_action = updated_action.replace(f"{coord_type}='({x},{y})'", f"{coord_type}='<|box_start|>({x},{y})<|box_end|>'")
            processed_actions.append(updated_action)
        
        # Step 5: Reconstruct the final string
        final_string = suffix + "\n\n".join(processed_actions)
    else:
        final_string = input_string
    return final_string

COMPUTER_USE_DOUBAO = """You are a GUI agent. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task.

## Output Format
You should first think about the reasoning process in the mind and then provide the user with the answer. 
The reasoning process is enclosed within <think> </think> tags
After the <think> tags, you should place final answer, which concludes your summarized thought and your action.

For example,
```
<think>detailed reasoning content here</think>
Thought: a small plan and finally summarize your next action (with its target element) in one sentence
Action: ...
```

## Action Space

click(point='<point>x1 y1</point>')
left_double(point='<point>x1 y1</point>')
right_single(point='<point>x1 y1</point>')
drag(start_point='<point>x1 y1</point>', end_point='<point>x2 y2</point>')
hotkey(key='ctrl c') # Split keys with a space and use lowercase. Also, do not use more than 3 keys in one hotkey action.
type(content='xxx') # Use escape characters \\', \\\", and \\n in content part to ensure we can parse the content in normal python string format. If you want to submit your input, use \\n at the end of content. 
scroll(point='<point>x1 y1</point>', direction='down or up or right or left') # Show more information on the `direction` side.
wait() #Sleep for 5s and take a screenshot to check for any changes.
finished(content='xxx') # Use escape characters \\', \\", and \\n in content part to ensure we can parse the content in normal python string format.

## Output Example
<think>Now that...</think>
Thought: Let's click ...
Action: click(point='<point>100 200</point>')

## Note
- Use {language} in `Thought` part.
- Write a small plan and finally summarize your next action (with its target element) in one sentence in `Thought` part.
- If you have executed several same actions (like repeatedly clicking the same point) but the screen keeps no change, please try to execute a modified action when necessary.

## User Instruction
{instruction}
"""

MOBILE_USE_DOUBAO = """You are a GUI agent. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task. 
## Output Format
```
Thought: ...
Action: ...
```
## Action Space

click(point='<point>x1 y1</point>')
long_press(point='<point>x1 y1</point>')
type(content='') #If you want to submit your input, use "\\n" at the end of `content`.
scroll(point='<point>x1 y1</point>', direction='down or up or right or left')
open_app(app_name=\'\')
drag(start_point='<point>x1 y1</point>', end_point='<point>x2 y2</point>')
press_home()
press_back()
finished(content='xxx') # Use escape characters \\', \\", and \\n in content part to ensure we can parse the content in normal python string format.


## Note
- Use {language} in `Thought` part.
- Write a small plan and finally summarize your next action (with its target element) in one sentence in `Thought` part.

## User Instruction
{instruction}
""" 

GROUNDING_DOUBAO = """You are a GUI agent. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task. \n\n## Output Format\n\nAction: ...\n\n\n## Action Space\nclick(point='<point>x1 y1</point>'')\n\n## User Instruction
{instruction}"""

COMPUTER_USE_NO_THINKING = """You are a GUI agent. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task.

## Output Format
```
Thought: ...
Action: ...
```

## Action Space

click(point='<point>x1 y1</point>')
left_double(point='<point>x1 y1</point>')
right_single(point='<point>x1 y1</point>')
drag(start_point='<point>x1 y1</point>', end_point='<point>x2 y2</point>')
hotkey(key='ctrl c') # Split keys with a space and use lowercase. Also, do not use more than 3 keys in one hotkey action.
type(content='xxx') # Use escape characters \\', \\\", and \\n in content part to ensure we can parse the content in normal python string format. If you want to submit your input, use \\n at the end of content. 
scroll(point='<point>x1 y1</point>', direction='down or up or right or left') # Show more information on the `direction` side.
wait() #Sleep for 5s and take a screenshot to check for any changes.
finished(content='xxx') # Use escape characters \\', \\", and \\n in content part to ensure we can parse the content in normal python string format.


## Note
- Use Chinese in `Thought` part.
- Write a small plan and finally summarize your next action (with its target element) in one sentence in `Thought` part.

## User Instruction
{instruction}
"""

class UITarsAgent:
    """
    UI-TARS Agent based on Seed1.5-VL model implementation.
    Integrates the GUI folder UI-TARS-1.5 implementation with the mm_agents architecture.
    """
    
    def __init__(
        self,
        # Model settings
        model: str,
        model_type: str,
        # Generation settings
        max_tokens: int,
        top_p: Optional[float],
        temperature: float,
        
        # History settings
        max_trajectory_length: Optional[int],
        max_image_history_length: Optional[int],  # UI-TARS uses history-5 logic
        
        # Prompt settings
        screenshot_pyautogui_prompt: str = "uitars_v1",
        
        # Parse settings
        which_parsed_actions: str = "all",
        
        # Outside infos
        max_steps: int = 100,
        
        # UI-TARS specific settings
        use_thinking: bool = True,
        language: str = "Chinese",
    ):
        """
        Initialize UI-TARS Agent.
        
        Args:
            model: Model name, defaults to doubao-1-5-thinking-vision-pro-250428
            api_key: API key for the model service
            base_url: Base URL for the API service
            max_tokens: Maximum tokens to generate
            top_p: Top-p sampling parameter
            temperature: Temperature for sampling
            max_trajectory_length: Maximum trajectory history length
            max_image_history_length: Maximum image history length (UI-TARS uses 5)
            screenshot_pyautogui_prompt: Prompt version
            which_parsed_actions: Which actions to parse
            max_steps: Maximum steps for the agent
            use_thinking: Whether to use thinking mode
            language: Language for responses
            openai_client: OpenAI client instance
        """

        self.model = model
        self.max_trajectory_length = max_trajectory_length
        self.logger = logger
        self.language = language
        self.thoughts = []
        self.actions = []
        self.observations = []
        self.history_images = []
        self.history_responses = []
        
        if use_thinking:
            self.system_prompt = COMPUTER_USE_DOUBAO
        else:
            self.system_prompt = COMPUTER_USE_NO_THINKING
        
        self.action_parse_res_factor = 1000
        self.model_type = model_type
        self.history_n = 5
        self.top_p = top_p
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.platform = "ubuntu"
        self.use_thinking = use_thinking

        self.inference_func = self.inference_with_thinking if use_thinking else self.inference_without_thinking
    
    def reset(self, _logger=None):
        global logger
        logger = _logger if _logger is not None else logging.getLogger("desktopenv.agent")

        self.thoughts = []
        self.actions = []
        self.observations = []
        self.history_images = []
        self.history_responses = []

    def pretty_print_messages(self, messages):
        """Pretty print messages while hiding base64 encoded images."""
        def format_message(msg):
            if not isinstance(msg, dict):
                return str(msg)
            
            formatted = {}
            for key, value in msg.items():
                if key == "content":
                    if isinstance(value, list):
                        formatted_content = []
                        for item in value:
                            if isinstance(item, dict) and "type" in item:
                                if item["type"] == "image_url" and "image_url" in item:
                                    # Replace base64 image with placeholder
                                    formatted_content.append({
                                        "type": "image_url",
                                        "image_url": {"url": "[BASE64_IMAGE_DATA]"}
                                    })
                                else:
                                    formatted_content.append(item)
                            else:
                                formatted_content.append(item)
                        formatted[key] = formatted_content
                    else:
                        formatted[key] = value
                else:
                    formatted[key] = value
            return formatted

        if isinstance(messages, list):
            return [format_message(msg) for msg in messages]
        return format_message(messages)


    def inference_with_thinking(self, messages):
        api_key = os.environ.get("DOUBAO_API_KEY", "").strip()
        api_url = os.environ.get("DOUBAO_API_URL", "").strip()
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        data = {
            "model": self.model,
            "messages": messages,
            "thinking": {"type": "enabled"},
            "max_tokens": self.max_tokens,
            "top_p": self.top_p,
            "temperature": self.temperature,
        }
        
        response = requests.post(api_url, headers=headers, json=data)
        
        print(response.json()["choices"][0])
        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"]
        else:
            return {
                "error": f"Request failed with status code {response.status_code}",
                "details": response.text
            }
    
    def inference_without_thinking(self, messages):
        api_key = os.environ.get("DOUBAO_API_KEY", "").strip()
        api_url = os.environ.get("DOUBAO_API_URL", "").strip()
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        # OpenAI / vLLM 兼容服务通常不接受豆包专有字段 `thinking`；通过环境变量关闭
        openai_compat = os.environ.get("UITARS_OPENAI_COMPAT", "").strip().lower() in (
            "1", "true", "yes", "on",
        )
        data = {
            "model": self.model,
            "messages": messages,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
        }
        if not openai_compat:
            data["thinking"] = {"type": "disabled"}
        if self.top_p is not None:
            data["top_p"] = self.top_p

        response = requests.post(api_url, headers=headers, json=data)

        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"]
        else:
            print(f"Request failed with status code {response.status_code}")
            try:
                err_body = response.json()
            except Exception:
                err_body = response.text
            print(err_body)
            return {
                "error": f"Request failed with status code {response.status_code}",
                "details": response.text,
                "body": err_body,
            }

    def _rollback_pending_turn(self, rollback_response: bool = False) -> None:
        """本步尚未写入 action/thought 就失败时，撤销已追加的 observation（及可选的 assistant 回复）。"""
        if self.observations:
            self.observations.pop()
        if self.history_images:
            self.history_images.pop()
        if rollback_response and self.history_responses:
            self.history_responses.pop()

    def predict(self, task_instruction: str, obs: dict) -> Tuple[Union[str, Dict, None], List]:
        """Predict the next action based on the current observation."""
        
        self.task_instruction = task_instruction
        
        assert len(self.observations) == len(self.actions) and len(self.actions) == len(
            self.thoughts
        ), "The number of observations and actions should be the same."

        # Convert binary screenshot to base64 if needed
        screenshot = obs["screenshot"]
        if isinstance(screenshot, bytes):
            screenshot = base64.b64encode(screenshot).decode('utf-8')
        
        self.history_images.append(screenshot)
        
        self.observations.append(
            {"screenshot": screenshot, "accessibility_tree": None}
        )
        
        if len(self.history_images) > self.history_n:
            self.history_images = self.history_images[-self.history_n:]
        
        images = self.history_images
        
        messages = [
            {
                "role": "user",
                "content": [{"type": "text", "text": self.system_prompt.format(
            instruction=task_instruction,
            language=self.language
        )}]
            }
        ]
        
        image_num = 0
        if len(self.history_responses) > 0:
            for history_idx, history_response in enumerate(self.history_responses):
                # send at most history_n images to the model
                if history_idx + self.history_n > len(self.history_responses):
                    messages.append({
                        "role": "user",
                        "content": [{"type": "image_url", "image_url": {"url": f"data:image/png;base64,{images[image_num]}"}}]
                    })
                    image_num += 1
                    
                messages.append({
                    "role": "assistant",
                    "content": history_response
                })
            messages.append({
                "role": "user",
                "content": [{"type": "image_url", "image_url": {"url": f"data:image/png;base64,{images[image_num]}"}}]
            })
            image_num += 1
        else:
            messages.append({
                "role": "user",
                "content": [{"type": "image_url", "image_url": {"url": f"data:image/png;base64,{images[image_num]}"}}]
            })
            image_num += 1
    
        try_times = 3
        origin_resized_height = 1080
        origin_resized_width = 1920
        prediction = None
        while True:
            if try_times <= 0:
                self.logger.error(f"Reach max retry times to fetch response from client, as error flag.")
                self._rollback_pending_turn(rollback_response=False)
                return prediction, ["FAIL"]
            try:
                logger.info(f"Messages: {self.pretty_print_messages(messages[-1])}")
                prediction = self.inference_func(messages)

            except Exception as e:
                self.logger.error(f"Error when fetching response from client, with error:\n{e}")
                prediction = None
                try_times -= 1
                continue

            # inference_* 在非 200 时返回 dict，不可交给 parse_action_to_structure_output（会 .strip() 崩）
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
                parsed_dict = parse_action_to_structure_output(prediction, self.action_parse_res_factor, origin_resized_height, origin_resized_width, self.model_type)
                parsed_pyautogui_code = parsing_response_to_pyautogui_code(
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
            parsed_dict = parse_action_to_structure_output(prediction, self.action_parse_res_factor, origin_resized_height, origin_resized_width, self.model_type)
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
        # 与 observations/actions 对齐：无 Thought 时也占一位，避免下一步 assert 失败
        self.thoughts.append(thoughts)
        for parsed_response in parsed_dict:
            if "action_type" in parsed_response:
                if parsed_response["action_type"] == FINISH_WORD:
                    self.actions.append(["DONE"])

                    return prediction, ["DONE"]
                
                elif parsed_response["action_type"] == WAIT_WORD:
                    self.actions.append(["WAIT"])

                    return prediction, ["WAIT"]
                
                elif parsed_response["action_type"] == ENV_FAIL_WORD:
                    self.actions.append(["FAIL"])
                    return prediction, ["FAIL"]

            
        self.actions.append([parsed_pyautogui_code])
    

        return prediction, [parsed_pyautogui_code]
        