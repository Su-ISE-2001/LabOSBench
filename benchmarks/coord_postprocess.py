"""Coordinate post-processing helpers for benchmark agents."""

from __future__ import annotations

CLAUDE_MODEL_SPACE_W = 1440
CLAUDE_MODEL_SPACE_H = 810
VIEWPORT_W = 1920
VIEWPORT_H = 1080

CLAUDE_1440_MODEL_TYPES = {
    "claude_1440",
    "claude_1440x810",
    "claude",
}


def is_claude_1440_model_type(model_type: str | None) -> bool:
    m = (model_type or "").strip().lower().replace("-", "_")
    return m in CLAUDE_1440_MODEL_TYPES


def scale_claude_1440_to_viewport(x: float, y: float) -> tuple[int, int]:
    """Map model coordinates in 1440x810 space to 1920x1080 viewport pixels."""
    return (
        int(x * VIEWPORT_W / CLAUDE_MODEL_SPACE_W),
        int(y * VIEWPORT_H / CLAUDE_MODEL_SPACE_H),
    )
