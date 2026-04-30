from typing import List


def average_confidence(scores: List[float]) -> float:
    if not scores:
        return 0.0
    return round(sum(scores) / len(scores), 4)


def confidence_label(score: float) -> str:
    if score >= 0.90:
        return "High"
    elif score >= 0.75:
        return "Medium"
    return "Low"
