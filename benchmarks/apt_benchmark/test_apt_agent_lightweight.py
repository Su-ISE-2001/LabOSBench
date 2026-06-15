"""
APT Benchmark 轻量级测试脚本
任务：在 APT 模拟器中完成一次完整的数据采集与重建流程

使用方法:
1. 确保模拟器正在运行（默认 http://localhost:8080）
2. python test_apt_agent_lightweight.py --model your_model_name
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BENCHMARKS = os.path.dirname(_SCRIPT_DIR)
ROOT = os.path.dirname(_BENCHMARKS)
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "OSWorld-main"))
sys.path.insert(0, _BENCHMARKS)

from benchmarks.paths import get_results_dir
from benchmarks.utils import save_success_episode

if "DOUBAO_API_KEY" not in os.environ:
    os.environ["DOUBAO_API_KEY"] = "sk-ui-tars-asd1231hascx12"
if "DOUBAO_API_URL" not in os.environ:
    os.environ["DOUBAO_API_URL"] = "http://180.184.148.133:11149/v1/chat/completions"

from playwright.sync_api import Page, sync_playwright
from mm_agents.uitars15_v2 import UITarsAgent
from mm_agents.uitars15_v1 import UITARSAgent as UITarsAgentV1
from mm_agents.uitars_agent import UITARSAgent as UITarsAgentBase
from mm_agents.o3_agent import O3Agent
from benchmarks.lightweight_observation_utils import (
    OBSERVATION_MODE_A11Y_TREE,
    OBSERVATION_MODE_SCREENSHOT,
    OBSERVATION_MODE_SCREENSHOT_720P,
    build_lightweight_observation,
    normalize_observation_mode,
)
from fib_benchmark.test_fib_agent_lightweight import should_skip_coord_convert

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


APT_TASK_INSTRUCTION = """在 APT（Atom Probe Tomography）模拟器中，完成一次完整的数据采集与三维重建流程。

若当前在模拟器选择页面，请先点击「Atom Probe Tomography」或 APT 图标进入 APT 模拟器。

请按顺序完成：
1. 在 SAMPLE 下拉框中选择样品（STEEL (VOLT) 或 STEEL (LASER)）
2. 选择 SPECIMEN TEMPERATURE（例如 25k、75k 或 135k）
3. 选择 DETECTION RATE（例如 0.5% 或 1%）
4. 若为电压模式，选择合适的 PULSE FREQUENCY 与 PULSE VOLTAGE / PULSE ENERGY
5. 点击 ALIGN SAMPLE，使样品对准
6. 点击 ALIGN LASER（对激光模式）或完成相应对准
7. 点击 START 开始实验，等待采集过程进行一段时间
8. 再次点击按钮（STOP）停止实验
9. 点击 RECONSTRUCT 打开重建面板
10. 在 ICF 与 K FACTOR 下拉框中选择合法的重建参数
11. 观察重建结果，并点击 FINISH 完成整个流程

当成功完成上述流程并出现“完成 APT 模拟器”的提示视为任务成功。"""


def get_agent(agent_name: str, **kwargs):
    if agent_name == "uitars15_v2":
        return UITarsAgent(
            model=kwargs.get("model", "ByteDance-Seed/UI-TARS-1.5-7B"),
            model_type=kwargs.get("model_type", "doubao"),
            max_tokens=kwargs.get("max_tokens", 3000),
            top_p=kwargs.get("top_p", None),
            temperature=kwargs.get("temperature", 0),
            max_trajectory_length=kwargs.get("max_trajectory_length"),
            max_image_history_length=kwargs.get("max_image_history_length", 5),
            use_thinking=kwargs.get("use_thinking", False),
            language=kwargs.get("language", "Chinese"),
        )
    elif agent_name == "uitars15_v1":
        return UITarsAgentV1(
            model=kwargs.get("model", "ByteDance-Seed/UI-TARS-1.5-7B"),
            runtime_conf={
                "temperature": kwargs.get("temperature", 0),
                "max_tokens": kwargs.get("max_tokens", 3000),
                "language": "Chinese",
                "history_n": 5,
            },
            max_trajectory_length=kwargs.get("max_trajectory_length", 50),
            model_type=kwargs.get("model_type", "qwen25vl"),
        )
    elif agent_name == "uitars":
        return UITarsAgentBase(
            model=kwargs.get("model", "ByteDance-Seed/UI-TARS-1.5-7B"),
            runtime_conf={
                "temperature": kwargs.get("temperature", 0),
                "max_tokens": kwargs.get("max_tokens", 3000),
                "language": "Chinese",
                "history_n": 5,
            },
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
    raise ValueError(
        f"Unknown agent: {agent_name}. Available: "
        "['uitars15_v2', 'openai_compat_chat', 'vlaa_gui', 'uitars15_v1', 'uitars', 'o3', 'gui_owl_vllm']"
    )


_last_mouse_pos = None


def infer_current_apt_subtask(page: Page):
    try:
        return page.evaluate("""
            () => {
                const api = window.APT_BENCHMARK_API;
                if (api && typeof api.inferCurrentSubtaskId === 'function') {
                    return api.inferCurrentSubtaskId();
                }
                return null;
            }
        """)
    except Exception:
        return None


def record_apt_agent_action(page: Page, action, subtask_id=None):
    try:
        page.evaluate(
            """
            (payload) => {
                const api = window.APT_BENCHMARK_API;
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


def page_to_observation(page: Page, instruction: str, mouse_pos=None):
    from fib_benchmark.test_fib_agent_lightweight import add_mouse_marker_to_screenshot

    global _last_mouse_pos
    try:
        screenshot_bytes = page.screenshot(type="png", full_page=False)
        if mouse_pos:
            screenshot_bytes = add_mouse_marker_to_screenshot(
                screenshot_bytes, mouse_pos[0], mouse_pos[1]
            )
            _last_mouse_pos = mouse_pos
        elif _last_mouse_pos:
            screenshot_bytes = add_mouse_marker_to_screenshot(
                screenshot_bytes, _last_mouse_pos[0], _last_mouse_pos[1]
            )
    except Exception as e:
        logger.error(f"获取截图失败: {e}")
        screenshot_bytes = b""
    return {
        "screenshot": screenshot_bytes,
        "accessibility_tree": None,
        "terminal": None,
        "instruction": instruction,
    }


def extract_benchmark_log(page: Page):
    """从浏览器中提取 APT benchmark 日志（结构与 benchmark_apt.js 中一致）"""
    try:
        exists = page.evaluate(
            "() => typeof window.APT_BENCHMARK !== 'undefined' && !!window.APT_BENCHMARK.episode"
        )
        if not exists:
            return None

        result = page.evaluate(
            """
            () => {
                try {
                    const ep = window.APT_BENCHMARK.episode;
                    const t0 = window.APT_BENCHMARK.episode._t0 || performance.now();
                    if (ep.timestamps.end_time === null) {
                        const nowIso = () => new Date().toISOString();
                        const tNow = performance.now();
                        ep.timestamps.end_time = nowIso();
                        ep.timestamps.duration_sec = (tNow - t0) / 1000.0;
                        const s = ep.summary;
                        const total = s.actual_steps || 0;
                        s.step_efficiency = s.optimal_steps > 0 && total > 0
                            ? s.optimal_steps / Math.max(total, 1)
                            : 0;
                        ep.subtasks = Object.keys(ep._subtask_map || {}).map(k => ep._subtask_map[k]);
                        const SUBTASKS = ep._subtask_map || {};
                        const required = ["S1","S2","S3","S4","S5","S6","S7","S8","S9","S10","S11","S12"];
                        ep.success = required.every(id => SUBTASKS[id] && SUBTASKS[id].success);
                        delete ep._t0;
                        const gm = ep.grounding_metrics || {};
                        delete gm._widget_total;
                        delete gm._widget_hits;
                        delete gm._text_total;
                        delete gm._text_hits;
                        delete gm._state_total;
                        delete gm._state_hits;
                    }
                    return JSON.stringify(ep);
                } catch (e) {
                    console.error("APT benchmark extract error", e);
                    return null;
                }
            }
            """
        )
        return json.loads(result) if result else None
    except Exception as e:
        logger.error(f"提取 APT benchmark 日志失败: {e}")
        return None


def run_apt_test_lightweight(
    agent_name: str = "uitars15_v2",
    model: str | None = None,
    max_steps: int = 100,
    apt_url: str = "http://localhost:8080/static/simulator/apt_simulator/APT_simulator.html",
    result_dir: str = get_results_dir("apt"),
    headless: bool = False,
    **agent_kwargs,
):
    """APT 轻量级 benchmark：直接用 Playwright 控制浏览器，不依赖虚拟机。"""
    from fib_benchmark.test_fib_agent_lightweight import execute_action_on_page, should_skip_coord_convert

    os.makedirs(result_dir, exist_ok=True)
    episode_dir = os.path.join(
        result_dir, f"episode_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    )
    os.makedirs(episode_dir, exist_ok=True)

    from benchmarks.vlaa_gui_support import resolve_subtask_agent_kwargs
    agent_kwargs = resolve_subtask_agent_kwargs(
        agent_name, agent_kwargs, model=model, max_steps_per_subtask=max_steps
    )
    agent_kwargs.setdefault("max_tokens", 3000)
    agent_kwargs.setdefault("temperature", 0)
    agent_kwargs["language"] = "Chinese"
    agent = get_agent(agent_name, **agent_kwargs)
    agent_screen_size = (1920, 1080)

    test_success = False
    benchmark_log = None

    with sync_playwright() as p:
        try:
            try:
                browser = p.chromium.launch(headless=headless)
            except Exception:
                browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={"width": agent_screen_size[0], "height": agent_screen_size[1]},
                device_scale_factor=1.0,
            )
            page = context.new_page()

            logger.info(f"打开 APT 模拟器: {apt_url}")
            page.goto(apt_url, wait_until="networkidle", timeout=60000)
            time.sleep(5)

            try:
                page.evaluate(
                    f"() => {{ if (window.APT_BENCHMARK && window.APT_BENCHMARK.episode) window.APT_BENCHMARK.episode.agent_name = '{agent_name}'; }}"
                )
            except Exception:
                pass

            observation = page_to_observation(page, APT_TASK_INSTRUCTION)
            step_count = 0
            mouse_pos = None
            vw, vh = page.viewport_size["width"], page.viewport_size["height"]
            no_convert = should_skip_coord_convert(
                agent_kwargs.get("model"),
                agent_name,
                agent_kwargs.get("model_type"),
            )

            while step_count < max_steps:
                logger.info(f"=== Step {step_count + 1}/{max_steps} ===")
                try:
                    _, actions = agent.predict(APT_TASK_INSTRUCTION, observation)
                except AttributeError:
                    actions = [agent.step(observation, APT_TASK_INSTRUCTION)]
                except Exception as e:
                    logger.error(f"Agent 出错: {e}")
                    step_count += 1
                    continue

                if not actions or actions[0] in ["FAIL", "DONE", "client error"]:
                    step_count += 1
                    continue

                for action in actions:
                    try:
                        with open(
                            os.path.join(
                                episode_dir, f"step_{step_count + 1}_before.png"
                            ),
                            "wb",
                        ) as f:
                            f.write(page.screenshot(type="png"))
                    except Exception:
                        pass

                    result = execute_action_on_page(
                        page, action, agent_screen_size, (vw, vh), no_coord_convert=no_convert,
                        model_type=agent_kwargs.get("model_type"),
                    )
                    if isinstance(result, tuple):
                        _, mouse_pos = result

                    time.sleep(1.5)
                    step_count += 1
                    observation = page_to_observation(page, APT_TASK_INSTRUCTION, mouse_pos)

                    try:
                        with open(
                            os.path.join(episode_dir, f"step_{step_count}_after.png"),
                            "wb",
                        ) as f:
                            f.write(observation.get("screenshot") or page.screenshot(type="png"))
                    except Exception:
                        pass

                    # 检查是否所有关键子任务已成功（与 benchmark_apt.js 中 required 一致）
                    try:
                        done = page.evaluate(
                            """
                            () => {
                                if (!window.APT_BENCHMARK || !window.APT_BENCHMARK.episode) return false;
                                const ep = window.APT_BENCHMARK.episode;
                                const subs = ep._subtask_map || {};
                                const required = ["S1","S2","S3","S4","S5","S6","S7","S8","S9","S10","S11","S12"];
                                return required.every(id => subs[id] && subs[id].success);
                            }
                            """
                        )
                        if done:
                            test_success = True
                            break
                    except Exception:
                        pass

                if test_success:
                    break

            benchmark_log = extract_benchmark_log(page)
            if benchmark_log:
                with open(
                    os.path.join(
                        episode_dir, f"{benchmark_log.get('episode_id', 'episode')}.json"
                    ),
                    "w",
                    encoding="utf-8",
                ) as f:
                    json.dump(benchmark_log, f, indent=2, ensure_ascii=False)
                test_success = benchmark_log.get("success", False)

        except Exception as e:
            logger.error(f"APT 测试出错: {e}", exc_info=True)
        finally:
            time.sleep(2)
            try:
                browser.close()
            except Exception:
                pass

    if test_success:
        save_success_episode(episode_dir, "apt")

    return {
        "success": test_success,
        "benchmark_log": benchmark_log,
        "episode_dir": episode_dir,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent", default="uitars15_v2")
    parser.add_argument("--model", default=None)
    parser.add_argument("--model_type", default="doubao")
    parser.add_argument("--api_key", default=None)
    parser.add_argument("--api_url", default=None)
    parser.add_argument(
        "--apt_url",
        default="http://localhost:8080/static/simulator/apt_simulator/APT_simulator.html",
    )
    parser.add_argument("--result_dir", default=get_results_dir("apt"))
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--max_steps", type=int, default=100)
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

    run_apt_test_lightweight(
        agent_name=args.agent,
        model=args.model,
        model_type=args.model_type,
        max_steps=args.max_steps,
        apt_url=args.apt_url,
        result_dir=args.result_dir,
        headless=args.headless,
    )


if __name__ == "__main__":
    main()

"""
APT Benchmark 轻量级测试脚本
直接使用 Playwright 控制浏览器，无需虚拟化环境

使用方法:
1. 确保 APT 模拟器正在运行（如 http://localhost:8080）
2. （可选）指定 API 后运行：
   export DOUBAO_API_KEY="sk-..."
   export DOUBAO_API_URL="http://34.13.73.248:3888/v1"
   python test_apt_agent_lightweight.py --model gpt-3.5-turbo

   Windows PowerShell:
   $env:DOUBAO_API_KEY="sk-..."; $env:DOUBAO_API_URL="http://34.13.73.248:3888/v1"
   python test_apt_agent_lightweight.py --model gpt-3.5-turbo

3. 不设置环境变量时使用脚本内默认 API（同上 URL，模型默认 gpt-3.5-turbo）
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

# 设置默认 API 配置（osworld 默认）
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

# APT 任务指令（完整任务描述，供模型理解上下文）
APT_TASK_INSTRUCTION = """在 APT（原子探针断层成像）模拟器中完成一次完整的实验并进入重建。具体步骤：
1. 从 sample 下拉框中选择一个合适的样品，选择 steel（volt）
2. 点击 ALIGN SAMPLE 按钮并对准样品，等待动画完成
3. 从 SPECIMEN TEMPERATURE 中选择温度 75k
4. 从 DETECTION RATE 中选择探测率 0.5%
5. 从 VOLTAGE PULSE FREQUENCY 选择频率如 200 kHz
6. 从 VOLTAGE PULSE FRACTION 中选择脉冲参数 10%
7. 点击 START 按钮，设备开始工作
8. 等待设备完成工作，然后再点击 START 按钮
9. 点击 RECONSTRUCT 按钮进入重建视图
10. 点击 ICF 下拉框中选择参数 1.4
11. 点击 K Factor 下拉框中选择参数 3.0
12. 点击完成按钮，然后在弹出的窗口中点击关闭按钮

请按照以上步骤顺序完成整个任务。"""

# 每步的简短指令（与 APT_TASK_INSTRUCTION 中 1–13 步完全一致，分步测试按此执行）
APT_STEP_INSTRUCTIONS = [
    "1. 从 sample 下拉框中选择一个合适的样品，选择 steel（volt）",
    "2. 点击 ALIGN SAMPLE 按钮并对准样品，等待动画完成",
    "3. 从 SPECIMEN TEMPERATURE 中选择温度 75k",
    "4. 从 DETECTION RATE 中选择探测率 0.5%",
    "5. 从 VOLTAGE PULSE FREQUENCY 选择频率如 200 kHz",
    "6. 从 VOLTAGE PULSE FRACTION 中选择脉冲参数 10%",
    "7. 点击 START 按钮，设备开始工作",
    "8. 等待设备完成工作，然后再点击 start 按钮",
    "8. 等待设备完成工作，然后再点击 start 按钮",
    "10. 点击 ICF 下拉框中选择参数 1.4",
    "11. 点击 K Factor 下拉框中选择参数 3.0",
    "12. 点击完成按钮，然后在弹出的窗口中点击关闭按钮",
]


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
    elif agent_name == "kimi":
        from mm_agents.kimi import KimiAgent
        return KimiAgent(
            model=kwargs.get("model", "kimi-k2.5"),
            max_steps=kwargs.get("max_steps", 60),
            max_image_history_length=kwargs.get("max_image_history_length", 3),
            platform=kwargs.get("platform", "windows"),
            max_tokens=kwargs.get("max_tokens", 4096),
            top_p=kwargs.get("top_p", 0.95),
            temperature=kwargs.get("temperature", 1),
            screen_size=kwargs.get("screen_size", (1920, 1080)),
            coordinate_type=kwargs.get("coordinate_type", "relative"),  # Kimi 坐标转化：relative
        )
    else:
        raise ValueError(
            f"Unknown agent: {agent_name}. Available: "
            "['uitars15_v2', 'openai_compat_chat', 'vlaa_gui', 'uitars15_v1', 'uitars', 'o3', 'gui_owl_vllm', 'kimi']"
        )


# 全局变量：记录最后的鼠标位置
_last_mouse_pos = None

def add_mouse_indicator_to_page(page: Page, x: int, y: int, box_size: int = 48):
    """在页面上添加红色框选指示器（操作位置），便于核对点击是否准确"""
    try:
        half = box_size // 2
        left = max(0, x - half)
        top = max(0, y - half)
        page.evaluate(f"""
            () => {{
                const wrap = document.getElementById('mouse-indicator-wrap');
                if (wrap) wrap.remove();
                
                const box = document.createElement('div');
                box.id = 'mouse-indicator-wrap';
                box.style.cssText = 'position:fixed;left:{left}px;top:{top}px;width:{box_size}px;height:{box_size}px;'
                    + 'border:3px solid red;background:rgba(255,0,0,0.15);pointer-events:none;z-index:99999;box-sizing:border-box;';
                document.body.appendChild(box);
                
                const dot = document.createElement('div');
                dot.style.cssText = 'position:absolute;left:{half - 3}px;top:{half - 3}px;width:6px;height:6px;'
                    + 'background:red;border-radius:50%;border:1px solid #fff;';
                box.appendChild(dot);
                
                setTimeout(() => {{ if (box.parentNode) box.remove(); }}, 5000);
            }}
        """)
    except Exception as e:
        logger.debug(f"添加红色框选指示器失败: {e}")

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
    
    # 判断是否为归一化坐标（与 XRD 一致）
    is_normalized = (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0)
    if is_normalized:
        scaled_x = x * actual_screen_width
        scaled_y = y * actual_screen_height
        logger.info(f"📐 归一化坐标转换: ({x:.4f}, {y:.4f}) [归一化] "
                    f"→ ({scaled_x:.1f}, {scaled_y:.1f}) [实际分辨率: {actual_screen_width}x{actual_screen_height}]")
    else:
        # 绝对坐标：从 Agent 期望分辨率缩放到实际分辨率（与 XRD 一致）
        if agent_screen_width == actual_screen_width and agent_screen_height == actual_screen_height:
            return int(x), int(y)
        scale_x = actual_screen_width / agent_screen_width
        scale_y = actual_screen_height / agent_screen_height
        scaled_x = x * scale_x
        scaled_y = y * scale_y
        logger.info(f"📐 绝对坐标缩放: ({x}, {y}) [Agent分辨率: {agent_screen_width}x{agent_screen_height}] "
                    f"→ ({scaled_x:.1f}, {scaled_y:.1f}) [实际分辨率: {actual_screen_width}x{actual_screen_height}]")
    
    return int(scaled_x), int(scaled_y)


def parse_and_execute_pyautogui(
    page: Page,
    code: str,
    agent_screen_size: tuple = (1920, 1080),
    actual_screen_size: tuple = None,
    no_coord_convert: bool = False,
):
    """解析 pyautogui 代码并转换为 Playwright 操作

    no_coord_convert: True 时坐标按模型输出直接使用（与 uitars15_v2 当前像素输出一致）。
    """
    import re
    
    try:
        # 获取 viewport 与内容区尺寸（内容区排除滚动条，避免点击偏到滚动条上）
        if actual_screen_size is None:
            viewport = page.viewport_size
            actual_width = viewport['width']
            actual_height = viewport['height']
        else:
            actual_width, actual_height = actual_screen_size
        
        try:
            content_size = page.evaluate(
                "() => ({ w: document.documentElement.clientWidth, h: document.documentElement.clientHeight })"
            )
            map_width = content_size.get("w", actual_width) or actual_width
            map_height = content_size.get("h", actual_height) or actual_height
            if map_width <= 0:
                map_width = actual_width
            if map_height <= 0:
                map_height = actual_height
        except Exception:
            map_width, map_height = actual_width, actual_height
        
        agent_width, agent_height = agent_screen_size
        
        logger.info("========== 解析前收到的原始代码（API 输出） ==========")
        logger.info(f"原始 code: {repr(code)[:600]}")
        if len(code) > 600:
            logger.info(f"  ... (总长 {len(code)} 字符)")
        logger.info("======================================================")
        
        logger.info(f"🖥️  屏幕分辨率信息:")
        logger.info(f"   Agent 期望分辨率: {agent_width}x{agent_height}")
        logger.info(f"   Viewport: {actual_width}x{actual_height}, 内容区(用于映射): {map_width}x{map_height}")
        if agent_width != actual_width or agent_height != actual_height:
            logger.warning(f"⚠️  分辨率不匹配！将进行坐标转换（支持归一化和绝对坐标）")
        # 仅当坐标超出 agent 分辨率时，才按标定比例换算（如 UITARS 输出 3054 等）；Kimi 已在 agent 内转为 1920x1080，不再乘此 scale
        API_REF_X, API_REF_Y = 3054.72, 183.6
        DISPLAY_REF_X, DISPLAY_REF_Y = 1617, 171
        API_SCALE_X = DISPLAY_REF_X / API_REF_X
        API_SCALE_Y = DISPLAY_REF_Y / API_REF_Y
        logger.info(f"   标定比例(仅当坐标>agent分辨率时使用): scale=({API_SCALE_X:.4f}, {API_SCALE_Y:.4f})")
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
            # 跳过导入语句、注释、空行，以及纯自然语言前缀（Observation/Thought）
            if (
                line.startswith('import ')
                or line.startswith('from ')
                or line.startswith('#')
                or line.startswith("'''")
                or line.startswith('"""')
                or line.startswith('Observation:')
                or line.startswith('Thought:')
                or not line
            ):
                continue
            cleaned_lines.append(line)
        
        # 重新组合代码
        code = '\n'.join(cleaned_lines)
        
        # 如果代码为空或只包含简单单词，尝试做语义兜底映射（如直接输入 start/STOP）
        stripped = code.strip().lower()
        if not stripped:
            logger.warning("⚠️  代码为空，无法执行")
            return (False, None)
        # 分步测试下，模型有时只输出一个单词 start/stop，这里做兼容：直接点击 START/STOP 按钮
        if stripped in ("start", "stop"):
            logger.info(f"🔧 检测到简化指令 '{stripped}'，直接点击 start/stop 按钮")
            try:
                page.click("#start-stop-btn")
                # 返回当前鼠标位置为空，但视为成功
                return (True, None)
            except Exception as e:
                logger.error(f"❌ 点击 start-stop-btn 失败: {e}")
                return (False, None)
        
        logger.info(f"📝 清理后的代码: {code[:200]}...")

        # 先解析 moveTo / dragTo（用于滑块拖动等连续动作）
        move_pattern = r'pyautogui\.moveTo\(([\d.]+),\s*([\d.]+)\)'
        drag_pattern = r'pyautogui\.dragTo\(([\d.]+),\s*([\d.]+)(?:,\s*duration=([\d.]+))?'
        move_match = re.search(move_pattern, code, re.MULTILINE)
        drag_match = re.search(drag_pattern, code, re.MULTILINE)
        if move_match or drag_match:
            mx = my = None
            if move_match:
                mx, my = float(move_match.group(1)), float(move_match.group(2))
            if drag_match:
                dx, dy = float(drag_match.group(1)), float(drag_match.group(2))
                duration = float(drag_match.group(3)) if drag_match.group(3) else 0.5
            else:
                dx, dy, duration = None, None, 0.0

            coords_to_convert = []
            if mx is not None:
                coords_to_convert.append(("move", mx, my))
            if drag_match:
                coords_to_convert.append(("drag", dx, dy))

            converted = {}
            for kind, ox, oy in coords_to_convert:
                # 复用 click 的坐标转换逻辑
                if no_coord_convert:
                    cx = int(round(ox))
                    cy = int(round(oy))
                    logger.info(f"   {kind} no_coord_convert → ({cx}, {cy})")
                elif ox <= agent_width and oy <= agent_height and ox >= 0 and oy >= 0:
                    scale_x = actual_width / agent_width
                    scale_y = actual_height / agent_height
                    cx = int(round(ox * scale_x))
                    cy = int(round(oy * scale_y))
                    logger.info(
                        f"   {kind} 使用 agent→viewport 缩放 ({scale_x:.4f}, {scale_y:.4f}) → ({cx}, {cy})"
                    )
                else:
                    cx = int(round(ox * API_SCALE_X))
                    cy = int(round(oy * API_SCALE_Y))
                    logger.info(f"   {kind} 使用标定比例换算 → ({cx}, {cy})")
                # clamp 到内容区内
                MARGIN_RIGHT = 20
                MARGIN_LEFT = 2
                max_x_safe = max(MARGIN_LEFT, min(map_width, actual_width) - MARGIN_RIGHT)
                cx = max(0, min(cx, max_x_safe, actual_width - 1))
                cy = max(0, min(cy, map_height - 1, actual_height - 1))
                converted[kind] = (cx, cy)

            try:
                # moveTo: 先移动到起点（如果存在）
                if "move" in converted:
                    sx, sy = converted["move"]
                    logger.info(f"🖱️  moveTo 移动到: ({sx}, {sy})")
                    add_mouse_indicator_to_page(page, sx, sy)
                    time.sleep(0.2)
                    page.mouse.move(sx, sy)
                # dragTo: 从当前位置拖到目标点
                if "drag" in converted:
                    tx, ty = converted["drag"]
                    logger.info(f"🖱️  dragTo 拖动到: ({tx}, {ty}), duration={duration}")
                    page.mouse.down()
                    # 简单用 duration 做一次 sleep，避免太快
                    if duration > 0:
                        steps = max(1, int(duration * 10))
                        sx, sy = page.mouse.position or converted.get("move", (tx, ty))
                        for k in range(1, steps + 1):
                            ix = int(sx + (tx - sx) * k / steps)
                            iy = int(sy + (ty - sy) * k / steps)
                            page.mouse.move(ix, iy)
                            time.sleep(duration / steps)
                    page.mouse.move(tx, ty)
                    page.mouse.up()
                return (True, converted.get("drag") or converted.get("move"))
            except Exception as e:
                logger.error(f"❌ 执行 moveTo/dragTo 失败: {e}")
                # 继续尝试 click 解析

        # 解析 click(x, y)：按标定 (3054.72, 184.68)→(1570, 249) 线性换算到显示坐标，再限制在内容区内
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
                logger.info(f"📍 API 解析出的原始坐标: x={original_x}, y={original_y}")
                if no_coord_convert:
                    x = int(round(original_x))
                    y = int(round(original_y))
                    logger.info(f"   no_coord_convert → ({x}, {y})")
                # 若已在 agent 分辨率内(如 Kimi 已转为 1920x1080)，只做 agent→viewport 缩放；否则按标定比例换算
                elif original_x <= agent_width and original_y <= agent_height and original_x >= 0 and original_y >= 0:
                    # 已在 1920x1080 等 agent 空间，仅按 viewport 缩放
                    scale_x = actual_width / agent_width
                    scale_y = actual_height / agent_height
                    x = int(round(original_x * scale_x))
                    y = int(round(original_y * scale_y))
                    logger.info(f"   已在 agent 分辨率内 → viewport 缩放 ({scale_x:.4f}, {scale_y:.4f}) → ({x}, {y})")
                else:
                    # 大坐标按标定比例换算
                    x = int(round(original_x * API_SCALE_X))
                    y = int(round(original_y * API_SCALE_Y))
                    logger.info(f"   标定比例换算 → ({x}, {y})")
                # 限制在内容区内，右侧留白避免点到滚动条
                MARGIN_RIGHT = 20
                MARGIN_LEFT = 2
                max_x_safe = max(MARGIN_LEFT, min(map_width, actual_width) - MARGIN_RIGHT)
                x = max(0, min(x, max_x_safe, actual_width - 1))
                y = max(0, min(y, map_height - 1, actual_height - 1))
                logger.info(f"   换算后(标定比例) → 内容区内(右侧留白{MARGIN_RIGHT}px): ({x}, {y})")
                break
        
        # 若上面未做 clamp（理论上已做），再保险限制在 viewport 内
        if x is not None and y is not None:
            max_x = max(0, actual_width - 1)
            max_y = max(0, actual_height - 1)
            if x > max_x or y > max_y or x < 0 or y < 0:
                x = max(0, min(x, max_x))
                y = max(0, min(y, max_y))
                logger.info(f"   最终限制在 viewport: ({x}, {y})")
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
        
        # 解析 doubleClick(x, y)：与 click 相同，按标定 (3054.72, 184.68)→(1570, 249) 线性换算
        double_click_patterns = [
            r'pyautogui\.doubleClick\(([\d.]+),\s*([\d.]+)\)',
            r'pyautogui\.doubleClick\(x=([\d.]+),\s*y=([\d.]+)\)',
        ]
        for pattern in double_click_patterns:
            match = re.search(pattern, code, re.MULTILINE)
            if match:
                original_x, original_y = float(match.group(1)), float(match.group(2))
                logger.info(f"📍 API 解析出的原始坐标（未做任何映射）: x={original_x}, y={original_y}")
                x = int(round(original_x * API_SCALE_X))
                y = int(round(original_y * API_SCALE_Y))
                MARGIN_RIGHT = 20
                max_x_safe = max(2, min(map_width, actual_width) - MARGIN_RIGHT)
                x = max(0, min(x, max_x_safe, actual_width - 1))
                y = max(0, min(y, map_height - 1, actual_height - 1))
                logger.info(f"   换算后(标定比例) → 内容区内(右侧留白): ({x}, {y})")
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
        if not page.evaluate("() => typeof window.APT_BENCHMARK !== 'undefined'"):
            return None

        result = page.evaluate("""
            () => {
                if (typeof window.APT_BENCHMARK !== 'undefined') {
                    if (typeof window.APT_BENCHMARK.finalize === 'function') {
                        return JSON.stringify(window.APT_BENCHMARK.finalize());
                    }
                    if (typeof window.APT_BENCHMARK.episode !== 'undefined') {
                        return JSON.stringify(window.APT_BENCHMARK.episode);
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


def get_apt_state(page: Page) -> dict:
    """从页面 DOM 读取 APT 关键控件状态，用于检测步骤是否完成、界面是否稳定。"""
    try:
        state = page.evaluate("""
            () => {
                const sampleEl = document.querySelector('#sample');
                const alignBtn = document.querySelector('#align-sample-btn');
                const startStopBtn = document.querySelector('#start-stop-btn');
                const startStopLabel = document.querySelector('#start-stop-label');
                const reconstructBtn = document.querySelector('#reconstruct-btn');
                const specimenTemp = document.querySelector('#specimen-temp');
                const detectionRate = document.querySelector('#detection-rate');
                const pulseFreq = document.querySelector('#pulse-freq');
                const pulseEnergy = document.querySelector('#pulse-energy');
                const alignLaserBtn = document.querySelector('#align-laser-btn');
                const reconPanel = document.querySelector('#controls-reconstruction');
                const icfEl = document.querySelector('#icf');
                const kFactorEl = document.querySelector('#k-factor');
                const modalFinish = document.querySelector('#modal-finish');
                const modalReconstruct = document.querySelector('#modal-reconstruct-info');
                const simBase = document.querySelector('#simulator-base');
                const experiment_screen_visible = simBase ? simBase.classList.contains('screen-2') : false;
                const reconVisible = reconPanel ? !reconPanel.classList.contains('totally-hidden') : false;
                const modalVisible = modalFinish ? !modalFinish.classList.contains('totally-hidden') : false;
                const modalReconstructVisible = modalReconstruct ? !modalReconstruct.classList.contains('totally-hidden') : false;
                // jQuery selectmenu 可能未同步更新原生 select.value，优先用 jQuery 取值
                var sampleVal = '';
                if (sampleEl) {
                    try {
                        if (typeof window.jQuery !== 'undefined') {
                            var jqVal = window.jQuery('#sample').val();
                            if (jqVal != null && jqVal !== '') sampleVal = String(jqVal);
                        }
                        if (sampleVal === '' && sampleEl.value) sampleVal = sampleEl.value;
                    } catch (e) {}
                }

                return {
                    sample_value: sampleVal,
                    align_btn_disabled: alignBtn ? alignBtn.disabled : true,
                    start_stop_label_text: startStopLabel ? (startStopLabel.innerText || startStopLabel.textContent || '').trim() : '',
                    start_stop_btn_disabled: startStopBtn ? startStopBtn.disabled : true,
                    reconstruct_btn_disabled: reconstructBtn ? reconstructBtn.disabled : true,
                    specimen_temp_value: specimenTemp ? specimenTemp.value : '',
                    detection_rate_value: detectionRate ? detectionRate.value : '',
                    pulse_freq_value: pulseFreq ? pulseFreq.value : '',
                    pulse_energy_value: pulseEnergy ? pulseEnergy.value : '',
                    align_laser_visible: alignLaserBtn ? (alignLaserBtn.offsetParent !== null && !alignLaserBtn.disabled) : false,
                    reconstruction_panel_visible: reconVisible,
                    icf_value: icfEl ? icfEl.value : '',
                    k_factor_value: kFactorEl ? kFactorEl.value : '',
                    modal_finish_visible: modalVisible,
                    modal_reconstruct_visible: modalReconstructVisible,
                    experiment_screen_visible: experiment_screen_visible,
                    _hash: [sampleVal, alignBtn?.disabled, startStopLabel?.innerText, startStopBtn?.disabled,
                            reconstructBtn?.disabled, specimenTemp?.value, detectionRate?.value, pulseFreq?.value, pulseEnergy?.value,
                            reconVisible, icfEl?.value, kFactorEl?.value, modalVisible, experiment_screen_visible].join('|')
                };
            }
        """)
        return state or {}
    except Exception as e:
        logger.debug(f"get_apt_state 失败: {e}")
        return {}


def is_step_expected_state_reached(step_index: int, state: dict) -> bool:
    """根据本地网页的 DOM 状态判断当前步是否已出现预期变化，只有满足才进入下一步。
    step_index 对应 APT_STEP_INSTRUCTIONS 下标（0=第1步）。"""
    if step_index < 0 or step_index >= len(APT_STEP_INSTRUCTIONS):
        return True
    s = state or {}
    # 第 1 步：sample 已选 steel(volt) -> value 为 voltage 或 laser；空或 "0" 为未选
    if step_index == 0:
        v = (s.get("sample_value") or "").strip().lower()
        ok = v in ("voltage", "laser") or (v and v != "0")
        if ok:
            logger.info(f"✅ 检测到第 1 步完成：sample_value={s.get('sample_value')}")
        else:
            logger.debug(f"第 1 步未通过：sample_value={repr(s.get('sample_value'))}")
        return ok
    # 第 2 步：ALIGN SAMPLE 完成（对齐后 align-sample-btn 被 disable，benchmark 也有 S6 返回值）
    if step_index == 1:
        ok = s.get("align_btn_disabled") is True
        if ok:
            logger.info("✅ 检测到第 2 步完成：align_btn_disabled=true（ALIGN SAMPLE 已完成）")
        return ok
    # 第 3 步：温度已选 75k
    if step_index == 2:
        v = (s.get("specimen_temp_value") or "").strip()
        ok = v == "75k"
        if ok:
            logger.info(f"✅ 检测到第 3 步完成：specimen_temp_value={v}")
        return ok
    # 第 4 步：探测率 0.5%
    if step_index == 3:
        v = (s.get("detection_rate_value") or "").strip()
        ok = v == "0.5%"
        if ok:
            logger.info(f"✅ 检测到第 4 步完成：detection_rate_value={v}")
        return ok
    # 第 5 步：频率 200 kHz
    if step_index == 4:
        v = (s.get("pulse_freq_value") or "").strip()
        ok = "200" in v
        if ok:
            logger.info(f"✅ 检测到第 5 步完成：pulse_freq_value={v}")
        return ok
    # 第 6 步：脉冲参数 10%
    if step_index == 5:
        v = (s.get("pulse_energy_value") or "").strip()
        ok = "10%" in v
        if ok:
            logger.info(f"✅ 检测到第 6 步完成：pulse_energy_value={v}")
        return ok
    # 第 7 步：已点 START，设备运行中（标签为 Stop）
    if step_index == 6:
        v = (s.get("start_stop_label_text") or "").strip().upper()
        ok = "STOP" in v
        if ok:
            logger.info(f"✅ 检测到第 7 步完成：start_stop_label_text={s.get('start_stop_label_text')}")
        return ok
    # 第 8 步：已点 STOP
    if step_index == 7:
        v = (s.get("start_stop_label_text") or "").strip().upper()
        ok = "START" in v
        if ok:
            logger.info(f"✅ 检测到第 8 步完成：start_stop_label_text={s.get('start_stop_label_text')}")
        return ok
    # 第 9 步：已点 RECONSTRUCT，重建面板可见
    if step_index == 8:
        ok = s.get("reconstruction_panel_visible") is True
        if ok:
            logger.info("✅ 检测到第 9 步完成：reconstruction_panel_visible=true")
        return ok
    # 第 10 步：ICF 已选 1.4
    if step_index == 9:
        v = (s.get("icf_value") or "").strip()
        ok = v == "1.4"
        if ok:
            logger.info(f"✅ 检测到第 10 步完成：icf_value={v}")
        return ok
    # 第 11 步：K Factor 已选 3.0
    if step_index == 10:
        v = (s.get("k_factor_value") or "").strip()
        ok = v == "3.0"
        if ok:
            logger.info(f"✅ 检测到第 11 步完成：k_factor_value={v}")
        return ok
    # 第 12 步：完成+关闭（完成弹窗已关）
    if step_index == 11:
        ok = s.get("modal_finish_visible") is not True
        if ok:
            logger.info("✅ 检测到第 12 步完成：modal_finish 已关闭")
        return ok
    return True


def wait_for_apt_stabilization(
    page: Page,
    min_wait_sec: float = 1.0,
    max_wait_sec: float = 20.0,
    stable_interval_sec: float = 1.5,
    poll_interval_sec: float = 0.5,
) -> None:
    """等待 APT 界面状态稳定后再继续：至少等待 min_wait_sec，且状态连续稳定 stable_interval_sec 不变，或超过 max_wait_sec 后退出。
    若检测到已点 START（标签为 STOP）但实验界面(screen-2)未出现，会先等待界面跳转完成（最多 10 秒）。"""
    logger.info("⏳ 等待界面状态稳定（检测到因素完成后再执行下一步）...")
    time.sleep(min_wait_sec)
    try:
        page.wait_for_load_state("networkidle", timeout=3000)
    except Exception:
        pass
    state = get_apt_state(page)
    label = (state.get("start_stop_label_text") or "").strip().upper()
    experiment_visible = state.get("experiment_screen_visible", False)
    if "STOP" in label and not experiment_visible:
        logger.info("⏳ 检测到已点 START 但实验界面未切换，等待界面跳转（screen-2）...")
        deadline_screen = time.monotonic() + 10.0
        while time.monotonic() < deadline_screen:
            time.sleep(poll_interval_sec)
            state = get_apt_state(page)
            if state.get("experiment_screen_visible", False):
                logger.info("✅ 实验界面(screen-2)已出现，继续")
                break
        else:
            logger.warning("⏳ 等待实验界面超时(10s)，继续下一步")
    deadline = time.monotonic() + max_wait_sec
    prev_hash = None
    stable_since = time.monotonic()
    while time.monotonic() < deadline:
        time.sleep(poll_interval_sec)
        state = get_apt_state(page)
        cur_hash = state.get("_hash", "")
        if cur_hash == prev_hash and prev_hash is not None:
            if time.monotonic() - stable_since >= stable_interval_sec:
                logger.info(f"✅ 状态已稳定（连续 {stable_interval_sec}s 无变化），继续下一步")
                return
        else:
            stable_since = time.monotonic()
            prev_hash = cur_hash
    logger.info(f"⏳ 已达最大等待 {max_wait_sec}s，继续下一步")


# 分步准确率测试：无 DOM 可检测时需手动输入是否成功（1-based）；现已为 2/10/13 步补充判定，默认全自动）
STEP_ACCURACY_MANUAL_STEPS: list = []  # 空表示全部由 DOM/benchmark 自动判定

# 子任务打印顺序：与任务 1–13 步一致（步2=AlignSample=S6，步3=温度=S2，…）
SUBTASK_DISPLAY_ORDER = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "S11", "S12"]


def run_apt_test_lightweight(
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps: int = 60,
    apt_url: str = "http://localhost:8080/static/simulator/apt_simulator/APT_simulator.html",
    result_dir: str = get_results_dir("apt"),
    headless: bool = False,
    observation_mode: str = OBSERVATION_MODE_SCREENSHOT,
    stop_after_step: int = None,
    step_accuracy_manual_steps: list = None,
    step_accuracy_run_index: int = None,
    **agent_kwargs
) -> dict:
    """轻量级 APT 测试 - 直接使用 Playwright，无需虚拟化环境
    
    stop_after_step: 若指定（1-13），执行完该步后即停止并返回该步是否成功（用于分步准确率测试）。
    step_accuracy_manual_steps: 需要手动输入成功与否的步骤号列表；默认使用 STEP_ACCURACY_MANUAL_STEPS。
    step_accuracy_run_index: 分步测试时的第几次运行（仅用于提示）。
    
    Returns:
        dict: 包含 success, benchmark_log, episode_dir；若 stop_after_step 已设置则还有 step_success (bool)。
    """
    
    observation_mode = normalize_observation_mode(observation_mode)
    if observation_mode == OBSERVATION_MODE_A11Y_TREE and agent_name != "uitars":
        raise ValueError("APT a11y_tree mode currently supports agent_name='uitars' only.")

    step_accuracy_done = False
    step_accuracy_success = None
    
    # 创建结果目录
    os.makedirs(result_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    episode_dir = os.path.join(result_dir, f"episode_{timestamp}")
    os.makedirs(episode_dir, exist_ok=True)
    
    # 复制 benchmark_apt.js 到结果目录（可选，便于复现）
    script_dir = os.path.dirname(os.path.abspath(__file__))
    benchmark_js_path = os.path.join(script_dir, "..", "simulator-master", "static", "benchmark_apt.js")
    if os.path.exists(benchmark_js_path):
        try:
            dest_js_path = os.path.join(episode_dir, "benchmark_apt.js")
            shutil.copy2(benchmark_js_path, dest_js_path)
            logger.info(f"💾 已保存 benchmark_apt.js 到: {dest_js_path}")
        except Exception as e:
            logger.warning(f"⚠️  复制 benchmark_apt.js 失败: {e}")
    else:
        logger.warning(f"⚠️  benchmark_apt.js 文件不存在: {benchmark_js_path}")
    
    logger.info(f"开始 APT 轻量级测试 - Agent: {agent_name}, Model: {model}")
    logger.info(f"APT URL: {apt_url}")
    logger.info(f"结果目录: {episode_dir}")
    
    # 初始化 agent
    logger.info(f"初始化 Agent: {agent_name}...")
    from benchmarks.vlaa_gui_support import resolve_subtask_agent_kwargs
    agent_kwargs = resolve_subtask_agent_kwargs(
        agent_name, agent_kwargs, model=model, max_steps_per_subtask=max_steps
    )
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
    
    # 使用 Playwright 控制浏览器（优先本机 Chrome/Edge，无需下载 Chromium）
    with sync_playwright() as p:
        logger.info(f"启动浏览器 (headless={headless})...")
        try:
            browser = p.chromium.launch(headless=headless)
        except Exception:
            browser = p.chromium.launch(headless=True)
        
        # 设置 viewport 为 Agent 期望的分辨率
        # 注意：Playwright 的 viewport 设置会影响页面渲染，但可能与实际浏览器窗口不一致
        logger.info(f"📐 设置 Playwright viewport: {viewport_width}x{viewport_height}")
        context = browser.new_context(
            viewport={'width': viewport_width, 'height': viewport_height},
            device_scale_factor=1.0  # 明确设置设备缩放因子为1，避免DPI问题
        )
        page = context.new_page()
        
        try:
            # 打开 APT 模拟器页面
            logger.info(f"打开 APT 模拟器: {apt_url}")
            page.goto(apt_url, wait_until='networkidle', timeout=60000)
            
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
            
            # 等待 benchmark_apt.js 初始化
            logger.info("等待 benchmark logger 初始化...")
            time.sleep(3)  # 增加等待时间
            
            # 确保页面完全稳定后再获取第一个观察
            logger.info("等待页面完全稳定...")
            try:
                page.wait_for_load_state("networkidle", timeout=5000)
            except:
                pass
            time.sleep(2)
            
            # 检查 benchmark 对象是否已初始化
            try:
                benchmark_status = page.evaluate("""
                    () => {
                        return {
                            hasBenchmark: typeof window.APT_BENCHMARK !== 'undefined',
                            hasEpisode: typeof window.APT_BENCHMARK !== 'undefined' && 
                                        typeof window.APT_BENCHMARK.episode !== 'undefined',
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
                    logger.error("   1. benchmark_apt.js 未正确加载")
                    logger.error("   2. 页面 URL 不包含 'APT_simulator.html'（benchmark 脚本只在特定页面初始化）")
                    logger.error("   3. JavaScript 执行错误")
            except Exception as e:
                logger.warning(f"检查 benchmark 初始化状态时出错: {e}")
            
            # 设置 agent 名称
            try:
                page.evaluate(f"""
                    () => {{
                        if (typeof window.APT_BENCHMARK !== 'undefined' && 
                            typeof window.APT_BENCHMARK.episode !== 'undefined') {{
                            window.APT_BENCHMARK.episode.agent_name = '{agent_name}';
                        }}
                    }}
                """)
            except Exception as e:
                logger.debug(f"设置 agent 名称失败: {e}")
            
            # 开始执行任务
            logger.info("开始执行任务...")
            logger.info(f"任务指令: {APT_TASK_INSTRUCTION}")

            no_coord_convert_apt = should_skip_coord_convert(
                agent_kwargs.get("model"),
                agent_name,
                agent_kwargs.get("model_type"),
            )
            if no_coord_convert_apt:
                logger.info("📐 坐标：按模型输出像素直接点击（no_coord_convert）")
            
            # 初始 observation 带上完整任务描述
            observation = page_to_observation(page, APT_TASK_INSTRUCTION, observation_mode=observation_mode)
            step_count = 0
            turn_count = 0  # 每轮推理递增，用于取「当前步」简短指令
            mouse_pos = None  # 初始化鼠标位置
            step_accuracy_done = False
            step_accuracy_success = None
            manual_steps = step_accuracy_manual_steps if step_accuracy_manual_steps is not None else STEP_ACCURACY_MANUAL_STEPS
            
            # 分步准确率测试：只执行第 N 步；测第 N 步时先自动依次“执行”第 1～N-1 步，再测第 N 步
            if stop_after_step is not None and stop_after_step >= 1:
                turn_count = stop_after_step - 1  # 当前要执行的是第 stop_after_step 步
                logger.info(f"分步测试: 只执行第 {stop_after_step} 步")
                if stop_after_step == 1:
                    observation = page_to_observation(page, APT_TASK_INSTRUCTION, observation_mode=observation_mode)
                else:
                    # 自动依次执行第 1 到第 N-1 步（每步都走 APT_DO_STEP_k 的完整逻辑）
                    try:
                        for k in range(1, stop_after_step):
                            page.evaluate(f"window.APT_DO_STEP_{k} && window.APT_DO_STEP_{k}()")
                            if k == 1:
                                time.sleep(7)  # 第一步腔体动画
                            elif k == 7:
                                # 第 7 步：点击 START，需等待数据加载完并真正进入实验视图（label 会回到 START，画面如图二）
                                logger.info("分步测试预热: 已自动点击 START，等待实验界面加载完成...")
                                wait_for_apt_stabilization(
                                    page,
                                    min_wait_sec=2.0,
                                    max_wait_sec=15.0,
                                    stable_interval_sec=2.0,
                                    poll_interval_sec=0.5,
                                )
                                # 按实验逻辑，在两次 START 之间再额外等待 2 秒
                                if stop_after_step >= 8:
                                    logger.info("分步测试预热: 在两次 START 之间额外等待 2 秒")
                                    time.sleep(2.0)
                            else:
                                time.sleep(1)  # 其余步 DOM/selectmenu 更新
                            logger.info(f"已自动完成第 {k} 步")
                        observation = page_to_observation(page, APT_TASK_INSTRUCTION, observation_mode=observation_mode)
                        logger.info(f"前 {stop_after_step - 1} 步已自动完成，turn_count={turn_count}（将发送第 {stop_after_step} 步指令）")
                    except Exception as e:
                        logger.warning(f"APT_DO_STEP_* 失败: {e}，回退到 APT_JUMP_TO_STATE")
                        jump_to = stop_after_step - 2
                        if jump_to >= 0:
                            page.evaluate(f"window.APT_JUMP_TO_STATE && window.APT_JUMP_TO_STATE({jump_to})")
                            time.sleep(2)
                        observation = page_to_observation(page, APT_TASK_INSTRUCTION, observation_mode=observation_mode)
            
            # 任务完成标记，避免未进入循环时报未定义
            status_obj = {"success": False}

            while step_count < max_steps:
                logger.info("")
                logger.info("=" * 60)
                logger.info(f"=== Step {step_count + 1}/{max_steps} ===")
                logger.info("=" * 60)
                
                # 组合指令：完整任务 + 当前步简短指令（减轻模型歧义）
                step_hint = APT_STEP_INSTRUCTIONS[turn_count % len(APT_STEP_INSTRUCTIONS)]
                current_instruction = APT_TASK_INSTRUCTION + "\n\n" + step_hint
                logger.info(f"当前步提示: {step_hint}")
                # 第 9 步（点击 RECONSTRUCT 重建）前等待 3 秒，便于界面就绪
                if (turn_count % len(APT_STEP_INSTRUCTIONS)) == 8:
                    logger.info("第 9 步（RECONSTRUCT）前等待 3 秒...")
                    time.sleep(3)
                # Agent 生成动作
                try:
                    logger.info("🤖 Agent 正在生成动作...")
                    logger.info(f"📡 API 配置: URL={os.environ.get('DOUBAO_API_URL', os.environ.get('KIMI_API_URL', 'Not set'))}")
                    pred = agent.predict(current_instruction, observation)
                    response, actions = pred[0], pred[1]
                    
                    # 输出 API 返回的原始值（便于核对坐标等）
                    logger.info("========== API 返回的原始值 ==========")
                    logger.info(f"response (原始): {repr(response)[:500] if response else 'None'}")
                    if response:
                        _rlen = len(response.get("content", "")) if isinstance(response, dict) else len(response) if isinstance(response, str) else len(repr(response))
                        if _rlen > 500:
                            logger.info(f"  ... (response 总长 {_rlen} 字符)")
                    if actions is not None:
                        for i, act in enumerate(actions):
                            raw_str = act if isinstance(act, str) else str(act)
                            logger.info(f"actions[{i}] (原始): {repr(raw_str)}")
                    logger.info("======================================")
                    
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
                    
                    if isinstance(response, dict):
                        _resp_text = response.get("content", "")
                    elif isinstance(response, str):
                        _resp_text = response
                    else:
                        _resp_text = str(response)
                    logger.info(f"📝 Agent 响应: {_resp_text[:200] if _resp_text else 'None'}...")
                    logger.info(f"📋 Agent 生成的动作数量: {len(actions) if actions else 0}")
                    if actions:
                        for i, act in enumerate(actions):
                            logger.info(f"   动作 {i+1}: {str(act)[:150]}")
                            
                    # 检查是否是失败动作
                    if actions and len(actions) > 0:
                        if actions[0] in ["FAIL", "DONE", "client error"]:
                            logger.warning(f"⚠️  Agent 返回失败动作: {actions[0]}")
                            if stop_after_step is not None:
                                step_accuracy_success = False
                                step_accuracy_done = True
                                logger.info("分步测试: 本步判定为失败并退出")
                                break
                            logger.warning("   跳过此步骤，继续下一个步骤")
                            step_count += 1
                            time.sleep(1)
                            continue
                            
                except AttributeError:
                    # 如果 agent 没有 predict 方法
                    logger.info("Agent 没有 predict 方法，使用 step 方法")
                    actions = [agent.step(observation, current_instruction)]
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
                    if stop_after_step is not None:
                        step_accuracy_success = False
                        step_accuracy_done = True
                        logger.info("分步测试: 无动作，本步判定为失败并退出")
                        break
                    step_count += 1
                    time.sleep(1)
                    continue
                
                for action in actions:
                    logger.info(f"   执行动作: {action}")
                    logger.info(f"   动作类型: {type(action).__name__}, 动作内容: {str(action)[:200]}")
                    
                    # 保存执行前的截图（用于调试）
                    try:
                        current_subtask_id = infer_current_apt_subtask(page)
                        record_apt_agent_action(page, action, current_subtask_id)
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
                        no_coord_convert=no_coord_convert_apt,
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
                    
                    # 等待界面状态稳定（检测到关键因素完成后再执行下一步）
                    wait_for_apt_stabilization(
                        page,
                        min_wait_sec=1.0,
                        max_wait_sec=20.0,
                        stable_interval_sec=1.5,
                        poll_interval_sec=0.5,
                    )
                    
                    step_count += 1
                    
                    # ⚠️ 重要：立即更新 observation，让 Agent 看到界面变化
                    logger.info("📸 更新观察（获取新截图）...")
                    # 如果有鼠标位置，在截图上标记
                    new_observation = page_to_observation(
                        page,
                        APT_TASK_INSTRUCTION,
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
                    # 仅当本地网页出现当前步的预期变化时，才进入下一步指令
                    state_after = get_apt_state(page)
                    if is_step_expected_state_reached(turn_count, state_after):
                        turn_count += 1
                        logger.info(f"📌 页面已满足第 {turn_count} 步预期，下一轮将使用第 {turn_count + 1} 步指令")
                    else:
                        logger.warning(f"⚠️  当前页面未检测到第 {turn_count + 1} 步的预期变化，下一轮仍使用第 {turn_count + 1} 步指令")
                    logger.info(f"📊 新截图大小: {len(observation['screenshot'])} bytes")
                    
                    # 分步准确率测试：执行完指定步后停止，并记录该步是否成功
                    if stop_after_step is not None and turn_count == stop_after_step:
                        if stop_after_step in manual_steps:
                            run_hint = f" (第 {step_accuracy_run_index} 次运行)" if step_accuracy_run_index is not None else ""
                            ans = input(f"  第 {stop_after_step} 步{run_hint} 是否成功执行? (y/n): ").strip().lower()
                            step_accuracy_success = ans == "y"
                        else:
                            step_accuracy_success = is_step_expected_state_reached(stop_after_step - 1, state_after)
                        step_accuracy_done = True
                        logger.info(f"  分步测试: 第 {stop_after_step} 步 判定为 {'成功' if step_accuracy_success else '失败'}")
                        break
                    
                    # 检查任务是否完成（APT 要求 S1–S6, S8, S9, S10 成功）
                    try:
                        status = page.evaluate("""
                            () => {
                                if (typeof window.APT_BENCHMARK !== 'undefined') {
                                    const ep = window.APT_BENCHMARK.episode;
                                    const required = ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12'];
                                    const allSuccess = required.every(function(id) { return ep._subtask_map[id] && ep._subtask_map[id].success; });
                                    const subtasks = Object.keys(ep._subtask_map).map(function(k) { return ep._subtask_map[k]; });
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
                if step_accuracy_done:
                    logger.info("分步准确率测试: 已执行完指定步，退出主循环")
                    break
            
            # 提取并保存 benchmark 日志
            logger.info("="*60)
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
                # 分步准确率测试：以本步判定结果为准，不按 benchmark 全任务成功
                if stop_after_step is not None and step_accuracy_done and step_accuracy_success is not None:
                    test_success = step_accuracy_success
                    logger.info(f"分步测试: 以第 {stop_after_step} 步判定结果作为本次成功与否 → {'成功' if test_success else '失败'}")
                
                # 打印摘要
                print("\n" + "="*60)
                print("测试结果摘要")
                print("="*60)
                print(f"任务ID: {benchmark_log.get('task_id')}")
                print(f"Episode ID: {benchmark_log.get('episode_id')}")
                print(f"Agent: {benchmark_log.get('agent_name', agent_name)}")
                if stop_after_step is not None and step_accuracy_done:
                    print(f"分步测试第 {stop_after_step} 步: {'✅ 成功' if step_accuracy_success else '❌ 失败'}")
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
                    st_map = {st.get("subtask_id"): st for st in benchmark_log["subtasks"]}
                    for sid in SUBTASK_DISPLAY_ORDER:
                        st = st_map.get(sid)
                        if st is None:
                            continue
                        status = "✅" if st.get("success") else "❌"
                        print(f"  {status} {st.get('name')}: {st.get('attempts', 0)} 次尝试")
                
                print("="*60)
            else:
                if stop_after_step is not None and step_accuracy_done and step_accuracy_success is not None:
                    test_success = step_accuracy_success
                    logger.info(f"分步测试(无 benchmark 日志): 以第 {stop_after_step} 步判定 → {'成功' if test_success else '失败'}")
                logger.warning("⚠️  无法提取 benchmark 日志")
                # 即使提取失败，也保存一个占位文件，记录提取失败的信息
                placeholder_log = {
                    "error": "无法提取 benchmark 日志",
                    "reason": "window.APT_BENCHMARK 对象可能未正确初始化",
                    "episode_dir": episode_dir,
                    "timestamp": datetime.now().isoformat(),
                    "agent_name": agent_name,
                    "observation_mode": observation_mode,
                    "note": "请检查 benchmark_apt.js 是否正确加载到页面中"
                }
                log_path = os.path.join(episode_dir, "benchmark_log_extraction_failed.json")
                with open(log_path, "w", encoding="utf-8") as f:
                    json.dump(placeholder_log, f, indent=2, ensure_ascii=False)
                logger.warning(f"⚠️  已保存提取失败信息到: {log_path}")
                logger.warning("   可能的原因：")
                logger.warning("   1. benchmark_apt.js 未正确加载到页面")
                logger.warning("   2. 页面 URL 不包含 'APT_simulator.html'（benchmark 脚本只在特定页面初始化）")
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
        
        # 保存成功 episode 轨迹
        if test_success:
            save_success_episode(episode_dir, "apt")

        # 返回测试结果
        result = {
            "success": test_success,
            "benchmark_log": benchmark_log,
            "episode_dir": episode_dir
        }
        if stop_after_step is not None:
            result["step_success"] = step_accuracy_success if step_accuracy_done else None
        return result


def run_multiple_tests(
    num_runs: int = 1,
    agent_name: str = "uitars15_v2",
    model: str = None,
    max_steps: int = 60,
    apt_url: str = "http://localhost:8080/static/simulator/apt_simulator/APT_simulator.html",
    result_dir: str = get_results_dir("apt"),
    headless: bool = False,
    observation_mode: str = OBSERVATION_MODE_SCREENSHOT,
    **agent_kwargs
):
    """运行多次测试并统计结果
    
    Args:
        num_runs: 测试运行次数
        其他参数同 run_apt_test_lightweight
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
            result = run_apt_test_lightweight(
                agent_name=agent_name,
                model=model,
                max_steps=max_steps,
                apt_url=apt_url,
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
    parser = argparse.ArgumentParser(description="APT Benchmark 轻量级测试脚本")
    
    # Agent 配置
    parser.add_argument("--agent", type=str, default="uitars15_v2",
                       choices=["uitars15_v2", "uitars15_v1", "uitars", "o3", "gui_owl_vllm", "kimi"],
                       help="要使用的 agent")
    parser.add_argument("--model", type=str, default=None,
                       help="模型名称；须支持图像输入，默认 ByteDance-Seed/UI-TARS-1.5-7B")
    parser.add_argument(
        "--model_type",
        type=str,
        default="doubao",
        choices=["doubao", "qwen25", "evocua"],
        help="模型类型；evocua 时坐标按截图像素（与 Playwright no_coord_convert 一致）",
    )
    parser.add_argument("--temperature", type=float, default=0,
                       help="温度参数")
    parser.add_argument("--max_tokens", type=int, default=3000,
                       help="最大 token 数")
    parser.add_argument("--api_key", type=str, default=None,
                       help="API Key")
    parser.add_argument("--api_url", type=str, default=None,
                       help="API URL")
    
    # 环境配置
    parser.add_argument("--apt_url", type=str,
                       default="http://localhost:8080/static/simulator/apt_simulator/APT_simulator.html",
                       help="APT 模拟器 URL")
    parser.add_argument("--max_steps", type=int, default=60,
                       help="最大步骤数")
    parser.add_argument("--headless", action="store_true",
                       help="无头模式运行（不显示浏览器）；默认显示浏览器")
    parser.add_argument("--observation_mode", choices=["screenshot", "screenshot_720p", "a11y_tree"], default="screenshot",
                       help="模型输入观测模式")
    
    # 结果配置
    parser.add_argument("--result_dir", type=str, default=get_results_dir("apt"),
                       help="结果保存目录")
    parser.add_argument("--num_runs", type=int, default=1,
                       help="测试运行次数（默认1次，多次测试会统计成功率）")
    
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
    logger.info("="*60)
    
    # 运行测试
    if args.num_runs > 1:
        run_multiple_tests(
            num_runs=args.num_runs,
            agent_name=args.agent,
            model=args.model,
            model_type=args.model_type,
            temperature=args.temperature,
            max_tokens=args.max_tokens,
            max_steps=args.max_steps,
            apt_url=args.apt_url,
            result_dir=args.result_dir,
            headless=getattr(args, "headless", False),
            observation_mode=args.observation_mode,
        )
    else:
        run_apt_test_lightweight(
            agent_name=args.agent,
            model=args.model,
            model_type=args.model_type,
            temperature=args.temperature,
            max_tokens=args.max_tokens,
            max_steps=args.max_steps,
            apt_url=args.apt_url,
            result_dir=args.result_dir,
            headless=getattr(args, "headless", False),
            observation_mode=args.observation_mode,
        )


if __name__ == "__main__":
    main()

