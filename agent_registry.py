"""
Agent registry: map --agent name to (AgentClass, default_kwargs).
All agent classes are from OSWorld-main/mm_agents; ensure OSWorld-main is on sys.path before use.
"""
import logging
from typing import Any, Callable, Dict, Type

logger = logging.getLogger(__name__)

# Lazy imports from mm_agents to avoid requiring OSWorld-main at import time
def _get_prompt_agent():
    from mm_agents.agent import PromptAgent
    return PromptAgent

def _get_uitars15_v2():
    from mm_agents.uitars15_v2 import UITarsAgent
    return UITarsAgent

def _get_uitars15_v1():
    from mm_agents.uitars15_v1 import UITARSAgent
    return UITARSAgent

def _get_uitars_base():
    from mm_agents.uitars_agent import UITARSAgent
    return UITARSAgent

def _get_o3_agent():
    from mm_agents.o3_agent import O3Agent
    return O3Agent

# name -> (factory that returns Agent class, optional default kwargs for that agent)
AGENT_REGISTRY: Dict[str, tuple] = {
    "prompt": (_get_prompt_agent, {}),
    "uitars15_v2": (_get_uitars15_v2, {}),
    "uitars15_v1": (_get_uitars15_v1, {}),
    "uitars": (_get_uitars_base, {}),
    "o3": (_get_o3_agent, {}),
}

# Resolve lazy entries on first use so mm_agents can be loaded after path is set
_resolved = {}

def get_agent_class(name: str):
    if name not in AGENT_REGISTRY:
        raise ValueError(
            "Unknown agent: {}. Available: {}".format(name, list(AGENT_REGISTRY.keys()))
        )
    entry = AGENT_REGISTRY[name]
    factory = entry[0]
    if name not in _resolved:
        _resolved[name] = factory() if callable(factory) else factory
    return _resolved[name]

def get_agent(name: str, **kwargs) -> Any:
    """Instantiate agent by name with optional overrides."""
    cls = get_agent_class(name)
    defaults = AGENT_REGISTRY[name][1].copy()
    defaults.update(kwargs)
    return cls(**defaults)

def list_agents():
    return list(AGENT_REGISTRY.keys())
