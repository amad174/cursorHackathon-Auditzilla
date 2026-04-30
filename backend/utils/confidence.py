"""Confidence helpers shared by vision and finance services.

Person 1 (vision) and Person 2 (finance) both need a small, predictable way
to combine signals into a single 0..1 confidence number. Keep this module
free of domain logic — only generic math.
"""

from __future__ import annotations

from typing import Iterable


def clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    """Clamp x into [lo, hi]."""
    if x < lo:
        return lo
    if x > hi:
        return hi
    return x


def average(values: Iterable[float], default: float = 0.0) -> float:
    """Mean of an iterable of floats, with a fallback if empty."""
    vals = list(values)
    if not vals:
        return default
    return sum(vals) / len(vals)


def combine(*scores: float, weights: Iterable[float] | None = None) -> float:
    """Weighted average of confidence scores, clamped to [0, 1].

    If no weights are provided, all scores weight equally.
    """
    score_list = list(scores)
    if not score_list:
        return 0.0
    if weights is None:
        weight_list = [1.0] * len(score_list)
    else:
        weight_list = list(weights)
        if len(weight_list) != len(score_list):
            raise ValueError("weights length must match scores length")
    total_weight = sum(weight_list)
    if total_weight == 0:
        return 0.0
    weighted = sum(s * w for s, w in zip(score_list, weight_list))
    return clamp(weighted / total_weight)


def penalise(score: float, penalty: float) -> float:
    """Subtract a penalty from a score, clamped to [0, 1]."""
    return clamp(score - penalty)
