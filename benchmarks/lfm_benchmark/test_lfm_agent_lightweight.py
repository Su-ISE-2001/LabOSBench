"""
LFM Benchmark 轻量级测试脚本
任务范围：从开始到使用 BF capture 按钮获取一张标准明场图像

使用方法:
1. 确保模拟器正在运行（http://localhost:8080）
2. python test_lfm_agent_lightweight.py --model your_model_name
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

from playwright.sync_api import sync_playwright, Page
from mm_agents.uitars15_v2 import UITarsAgent
from mm_agents.uitars15_v1 import UITARSAgent as UITarsAgentV1
from mm_agents.uitars_agent import UITARSAgent as UITarsAgentBase
from mm_agents.o3_agent import O3Agent
from PIL import Image
import io

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

LFM_TASK_INSTRUCTION = """在 LFM（光镜与荧光显微镜）模拟器中，完成从开始到使用 BF capture 按钮获取一张标准明场图像的完整流程。

若当前在模拟器选择页面，请先点击「Light & Fluorescence Microscopy」或 LM 图标进入 LFM 模拟器。

请按顺序完成：
1. 将 H&E 染色的肾脏样品拖放到显微镜载物台上
2. 选择 SETUP & BRIGHTFIELD 模式，选择 Halogen lamp
3. 选择 10X 物镜，使用 FOCUS 对焦
4. 完成 Köhler 照明（FIELD DIAPHRAGM、CONDENSER FOCUS、CONDENSER APERTURE 等）
5. 点击 IMAGING SOFTWARE，白平衡，调节曝光，点击 LUT 检查，点击 CAPTURE 获取明场图像

完成 CAPTURE 后即可停止。"""


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
    elif agent_name == "openai_compat_chat":
        from benchmarks.openai_compat_support import create_openai_compat_chat_agent
        return create_openai_compat_chat_agent(**kwargs)
    elif agent_name == "vlaa_gui":
        from benchmarks.vlaa_gui_support import get_vlaa_gui_agent
        return get_vlaa_gui_agent(**kwargs)
    elif agent_name == "uitars15_v1":
        return UITarsAgentV1(
            model=kwargs.get("model", "ByteDance-Seed/UI-TARS-1.5-7B"),
            runtime_conf={"temperature": kwargs.get("temperature", 0), "max_tokens": kwargs.get("max_tokens", 3000), "language": "Chinese", "history_n": 5},
            max_trajectory_length=kwargs.get("max_trajectory_length", 50),
            model_type=kwargs.get("model_type", "qwen25vl"),
        )
    elif agent_name == "uitars":
        return UITarsAgentBase(
            model=kwargs.get("model", "ByteDance-Seed/UI-TARS-1.5-7B"),
            runtime_conf={"temperature": kwargs.get("temperature", 0), "max_tokens": kwargs.get("max_tokens", 3000), "language": "Chinese", "history_n": 5},
            max_trajectory_length=kwargs.get("max_trajectory_length", 50),
            model_type=kwargs.get("model_type", "qwen25vl"),
        )
    elif agent_name == "o3":
        return O3Agent(model=kwargs.get("model", "o3"), max_tokens=kwargs.get("max_tokens", 3000), max_steps=kwargs.get("max_steps", 50))
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


def page_to_observation(page: Page, instruction: str, mouse_pos=None):
    from fib_benchmark.test_fib_agent_lightweight import add_mouse_marker_to_screenshot
    global _last_mouse_pos
    try:
        screenshot_bytes = page.screenshot(type='png', full_page=False)
        if mouse_pos:
            screenshot_bytes = add_mouse_marker_to_screenshot(screenshot_bytes, mouse_pos[0], mouse_pos[1])
            _last_mouse_pos = mouse_pos
        elif _last_mouse_pos:
            screenshot_bytes = add_mouse_marker_to_screenshot(screenshot_bytes, _last_mouse_pos[0], _last_mouse_pos[1])
    except Exception as e:
        logger.error(f"获取截图失败: {e}")
        screenshot_bytes = b''
    return {"screenshot": screenshot_bytes, "accessibility_tree": None, "terminal": None, "instruction": instruction}


_last_mouse_pos = None


def infer_current_lfm_subtask(page: Page):
    try:
        return page.evaluate("""
            () => {
                const api = window.LFM_BENCHMARK_API;
                if (api && typeof api.inferCurrentSubtaskId === 'function') {
                    return api.inferCurrentSubtaskId();
                }
                return null;
            }
        """)
    except Exception:
        return None


def record_lfm_agent_action(page: Page, action, subtask_id=None):
    try:
        page.evaluate(
            """
            (payload) => {
                const api = window.LFM_BENCHMARK_API;
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


def extract_benchmark_log(page: Page):
    try:
        if not page.evaluate("() => typeof window.LFM_BENCHMARK !== 'undefined'"):
            return None
        result = page.evaluate("""
            () => {
                if (typeof window.LFM_BENCHMARK !== 'undefined') {
                    if (typeof window.LFM_BENCHMARK.finalize === 'function') {
                        return JSON.stringify(window.LFM_BENCHMARK.finalize());
                    }
                    if (window.LFM_BENCHMARK.episode) {
                        return JSON.stringify(window.LFM_BENCHMARK.episode);
                    }
                }
                return null;
            }
        """)
        return json.loads(result) if result else None
    except Exception as e:
        logger.error(f"提取日志失败: {e}")
        return None


def run_lfm_test_lightweight(
    agent_name="uitars15_v2", model=None, max_steps=80,
    lfm_url="http://localhost:8080/static/simulator/lm_simulator/LM_simulator.html",
    result_dir=get_results_dir("lfm"), headless=False, **agent_kwargs
):
    from fib_benchmark.test_fib_agent_lightweight import execute_action_on_page
    os.makedirs(result_dir, exist_ok=True)
    episode_dir = os.path.join(result_dir, f"episode_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    os.makedirs(episode_dir, exist_ok=True)
    agent_kwargs.update(model=model or "ByteDance-Seed/UI-TARS-1.5-7B", max_tokens=3000, temperature=0, language="Chinese")
    agent_kwargs.setdefault("model_type", "doubao")
    agent = get_agent(agent_name, **agent_kwargs)
    agent_screen_size = (1920, 1080)
    test_success = False
    benchmark_log = None
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=headless)
        except Exception:
            browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080}, device_scale_factor=1.0)
        page = context.new_page()
        try:
            page.goto(lfm_url, wait_until="networkidle", timeout=60000)
            time.sleep(5)
            page.evaluate(f"() => {{ if (window.LFM_BENCHMARK && window.LFM_BENCHMARK.episode) window.LFM_BENCHMARK.episode.agent_name = '{agent_name}'; }}")
            observation = page_to_observation(page, LFM_TASK_INSTRUCTION)
            step_count = 0
            mouse_pos = None
            vw, vh = page.viewport_size["width"], page.viewport_size["height"]
            while step_count < max_steps:
                logger.info(f"=== Step {step_count + 1}/{max_steps} ===")
                try:
                    _, actions = agent.predict(LFM_TASK_INSTRUCTION, observation)
                except AttributeError:
                    actions = [agent.step(observation, LFM_TASK_INSTRUCTION)]
                except Exception as e:
                    logger.error(f"Agent 出错: {e}")
                    step_count += 1
                    continue
                if not actions or actions[0] in ["FAIL", "DONE", "client error"]:
                    step_count += 1
                    continue
                for action in actions:
                    try:
                        current_subtask_id = infer_current_lfm_subtask(page)
                        record_lfm_agent_action(page, action, current_subtask_id)
                        with open(os.path.join(episode_dir, f"step_{step_count + 1}_before.png"), "wb") as f:
                            f.write(page.screenshot(type="png"))
                    except Exception:
                        pass
                    result = execute_action_on_page(
                        page, action, agent_screen_size, (vw, vh),
                        model_type=agent_kwargs.get("model_type"),
                    )
                    if isinstance(result, tuple):
                        _, mouse_pos = result
                    time.sleep(1.5)
                    step_count += 1
                    observation = page_to_observation(page, LFM_TASK_INSTRUCTION, mouse_pos)
                    try:
                        with open(os.path.join(episode_dir, f"step_{step_count}_after.png"), "wb") as f:
                            f.write(observation.get("screenshot") or page.screenshot(type="png"))
                    except Exception:
                        pass
                    try:
                        st = page.evaluate("() => window.LFM_BENCHMARK && window.LFM_BENCHMARK.episode._subtask_map.L12 ? window.LFM_BENCHMARK.episode._subtask_map.L12.success : false")
                        if st:
                            test_success = True
                            break
                    except Exception:
                        pass
                if test_success:
                    break
            benchmark_log = extract_benchmark_log(page)
            if benchmark_log:
                with open(os.path.join(episode_dir, f"{benchmark_log.get('episode_id', 'episode')}.json"), "w", encoding="utf-8") as f:
                    json.dump(benchmark_log, f, indent=2, ensure_ascii=False)
                test_success = benchmark_log.get('success', False)
        except Exception as e:
            logger.error(f"测试出错: {e}", exc_info=True)
        finally:
            time.sleep(2)
            browser.close()

    if test_success:
        save_success_episode(episode_dir, "lfm")

    return {"success": test_success, "benchmark_log": benchmark_log, "episode_dir": episode_dir}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent", default="uitars15_v2")
    parser.add_argument("--model", default=None)
    parser.add_argument("--model_type", default="doubao")
    parser.add_argument("--api_key", default=None)
    parser.add_argument("--api_url", default=None)
    parser.add_argument("--lfm_url", default="http://localhost:8080/static/simulator/lm_simulator/LM_simulator.html")
    parser.add_argument("--result_dir", default=get_results_dir("lfm"))
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--max_steps", type=int, default=80)
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
    run_lfm_test_lightweight(
        agent_name=args.agent,
        model=args.model,
        model_type=args.model_type,
        max_steps=args.max_steps,
        lfm_url=args.lfm_url,
        result_dir=args.result_dir,
        headless=args.headless,
    )


if __name__ == "__main__":
    main()
