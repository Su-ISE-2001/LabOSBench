"""
Benchmark utilities.
"""
import os
import shutil
import logging

try:
    # When imported as package: benchmarks.utils
    from .paths import get_results_dir  # type: ignore[import]
except ImportError:  # pragma: no cover
    # Fallback for direct sys.path usage with 'benchmarks' on sys.path
    from paths import get_results_dir  # type: ignore[import]

logger = logging.getLogger(__name__)


def prefer_gui_owl_agent_when_model_name(agent: str, model) -> str:
    """
    model 名含 gui-owl 时，若 agent 仍为默认 uitars15_v2，则改为 gui_owl_vllm，
    避免误走豆包/OpenAI 兼容链并连到脚本里的默认网关（易超时/404）。
    """
    if model and isinstance(model, str) and "gui-owl" in model.lower() and agent == "uitars15_v2":
        logger.warning(
            "model=%r 看起来像 GUI-Owl：已将 agent 从默认 uitars15_v2 改为 gui_owl_vllm；"
            "请用 --api_url 或环境变量 GUI_OWL_API_URL 指向本机 vLLM。",
            model,
        )
        return "gui_owl_vllm"
    return agent


def save_success_episode(episode_dir: str, benchmark_short_name: str) -> None:
    """
    If episode_dir exists and the run is successful, copy it into
    results/<benchmark_short_name>/success_episodes/<episode_basename>.
    """
    if not episode_dir or not os.path.isdir(episode_dir):
        return
    try:
        root = get_results_dir(benchmark_short_name)
        success_root = os.path.join(root, "success_episodes")
        os.makedirs(success_root, exist_ok=True)
        target = os.path.join(success_root, os.path.basename(episode_dir))
        if os.path.exists(target):
            shutil.rmtree(target)
        shutil.copytree(episode_dir, target)
        logger.info("Saved success episode to %s", target)
    except Exception as e:
        logger.error("Failed to save success episode from %s: %s", episode_dir, e)

