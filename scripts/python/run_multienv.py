"""
Unified multi-environment run (OS-World style). Multi-process evaluation.
Use --provider_name playwright for Playwright env; --agent to select agent.
"""
from __future__ import annotations
import argparse
import datetime
import json
import logging
import os
import sys
import signal
import time
from multiprocessing import Process, Manager, current_process

# Paths: project root and OSWorld-main
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(_SCRIPT_DIR, "..", ".."))
OSWORLD_MAIN = os.path.join(ROOT, "OSWorld-main")
if OSWORLD_MAIN not in sys.path:
    sys.path.insert(0, OSWORLD_MAIN)
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from agent_registry import get_agent, list_agents
from run import create_env, config, get_unfinished

if os.path.exists(os.path.join(ROOT, ".env")):
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(ROOT, ".env"))
    except ImportError:
        pass

active_environments = []
processes = []
is_terminating = False


def config_multienv() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Run end-to-end evaluation (multi-env)")
    p.add_argument("--path_to_vm", type=str, default=None)
    p.add_argument("--provider_name", type=str, default="playwright",
                   choices=["playwright", "vmware", "docker", "aws", "azure", "virtualbox"])
    p.add_argument("--headless", action="store_true")
    p.add_argument("--action_space", type=str, default="pyautogui")
    p.add_argument("--observation_type", choices=["screenshot", "a11y_tree", "screenshot_a11y_tree", "som"], default="screenshot")
    p.add_argument("--screen_width", type=int, default=1920)
    p.add_argument("--screen_height", type=int, default=1080)
    p.add_argument("--sleep_after_execution", type=float, default=0.0)
    p.add_argument("--max_steps", type=int, default=15)
    p.add_argument("--max_trajectory_length", type=int, default=3)
    _base = os.path.join(OSWORLD_MAIN, "evaluation_examples") if os.path.isdir(os.path.join(OSWORLD_MAIN, "evaluation_examples")) else os.path.join(ROOT, "evaluation_examples")
    p.add_argument("--test_config_base_dir", type=str, default=_base)
    p.add_argument("--model", type=str, default="gpt-4o")
    p.add_argument("--temperature", type=float, default=1.0)
    p.add_argument("--top_p", type=float, default=0.9)
    p.add_argument("--max_tokens", type=int, default=1500)
    p.add_argument("--stop_token", type=str, default=None)
    p.add_argument("--domain", type=str, default="all")
    _meta = os.path.join(OSWORLD_MAIN, "evaluation_examples", "test_all.json") if os.path.isfile(os.path.join(OSWORLD_MAIN, "evaluation_examples", "test_all.json")) else os.path.join(ROOT, "evaluation_examples", "test_all.json")
    p.add_argument("--test_all_meta_path", type=str, default=_meta)
    p.add_argument("--result_dir", type=str, default=os.path.join(ROOT, "results"))
    p.add_argument("--agent", type=str, default="prompt", choices=list_agents())
    p.add_argument("--launch_url", type=str, default="about:blank")
    p.add_argument("--num_envs", type=int, default=1)
    p.add_argument("--log_level", type=str, default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"])
    p.add_argument("--region", type=str, default="us-east-1")
    p.add_argument("--client_password", type=str, default="")
    return p.parse_args()


def distribute_tasks(test_all_meta: dict):
    tasks = []
    for domain, examples in test_all_meta.items():
        for example_id in examples:
            tasks.append((domain, example_id))
    return tasks


def run_env_tasks(task_queue, args: argparse.Namespace, shared_scores: list):
    import lib_run_single
    env = None
    try:
        env = create_env(args)
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
        logger = logging.getLogger("desktopenv.experiment")
        logger.info("%s started.", current_process().name)
        while True:
            try:
                item = task_queue.get(timeout=5)
            except Exception:
                break
            domain, example_id = item
            try:
                config_file = os.path.join(args.test_config_base_dir, "examples", domain, f"{example_id}.json")
                if not os.path.isfile(config_file):
                    continue
                with open(config_file, "r", encoding="utf-8") as f:
                    example = json.load(f)
                logger.info("[%s][Domain]: %s [Example ID]: %s", current_process().name, domain, example_id)
                example_result_dir = os.path.join(
                    args.result_dir, args.action_space, args.observation_type, args.model, domain, example_id,
                )
                os.makedirs(example_result_dir, exist_ok=True)
                try:
                    lib_run_single.run_single_example(
                        agent, env, example, args.max_steps, example.get("instruction", ""),
                        args, example_result_dir, shared_scores,
                    )
                except Exception as e:
                    logger.error("Exception %s %s/%s: %s", current_process().name, domain, example_id, e)
                    try:
                        if hasattr(env, "controller") and env.controller is not None:
                            env.controller.end_recording(os.path.join(example_result_dir, "recording.mp4"))
                    except Exception:
                        pass
                    with open(os.path.join(example_result_dir, "traj.jsonl"), "a") as f:
                        f.write(json.dumps({"Error": str(e)}) + "\n")
            except Exception as e:
                logger.error("Task error %s: %s", current_process().name, e)
    except Exception as e:
        logger = logging.getLogger("desktopenv.experiment")
        logger.error("Process error %s: %s", current_process().name, e)
    finally:
        if env:
            try:
                env.close()
            except Exception as e:
                logging.getLogger("desktopenv.experiment").error("Close env: %s", e)


def signal_handler(signum, frame):
    global is_terminating, processes
    if is_terminating:
        return
    is_terminating = True
    logger = logging.getLogger("desktopenv.experiment")
    logger.info("Shutting down...")
    for p in processes:
        if p.is_alive():
            try:
                p.terminate()
            except Exception:
                pass
    time.sleep(1)
    for p in processes:
        if p.is_alive():
            try:
                os.kill(p.pid, signal.SIGKILL)
            except Exception:
                pass
    sys.exit(0)


def test(args: argparse.Namespace, test_all_meta: dict) -> None:
    global processes
    logger = logging.getLogger("desktopenv.experiment")
    logger.info("Args: %s", args)
    all_tasks = distribute_tasks(test_all_meta)
    logger.info("Total tasks: %d", len(all_tasks))
    with Manager() as manager:
        shared_scores = manager.list()
        task_queue = manager.Queue()
        for item in all_tasks:
            task_queue.put(item)
        processes = []
        for i in range(args.num_envs):
            p = Process(
                target=run_env_tasks,
                args=(task_queue, args, shared_scores),
                name="EnvProcess-%d" % (i + 1),
            )
            p.daemon = True
            p.start()
            processes.append(p)
        try:
            while True:
                alive = sum(1 for p in processes if p.is_alive())
                if task_queue.empty():
                    break
                if alive == 0:
                    break
                time.sleep(5)
            for p in processes:
                p.join(timeout=2)
            scores = list(shared_scores)
        except KeyboardInterrupt:
            signal_handler(signal.SIGINT, None)
        else:
            logger.info("Average score: %s", sum(scores) / len(scores) if scores else 0)


def get_result(action_space, use_model, observation_type, result_dir, total_file_json):
    target_dir = os.path.join(result_dir, action_space, observation_type, use_model)
    if not os.path.exists(target_dir):
        return None
    all_result = []
    for domain in os.listdir(target_dir):
        domain_path = os.path.join(target_dir, domain)
        if os.path.isdir(domain_path):
            for example_id in os.listdir(domain_path):
                example_path = os.path.join(domain_path, example_id)
                if os.path.isdir(example_path) and "result.txt" in os.listdir(example_path):
                    try:
                        with open(os.path.join(example_path, "result.txt"), "r") as f:
                            all_result.append(float(f.read()))
                    except Exception:
                        all_result.append(0.0)
    if not all_result:
        return None
    print("Current Success Rate:", sum(all_result) / len(all_result) * 100, "%")
    return all_result


if __name__ == "__main__":
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    args = config_multienv()
    log_level = getattr(logging, args.log_level.upper())
    logging.getLogger().setLevel(log_level)
    datetime_str = datetime.datetime.now().strftime("%Y%m%d@%H%M%S")
    os.makedirs(os.path.join(ROOT, "logs"), exist_ok=True)
    fh = logging.FileHandler(os.path.join(ROOT, "logs", "multienv-%s.log" % datetime_str), encoding="utf-8")
    fh.setFormatter(logging.Formatter("[%(asctime)s %(levelname)s %(name)s] %(message)s"))
    logging.getLogger().addHandler(fh)
    logging.getLogger().addHandler(logging.StreamHandler(sys.stdout))

    os.makedirs(args.result_dir, exist_ok=True)
    path_to_args = os.path.join(args.result_dir, args.action_space, args.observation_type, args.model, "args.json")
    os.makedirs(os.path.dirname(path_to_args), exist_ok=True)
    with open(path_to_args, "w", encoding="utf-8") as f:
        json.dump(vars(args), f, indent=4)

    if os.path.isfile(args.test_all_meta_path):
        with open(args.test_all_meta_path, "r", encoding="utf-8") as f:
            test_all_meta = json.load(f)
    else:
        test_all_meta = {}
    if args.domain != "all":
        test_all_meta = {args.domain: test_all_meta.get(args.domain, [])}
    test_file_list = get_unfinished(
        args.action_space, args.model, args.observation_type, args.result_dir, test_all_meta,
    )
    get_result(args.action_space, args.model, args.observation_type, args.result_dir, test_all_meta)
    test(args, test_file_list)
