"""
Unified run script . Single-environment evaluation.
Use --provider_name playwright for Playwright env; otherwise uses OSWorld VM/docker env.
Use --agent to select agent (prompt, uitars15_v2, o3, ...); see agent_registry.list_agents().
"""
import argparse
import datetime
import json
import logging
import os
import sys

from tqdm import tqdm

# Paths: project root and OSWorld-main (for lib_run_single, desktop_env, mm_agents)
ROOT = os.path.dirname(os.path.abspath(__file__))
OSWORLD_MAIN = os.path.join(ROOT, "OSWorld-main")
if OSWORLD_MAIN not in sys.path:
    sys.path.insert(0, OSWORLD_MAIN)
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from agent_registry import get_agent, list_agents

# Logger config
logger = logging.getLogger()
logger.setLevel(logging.DEBUG)
datetime_str = datetime.datetime.now().strftime("%Y%m%d@%H%M%S")
os.makedirs(os.path.join(ROOT, "logs"), exist_ok=True)
file_handler = logging.FileHandler(
    os.path.join(ROOT, "logs", "normal-{:}.log".format(datetime_str)), encoding="utf-8"
)
debug_handler = logging.FileHandler(
    os.path.join(ROOT, "logs", "debug-{:}.log".format(datetime_str)), encoding="utf-8"
)
stdout_handler = logging.StreamHandler(sys.stdout)
file_handler.setLevel(logging.INFO)
debug_handler.setLevel(logging.DEBUG)
stdout_handler.setLevel(logging.INFO)
formatter = logging.Formatter(
    fmt="\x1b[1;33m[%(asctime)s \x1b[31m%(levelname)s \x1b[32m%(module)s/%(lineno)d\x1b[1;33m] \x1b[0m%(message)s"
)
file_handler.setFormatter(formatter)
debug_handler.setFormatter(formatter)
stdout_handler.setFormatter(formatter)
logger.addHandler(file_handler)
logger.addHandler(debug_handler)
logger.addHandler(stdout_handler)
logger = logging.getLogger("desktopenv.experiment")


def config() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run end-to-end evaluation (unified entry)")
    parser.add_argument("--path_to_vm", type=str, default=None)
    parser.add_argument(
        "--provider_name", type=str, default="playwright",
        choices=["playwright", "vmware", "docker", "aws", "azure", "virtualbox"],
        help="playwright = local Playwright; others = OSWorld VM/docker",
    )
    parser.add_argument("--headless", action="store_true", help="Run headless")
    parser.add_argument("--action_space", type=str, default="pyautogui")
    parser.add_argument(
        "--observation_type",
        choices=["screenshot", "a11y_tree", "screenshot_a11y_tree", "som"],
        default="screenshot",
    )
    parser.add_argument("--screen_width", type=int, default=1920)
    parser.add_argument("--screen_height", type=int, default=1080)
    parser.add_argument("--sleep_after_execution", type=float, default=0.0)
    parser.add_argument("--max_steps", type=int, default=15)
    parser.add_argument("--max_trajectory_length", type=int, default=3)
    parser.add_argument(
        "--test_config_base_dir", type=str,
        default=os.path.join(OSWORLD_MAIN, "evaluation_examples")
        if os.path.isdir(os.path.join(OSWORLD_MAIN, "evaluation_examples"))
        else os.path.join(ROOT, "evaluation_examples"),
    )
    parser.add_argument("--model", type=str, default="gpt-4o")
    parser.add_argument("--temperature", type=float, default=1.0)
    parser.add_argument("--top_p", type=float, default=0.9)
    parser.add_argument("--max_tokens", type=int, default=1500)
    parser.add_argument("--stop_token", type=str, default=None)
    parser.add_argument("--domain", type=str, default="all")
    _default_meta = os.path.join(OSWORLD_MAIN, "evaluation_examples", "test_all.json")
    if not os.path.isfile(_default_meta):
        _default_meta = os.path.join(ROOT, "evaluation_examples", "test_all.json")
    parser.add_argument("--test_all_meta_path", type=str, default=_default_meta)
    parser.add_argument("--result_dir", type=str, default=os.path.join(ROOT, "results"))
    parser.add_argument(
        "--agent", type=str, default="prompt",
        choices=list_agents(),
        help="Agent name from registry: " + ", ".join(list_agents()),
    )
    parser.add_argument("--launch_url", type=str, default="about:blank", help="For playwright: initial page URL")
    args = parser.parse_args()
    return args


def create_env(args):
    if args.provider_name == "playwright":
        from playwright_desktop_env import DesktopEnv
        return DesktopEnv(
            provider_name="playwright",
            action_space=args.action_space,
            screen_size=(args.screen_width, args.screen_height),
            headless=args.headless,
            require_a11y_tree=args.observation_type in ["a11y_tree", "screenshot_a11y_tree", "som"],
            launch_url=getattr(args, "launch_url", "about:blank"),
        )
    from desktop_env.desktop_env import DesktopEnv
    return DesktopEnv(
        provider_name=args.provider_name,
        path_to_vm=args.path_to_vm,
        action_space=args.action_space,
        screen_size=(args.screen_width, args.screen_height),
        headless=args.headless,
        os_type="Ubuntu",
        require_a11y_tree=args.observation_type in ["a11y_tree", "screenshot_a11y_tree", "som"],
    )


def test(args: argparse.Namespace, test_all_meta: dict) -> None:
    import lib_run_single
    scores = []
    max_steps = args.max_steps
    logger.info("Args: %s", args)

    agent = get_agent(
        args.agent,
        model=args.model,
        max_tokens=args.max_tokens,
        top_p=args.top_p,
        temperature=args.temperature,
        action_space=args.action_space,
        observation_type=args.observation_type,
        max_trajectory_length=args.max_trajectory_length,
    )
    env = create_env(args)

    for domain in tqdm(test_all_meta, desc="Domain"):
        for example_id in tqdm(test_all_meta[domain], desc="Example", leave=False):
            config_file = os.path.join(
                args.test_config_base_dir, "examples", domain, f"{example_id}.json"
            )
            if not os.path.isfile(config_file):
                logger.warning("Skip (no config): %s", config_file)
                continue
            with open(config_file, "r", encoding="utf-8") as f:
                example = json.load(f)
            instruction = example.get("instruction", "")
            logger.info("[Domain]: %s [Example ID]: %s", domain, example_id)
            example_result_dir = os.path.join(
                args.result_dir, args.action_space, args.observation_type, args.model, domain, example_id,
            )
            os.makedirs(example_result_dir, exist_ok=True)
            try:
                lib_run_single.run_single_example(
                    agent, env, example, max_steps, instruction, args,
                    example_result_dir, scores,
                )
            except Exception as e:
                logger.error("Exception in %s/%s: %s", domain, example_id, e)
                if hasattr(env, "controller") and env.controller is not None:
                    try:
                        env.controller.end_recording(os.path.join(example_result_dir, "recording.mp4"))
                    except Exception:
                        pass
                with open(os.path.join(example_result_dir, "traj.jsonl"), "a") as f:
                    f.write(json.dumps({"Error": str(e)}) + "\n")

    env.close()
    logger.info("Average score: %s", sum(scores) / len(scores) if scores else 0)


def get_unfinished(action_space, use_model, observation_type, result_dir, total_file_json):
    target_dir = os.path.join(result_dir, action_space, observation_type, use_model)
    if not os.path.exists(target_dir):
        return total_file_json
    finished = {}
    for domain in os.listdir(target_dir):
        finished[domain] = []
        domain_path = os.path.join(target_dir, domain)
        if os.path.isdir(domain_path):
            for example_id in os.listdir(domain_path):
                if example_id == "onboard":
                    continue
                example_path = os.path.join(domain_path, example_id)
                if os.path.isdir(example_path) and "result.txt" in os.listdir(example_path):
                    finished[domain].append(example_id)
    for domain, examples in finished.items():
        if domain in total_file_json:
            total_file_json[domain] = [x for x in total_file_json[domain] if x not in examples]
    return total_file_json


if __name__ == "__main__":
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    args = config()
    os.makedirs(os.path.dirname(args.result_dir) or ".", exist_ok=True)
    path_to_args = os.path.join(args.result_dir, args.action_space, args.observation_type, args.model, "args.json")
    os.makedirs(os.path.dirname(path_to_args), exist_ok=True)
    with open(path_to_args, "w", encoding="utf-8") as f:
        json.dump(vars(args), f, indent=4)

    test_all_meta_path = args.test_all_meta_path
    if not os.path.isfile(test_all_meta_path):
        logger.warning("No test_all_meta at %s; running with no tasks (copy from OSWorld-main/evaluation_examples to run full eval).", test_all_meta_path)
        test_all_meta = {}
    else:
        with open(test_all_meta_path, "r", encoding="utf-8") as f:
            test_all_meta = json.load(f)
    if args.domain != "all":
        test_all_meta = {args.domain: test_all_meta.get(args.domain, [])}
    test_file_list = get_unfinished(
        args.action_space, args.model, args.observation_type, args.result_dir, test_all_meta,
    )
    test(args, test_file_list)
