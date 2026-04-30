from __future__ import annotations

from typing import Iterable

from backend.models.schemas import BoundingBox


def _iou(a: BoundingBox, b: BoundingBox) -> float:
    x_left = max(a.x1, b.x1)
    y_top = max(a.y1, b.y1)
    x_right = min(a.x2, b.x2)
    y_bottom = min(a.y2, b.y2)

    if x_right <= x_left or y_bottom <= y_top:
        return 0.0

    intersection = (x_right - x_left) * (y_bottom - y_top)
    area_a = max(0.0, (a.x2 - a.x1) * (a.y2 - a.y1))
    area_b = max(0.0, (b.x2 - b.x1) * (b.y2 - b.y1))
    union = area_a + area_b - intersection
    if union <= 0:
        return 0.0
    return intersection / union


def calculate_confidence(boxes: Iterable[BoundingBox]) -> float:
    detections = list(boxes)
    if not detections:
        return 0.0

    base = sum(b.confidence for b in detections) / len(detections)
    low_count_penalty = 0.1 if len(detections) < 3 else 0.0

    overlaps = 0
    for i in range(len(detections)):
        for j in range(i + 1, len(detections)):
            if _iou(detections[i], detections[j]) > 0.3:
                overlaps += 1
    overlap_penalty = min(0.2, overlaps * 0.05)

    return max(0.0, min(1.0, base - low_count_penalty - overlap_penalty))
