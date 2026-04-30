"""Shared Pydantic schemas for the Auditzilla API.

This file is shared across Person 1 (vision), Person 2 (finance), and
Person 3 (decision engine + UI). Each person owns their own section so
edits don't collide. Keep section markers intact.
"""

from __future__ import annotations

from datetime import date
from typing import Optional

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


class VisionAnalyseResponse(BaseModel):
    filename: str
    items: list[DetectedItem]
    confidence: float
    annotated_image_url: Optional[str] = None
    source: str


class VisionItem(BaseModel):
    item: str
    count: int
    confidence: float


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


class FinanceResult(BaseModel):
    transaction: str
    category: str
    confidence: float = Field(ge=0.0, le=1.0)
    flags: list[str] = Field(default_factory=list)


class InventorySummaryItem(BaseModel):
    item: str
    expected: int
    observed: int
    difference: int
    status: str


class TransactionSummaryItem(BaseModel):
    transaction: str
    category: str
    confidence: float = Field(ge=0.0, le=1.0)
    flags: list[str] = Field(default_factory=list)
    status: str


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


class AuditRequest(BaseModel):
    """Request body for POST /audit/summary."""

    vision_results: list[VisionResult]
    finance_results: list[FinanceResult]
    expected_inventory: dict[str, int]


class AuditSummaryResponse(BaseModel):
    """Response from POST /audit/summary."""

    overall_status: str
    confidence_avg: float
    inventory_summary: list[InventorySummaryItem]
    transaction_summary: list[TransactionSummaryItem]
    total_discrepancies: int
    flagged_transactions: int
    timestamp: str


# ---------------------------------------------------------------------------
# PERSON 3 — Audit / decision engine schemas (placeholder)
# ---------------------------------------------------------------------------


class AuditDecision(BaseModel):
    status: str  # "Approved" | "Flagged" | "Needs Review"
    reasons: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)


class AuditSummary(BaseModel):
    vision: Optional[VisionResult] = None
    finance: Optional[FinanceAnalyseResponse] = None
    decision: AuditDecision


class AIAuditDecision(BaseModel):
    """Claude-generated financial intelligence audit decision."""
    status: str  # "Approved" | "Flagged" | "Needs Review - Escalate to Human"
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
    escalate: bool
    escalation_reason: str
    risk_flags: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    question: str
    transaction_id: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    transaction_id: Optional[str] = None
