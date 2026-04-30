"""Vision analysis service for image-based inventory detection."""
from __future__ import annotations

import base64
import io
import os
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List

from PIL import Image, ImageDraw

from backend.models.schemas import DetectedItem, VisionAnalyseResponse
from backend.utils.logger import get_logger

try:
    from ultralytics import YOLO  # type: ignore
except Exception:  # pragma: no cover
    YOLO = None

logger = get_logger("vision_service")


@dataclass
class BoundingBox:
    label: str
    confidence: float
    x1: float
    y1: float
    x2: float
    y2: float


class VisionService:
    def __init__(self) -> None:
        self.model = self._load_model()
        self.allowed_labels = {
            "red_bull": "Red Bull",
            "coca_cola": "Coca-Cola",
            "water_bottle": "Water Bottle",
            "bottle": "Bottle",
            "can": "Can",
            "cup": "Cup",
        }

    def _load_model(self):
        model_path = os.getenv("YOLO_MODEL_PATH")
        if YOLO is None:
            logger.info("Ultralytics not installed; using mock vision detection.")
            return None
        if not model_path:
            logger.info("YOLO_MODEL_PATH not set; using mock vision detection.")
            return None
        try:
            return YOLO(model_path)
        except Exception as exc:  # pragma: no cover
            logger.warning("Failed to load YOLO model, fallback to mock detection: %s", exc)
            return None

    def analyse_image(self, image_bytes: bytes, filename: str = "upload.jpg") -> VisionAnalyseResponse:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        boxes = self._detect(image)
        items = self._count_by_label(boxes)
        overall_conf = self._calculate_confidence(boxes)
        annotated_b64 = self._annotate_to_base64(image, boxes)

        return VisionAnalyseResponse(
            filename=filename,
            annotated_image_url=annotated_b64,
            items=items,
            confidence=round(overall_conf, 4),
            source="yolo" if self.model is not None else "mock",
        )

    def _detect(self, image: Image.Image) -> List[BoundingBox]:
        if self.model is not None:
            return self._detect_yolo(image)
        return self._detect_mock(image)

    def _detect_yolo(self, image: Image.Image) -> List[BoundingBox]:
        preds = self.model(image)
        boxes: List[BoundingBox] = []
        for pred in preds:
            names = getattr(pred, "names", {})
            for b in getattr(pred, "boxes", []):
                cls_id = int(b.cls.item()) if hasattr(b.cls, "item") else int(b.cls)
                raw_label = names.get(cls_id, str(cls_id)).lower().replace(" ", "_")
                label = self.allowed_labels.get(raw_label)
                if not label:
                    continue
                xyxy = b.xyxy[0].tolist() if hasattr(b.xyxy[0], "tolist") else list(b.xyxy[0])
                boxes.append(
                    BoundingBox(
                        label=label,
                        confidence=float(b.conf.item()) if hasattr(b.conf, "item") else float(b.conf),
                        x1=float(xyxy[0]),
                        y1=float(xyxy[1]),
                        x2=float(xyxy[2]),
                        y2=float(xyxy[3]),
                    )
                )
        return boxes

    def _detect_mock(self, image: Image.Image) -> List[BoundingBox]:
        width, height = image.size
        return [
            BoundingBox(label="Red Bull", confidence=0.89, x1=0.08 * width, y1=0.18 * height, x2=0.24 * width, y2=0.78 * height),
            BoundingBox(label="Red Bull", confidence=0.86, x1=0.26 * width, y1=0.2 * height, x2=0.41 * width, y2=0.79 * height),
            BoundingBox(label="Coca-Cola", confidence=0.83, x1=0.56 * width, y1=0.16 * height, x2=0.71 * width, y2=0.86 * height),
        ]

    def _count_by_label(self, boxes: List[BoundingBox]) -> List[DetectedItem]:
        grouped: Dict[str, List[float]] = defaultdict(list)
        for box in boxes:
            grouped[box.label].append(box.confidence)

        results: List[DetectedItem] = []
        for label, confs in grouped.items():
            results.append(
                DetectedItem(
                    item=label,
                    count=len(confs),
                    confidence=round(sum(confs) / len(confs), 4),
                )
            )
        return sorted(results, key=lambda x: x.item)

    def _calculate_confidence(self, boxes: List[BoundingBox]) -> float:
        if not boxes:
            return 0.0
        return sum(box.confidence for box in boxes) / len(boxes)

    def _annotate_to_base64(self, image: Image.Image, boxes: List[BoundingBox]) -> str:
        draw = ImageDraw.Draw(image)
        for box in boxes:
            draw.rectangle([(box.x1, box.y1), (box.x2, box.y2)], outline="lime", width=3)
            draw.text((box.x1, max(0, box.y1 - 16)), f"{box.label} {box.confidence:.2f}", fill="lime")

        buffer = io.BytesIO()
        image.save(buffer, format="JPEG")
        return base64.b64encode(buffer.getvalue()).decode("utf-8")
