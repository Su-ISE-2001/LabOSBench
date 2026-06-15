"""
SPM Benchmark 轻量级测试脚本
任务：在 AFM (Tapping 模式) 模拟器中完成一次完整扫描并保存图像

使用方法:
1. 确保模拟器正在运行（http://localhost:8080）
2. python test_spm_agent_lightweight.py --model your_model_name
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
    os.environ["DOUBAO_API_URL"] = "http://180.184.249.158:10149/v1/chat/completions"

from playwright.sync_api import sync_playwright, Page
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

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SPM_TASK_INSTRUCTION = """在 SPM（扫描探针显微镜 / AFM）模拟器中，完成 Tapping 模式下一次完整的 AFM 扫描并保存图像。

若当前在模拟器选择页面，请先点击 SPM 或 AFM 图标进入 SPM 模拟器。

请按顺序完成：
1. 在 MODE 下拉框中选择 TAPPING 模式
2. 使用 ALIGNMENT 控制器将激光光斑对准悬臂梁末端中心
3. 使用 PHOTODIODE 控制器将激光对准光电二极管中心
4. 将 Target amplitude 设为 500mV
5. 将 Frequency 设为 FROM 200KHz TO 500KHz，点击 AUTO TUNE
6. 选择 SCAN SIZE
7. 设置 INTEGRAL GAIN
8. 选择 SCAN RATE
9. 调节 SET POINT
10. 使用 MOTOR 滑块使探针接近样品表面
11. 点击 ENGAGE 按钮
12. 点击 SCAN 开始扫描
13. 点击 SAVE 保存图像

完成 SAVE 后即可停止。"""


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
            runtime_conf={"temperature": kwargs.get("temperature", 0), "max_tokens": kwargs.get("max_tokens", 3000), "language": "Chinese", "history_n": 5},
            max_trajectory_length=kwargs.get("max_trajectory_length", 50),
            model_type=kwargs.get("model_type", "qwen25vl"),
        )
    elif agent_name == "uitars":
        runtime_conf = kwargs.get("runtime_conf", {
            "infer_mode": "qwen2vl_user",
            "prompt_style": "qwen2vl_user",
            "input_swap": True,
            "language": kwargs.get("language", "Chinese"),
            "max_steps": kwargs.get("max_steps", 50),
            "history_n": kwargs.get("max_image_history_length", 5),
            "screen_height": 1080,
            "screen_width": 1920,
            "temperature": kwargs.get("temperature", 0),
            "top_p": kwargs.get("top_p", 0.9),
            "max_tokens": kwargs.get("max_tokens", 3000),
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


def page_to_observation(
    page: Page,
    instruction: str,
    mouse_pos=None,
    observation_mode: str = OBSERVATION_MODE_SCREENSHOT,
):
    from fib_benchmark.test_fib_agent_lightweight import add_mouse_marker_to_screenshot
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
    except Exception as e:
        logger.error(f"获取截图失败: {e}")
        observation = {"screenshot": b"", "accessibility_tree": None, "terminal": None, "instruction": instruction}
    return observation


_last_mouse_pos = None


def infer_current_spm_subtask(page: Page):
    try:
        return page.evaluate("""
            () => {
                const api = window.SPM_BENCHMARK_API;
                if (api && typeof api.inferCurrentSubtaskId === 'function') {
                    return api.inferCurrentSubtaskId();
                }
                return null;
            }
        """)
    except Exception:
        return None


def record_spm_agent_action(page: Page, action, subtask_id=None):
    try:
        page.evaluate(
            """
            (payload) => {
                const api = window.SPM_BENCHMARK_API;
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
        if not page.evaluate("() => typeof window.SPM_BENCHMARK !== 'undefined'"):
            return None
        result = page.evaluate("""
            () => {
                if (typeof window.SPM_BENCHMARK !== 'undefined') {
                    if (typeof window.SPM_BENCHMARK.finalize === 'function') {
                        return JSON.stringify(window.SPM_BENCHMARK.finalize());
                    }
                    if (window.SPM_BENCHMARK.episode) {
                        return JSON.stringify(window.SPM_BENCHMARK.episode);
                    }
                }
                return null;
            }
        """)
        return json.loads(result) if result else None
    except Exception as e:
        logger.error(f"提取日志失败: {e}")
        return None


def run_spm_test_lightweight(
    agent_name="uitars15_v2", model=None, max_steps=80,
    spm_url="http://localhost:8080/static/simulator/spm_simulator/SPM_simulator.html",
    result_dir=get_results_dir("spm"), headless=False, observation_mode: str = OBSERVATION_MODE_SCREENSHOT, **agent_kwargs
):
    from fib_benchmark.test_fib_agent_lightweight import execute_action_on_page, should_skip_coord_convert
    observation_mode = normalize_observation_mode(observation_mode)
    if observation_mode == OBSERVATION_MODE_A11Y_TREE and agent_name != "uitars":
        raise ValueError("SPM a11y_tree mode currently supports agent_name='uitars' only.")
    os.makedirs(result_dir, exist_ok=True)
    episode_dir = os.path.join(result_dir, f"episode_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    os.makedirs(episode_dir, exist_ok=True)
    agent_kwargs.update(
        model=model or "ByteDance-Seed/UI-TARS-1.5-7B",
        max_tokens=3000,
        temperature=0,
        language="Chinese",
        observation_type="a11y_tree" if observation_mode == OBSERVATION_MODE_A11Y_TREE else "screenshot",
    )
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
            page.goto(spm_url, wait_until="networkidle", timeout=60000)
            time.sleep(5)
            page.evaluate(f"() => {{ if (window.SPM_BENCHMARK && window.SPM_BENCHMARK.episode) window.SPM_BENCHMARK.episode.agent_name = '{agent_name}'; }}")
            observation = page_to_observation(page, SPM_TASK_INSTRUCTION, observation_mode=observation_mode)
            step_count = 0
            mouse_pos = None
            vw, vh = page.viewport_size["width"], page.viewport_size["height"]
            no_convert = should_skip_coord_convert(
                agent_kwargs.get("model"),
                agent_name,
                agent_kwargs.get("model_type"),
            )
            observation_screen_size = (1280, 720) if observation_mode == OBSERVATION_MODE_SCREENSHOT_720P else agent_screen_size
            while step_count < max_steps:
                logger.info(f"=== Step {step_count + 1}/{max_steps} ===")
                try:
                    _, actions = agent.predict(SPM_TASK_INSTRUCTION, observation)
                except AttributeError:
                    actions = [agent.step(observation, SPM_TASK_INSTRUCTION)]
                except Exception as e:
                    logger.error(f"Agent 出错: {e}")
                    step_count += 1
                    continue
                if not actions or actions[0] in ["FAIL", "DONE", "client error"]:
                    step_count += 1
                    continue
                for action in actions:
                    try:
                        with open(os.path.join(episode_dir, f"step_{step_count + 1}_before.png"), "wb") as f:
                            f.write(page.screenshot(type="png"))
                    except Exception:
                        pass
                    current_subtask_id = infer_current_spm_subtask(page)
                    record_spm_agent_action(page, action, current_subtask_id)
                    result = execute_action_on_page(
                        page,
                        action,
                        observation_screen_size,
                        (vw, vh),
                        no_coord_convert=no_convert,
                        model_type=agent_kwargs.get("model_type"),
                    )
                    if isinstance(result, tuple):
                        _, mouse_pos = result
                    time.sleep(1.5)
                    step_count += 1
                    observation = page_to_observation(page, SPM_TASK_INSTRUCTION, mouse_pos, observation_mode=observation_mode)
                    try:
                        with open(os.path.join(episode_dir, f"step_{step_count}_after.png"), "wb") as f:
                            f.write(observation.get("screenshot") or page.screenshot(type="png"))
                    except Exception:
                        pass
                    try:
                        st = page.evaluate("() => window.SPM_BENCHMARK && window.SPM_BENCHMARK.episode._subtask_map.S14 ? window.SPM_BENCHMARK.episode._subtask_map.S14.success : false")
                        if st:
                            test_success = True
                            break
                    except Exception:
                        pass
                if test_success:
                    break
            benchmark_log = extract_benchmark_log(page)
            if benchmark_log:
                benchmark_log["observation_mode"] = observation_mode
                with open(os.path.join(episode_dir, f"{benchmark_log.get('episode_id', 'episode')}.json"), "w", encoding="utf-8") as f:
                    json.dump(benchmark_log, f, indent=2, ensure_ascii=False)
                test_success = benchmark_log.get('success', False)
        except Exception as e:
            logger.error(f"测试出错: {e}", exc_info=True)
        finally:
            time.sleep(2)
            browser.close()

    # Save successful episode trajectory
    if test_success:
        save_success_episode(episode_dir, "spm")

    return {"success": test_success, "benchmark_log": benchmark_log, "episode_dir": episode_dir}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent", default="uitars15_v2")
    parser.add_argument("--model", default=None)
    parser.add_argument("--model_type", default="doubao")
    parser.add_argument("--api_key", default=None)
    parser.add_argument("--api_url", default=None)
    parser.add_argument("--spm_url", default="http://localhost:8080/static/simulator/spm_simulator/SPM_simulator.html")
    parser.add_argument("--result_dir", default=get_results_dir("spm"))
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--max_steps", type=int, default=80)
    parser.add_argument("--observation_mode", choices=["screenshot", "screenshot_720p", "a11y_tree"], default="screenshot")
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
    run_spm_test_lightweight(
        agent_name=args.agent,
        model=args.model,
        model_type=args.model_type,
        max_steps=args.max_steps,
        spm_url=args.spm_url,
        result_dir=args.result_dir,
        headless=args.headless,
        observation_mode=args.observation_mode,
    )


if __name__ == "__main__":
    main()
