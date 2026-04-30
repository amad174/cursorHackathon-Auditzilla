from typing import List, Dict
from models.schemas import (
    VisionItem,
    FinanceResult,
    InventorySummaryItem,
    TransactionSummaryItem,
)


def _item_status(confidence: float, has_discrepancy: bool) -> str:
    if confidence > 0.85 and not has_discrepancy:
        return "Approved"
    elif confidence > 0.85 and has_discrepancy:
        return "Flagged"
    else:
        return "Needs Review"


def evaluate_inventory(
    vision_results: List[VisionItem],
    expected_inventory: Dict[str, int],
) -> List[InventorySummaryItem]:
    summary = []
    for item in vision_results:
        expected = expected_inventory.get(item.item, 0)
        difference = item.count - expected
        has_discrepancy = difference != 0
        status = _item_status(item.confidence, has_discrepancy)
        summary.append(
            InventorySummaryItem(
                item=item.item,
                expected=expected,
                observed=item.count,
                difference=difference,
                status=status,
            )
        )
    return summary


def evaluate_transactions(
    finance_results: List[FinanceResult],
) -> List[TransactionSummaryItem]:
    summary = []
    for txn in finance_results:
        has_issues = len(txn.flags) > 0
        status = _item_status(txn.confidence, has_issues)
        summary.append(
            TransactionSummaryItem(
                transaction=txn.transaction,
                category=txn.category,
                confidence=txn.confidence,
                flags=txn.flags,
                status=status,
            )
        )
    return summary


def compute_overall_status(
    inventory_summary: List[InventorySummaryItem],
    transaction_summary: List[TransactionSummaryItem],
) -> str:
    all_statuses = [i.status for i in inventory_summary] + [
        t.status for t in transaction_summary
    ]
    if "Flagged" in all_statuses:
        return "Flagged"
    if "Needs Review" in all_statuses:
        return "Needs Review"
    return "Approved"
