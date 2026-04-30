from __future__ import annotations

import base64
import io
import os
import tempfile
from collections import defaultdict
from typing import Dict, List

from PIL import Image, ImageDraw

from backend.models.schemas import BoundingBox, ItemCount, VisionAnalyseResponse
from backend.utils.confidence import calculate_confidence
from backend.utils.logger import get_logger

try:
    from ultralytics import YOLO  # type: ignore
except Exception:  # pragma: no cover
    YOLO = None

logger = get_logger("vision_service")


class VisionService:
    def __init__(self) -> None:
        self.model = self._load_model()
        self.allowed_labels = {"red_bull": "Red Bull", "coca_cola": "Coca Cola", "water_bottle": "Water Bottle"}

    def _load_model(self):
        model_path = os.getenv("YOLO_MODEL_PATH")
        if YOLO is None or not model_path:
            logger.info("YOLO unavailable or model path missing; using mock detection.")
            return None
        try:
            return YOLO(model_path)
        except Exception as exc:  # pragma: no cover
            logger.warning("Failed to load YOLO model, fallback to mock detection: %s", exc)
            return None

    def save_temp_image(self, image_bytes: bytes, suffix: str = ".jpg") -> str:
        fd, temp_path = tempfile.mkstemp(prefix="audit_vision_", suffix=suffix)
        with os.fdopen(fd, "wb") as tmp:
            tmp.write(image_bytes)
        return temp_path

    def analyse(self, image_bytes: bytes, filename: str = "upload.jpg") -> VisionAnalyseResponse:
        suffix = os.path.splitext(filename or "")[-1] or ".jpg"
        temp_path = self.save_temp_image(image_bytes=image_bytes, suffix=suffix)

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        boxes = self._detect(image)
        items = self._count_by_label(boxes)
        overall_conf = calculate_confidence(boxes)
        annotated_b64 = self._annotate_to_base64(image, boxes)

        return VisionAnalyseResponse(
            items=items,
            confidence=round(overall_conf, 4),
            bounding_boxes=boxes,
            annotated_image_base64=annotated_b64,
            temp_image_path=temp_path,
        )

    def _detect(self, image: Image.Image) -> List[BoundingBox]:
        if self.model is not None:
            return self._detect_yolo(image)
        return self._detect_mock(image)

    def _detect_yolo(self, image: Image.Image) -> List[BoundingBox]:
        preds = self.model(image)
        boxes: List[BoundingBox] = []
        for pred in preds:
            names = pred.names
            for b in pred.boxes:
                cls_id = int(b.cls.item())
                raw_label = names.get(cls_id, str(cls_id)).lower().replace(" ", "_")
                if raw_label not in self.allowed_labels:
                    continue
                xyxy = b.xyxy[0].tolist()
                boxes.append(
                    BoundingBox(
                        label=self.allowed_labels[raw_label],
                        confidence=float(b.conf.item()),
                        x1=float(xyxy[0]),
                        y1=float(xyxy[1]),
                        x2=float(xyxy[2]),
                        y2=float(xyxy[3]),
                    )
                )
        return boxes

    def _detect_mock(self, image: Image.Image) -> List[BoundingBox]:
        width, height = image.size
        # deterministic demo boxes when no model is configured
        return [
            BoundingBox(label="Red Bull", confidence=0.89, x1=0.08 * width, y1=0.18 * height, x2=0.24 * width, y2=0.78 * height),
            BoundingBox(label="Red Bull", confidence=0.86, x1=0.26 * width, y1=0.2 * height, x2=0.41 * width, y2=0.79 * height),
            BoundingBox(label="Water Bottle", confidence=0.83, x1=0.56 * width, y1=0.16 * height, x2=0.71 * width, y2=0.86 * height),
        ]

    def _count_by_label(self, boxes: List[BoundingBox]) -> List[ItemCount]:
        grouped: Dict[str, List[float]] = defaultdict(list)
        for box in boxes:
            grouped[box.label].append(box.confidence)

        results: List[ItemCount] = []
        for label, confs in grouped.items():
            results.append(
                ItemCount(
                    item=label,
                    count=len(confs),
                    confidence=round(sum(confs) / len(confs), 4),
                )
            )
        return sorted(results, key=lambda x: x.item)

    def _annotate_to_base64(self, image: Image.Image, boxes: List[BoundingBox]) -> str:
        draw = ImageDraw.Draw(image)
        for box in boxes:
            draw.rectangle([(box.x1, box.y1), (box.x2, box.y2)], outline="lime", width=3)
            draw.text((box.x1, max(0, box.y1 - 16)), f"{box.label} {box.confidence:.2f}", fill="lime")

        buffer = io.BytesIO()
        image.save(buffer, format="JPEG")
        return base64.b64encode(buffer.getvalue()).decode("utf-8")
