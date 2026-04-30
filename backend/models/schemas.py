from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime


class VisionItem(BaseModel):
    item: str
    count: int
    confidence: float


class FinanceResult(BaseModel):
    transaction: str
    category: str
    confidence: float
    flags: List[str] = []


class AuditRequest(BaseModel):
    vision_results: List[VisionItem]
    finance_results: List[FinanceResult]
    expected_inventory: Dict[str, int]


class InventorySummaryItem(BaseModel):
    item: str
    expected: int
    observed: int
    difference: int
    status: str


class TransactionSummaryItem(BaseModel):
    transaction: str
    category: str
    confidence: float
    flags: List[str]
    status: str


class AuditSummaryResponse(BaseModel):
    overall_status: str
    confidence_avg: float
    inventory_summary: List[InventorySummaryItem]
    transaction_summary: List[TransactionSummaryItem]
    total_discrepancies: int
    flagged_transactions: int
    timestamp: str
