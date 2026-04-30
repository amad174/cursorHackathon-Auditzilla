from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    label: str
    confidence: float = Field(ge=0.0, le=1.0)
    x1: float
    y1: float
    x2: float
    y2: float


class ItemCount(BaseModel):
    item: str
    count: int = Field(ge=0)
    confidence: float = Field(ge=0.0, le=1.0)


class VisionAnalyseResponse(BaseModel):
    items: List[ItemCount]
    confidence: float = Field(ge=0.0, le=1.0)
    bounding_boxes: List[BoundingBox]
    annotated_image_base64: str
    temp_image_path: str
