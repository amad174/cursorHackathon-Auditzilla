"""Shared Pydantic schemas for the Auditzilla API.

This file is shared across Person 1 (vision), Person 2 (finance), and
Person 3 (decision engine + UI). Each person owns their own section so
edits don't collide. Keep section markers intact.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# PERSON 1 — Vision schemas (placeholder, owned by feature/vision-audit)
# ---------------------------------------------------------------------------
# Person 1 should fill these in. The shape below is a suggestion only — agree
# on the final contract before wiring it into the decision engine.


class DetectedItem(BaseModel):
    item: str
    count: int
    confidence: float
    bounding_boxes: list[list[float]] = Field(default_factory=list)


class VisionResult(BaseModel):
    items: list[DetectedItem]
    confidence: float
    annotated_image_url: Optional[str] = None


# ---------------------------------------------------------------------------
# PERSON 2 — Finance schemas (owned by feature/finance-audit)
# ---------------------------------------------------------------------------


class Transaction(BaseModel):
    """Raw transaction loaded from CSV."""

    id: str
    date: date
    amount: float
    vendor: str
    description: str = ""


class TransactionResult(BaseModel):
    """A transaction enriched with classification + audit signal."""

    id: str
    date: date
    amount: float
    vendor: str
    description: str

    category: str
    confidence: float = Field(ge=0.0, le=1.0)
    flags: list[str] = Field(default_factory=list)
    explanation: str = ""

    def short_label(self) -> str:
        """Human readable single-line label, e.g. 'Amazon £120.00'."""
        return f"{self.vendor} £{self.amount:.2f}"


class FinanceSummary(BaseModel):
    """Aggregate stats across the analysed batch."""

    total_transactions: int
    total_amount: float
    by_category: dict[str, float]
    anomaly_count: int
    duplicate_count: int
    flagged_count: int
    average_confidence: float


class FinanceAnalyseResponse(BaseModel):
    """Top-level response from POST /finance/analyse."""

    transactions: list[TransactionResult]
    summary: FinanceSummary


# ---------------------------------------------------------------------------
# PERSON 3 — Audit / decision engine schemas
# ---------------------------------------------------------------------------


class AuditDecision(BaseModel):
    status: str  # "Approved" | "Flagged" | "Needs Review"
    reasons: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)


class AuditSummary(BaseModel):
    vision: Optional[VisionResult] = None
    finance: Optional[FinanceAnalyseResponse] = None
    decision: AuditDecision


class AuditRequest(BaseModel):
    vision_results: List[DetectedItem]
    finance_results: List[TransactionResult]
    expected_inventory: Dict[str, int]
