from fastapi import APIRouter
from datetime import datetime, timezone

from models.schemas import AuditRequest, AuditSummaryResponse
from services.decision_engine import (
    evaluate_inventory,
    evaluate_transactions,
    compute_overall_status,
)

router = APIRouter()


@router.post("/summary", response_model=AuditSummaryResponse)
def audit_summary(body: AuditRequest):
    inventory_summary = evaluate_inventory(body.vision_results, body.expected_inventory)
    transaction_summary = evaluate_transactions(body.finance_results)
    overall_status = compute_overall_status(inventory_summary, transaction_summary)

    all_confidences = [v.confidence for v in body.vision_results] + [
        f.confidence for f in body.finance_results
    ]
    confidence_avg = round(sum(all_confidences) / len(all_confidences), 4) if all_confidences else 0.0

    total_discrepancies = sum(1 for i in inventory_summary if i.difference != 0)
    flagged_transactions = sum(1 for t in transaction_summary if t.status == "Flagged")

    return AuditSummaryResponse(
        overall_status=overall_status,
        confidence_avg=confidence_avg,
        inventory_summary=inventory_summary,
        transaction_summary=transaction_summary,
        total_discrepancies=total_discrepancies,
        flagged_transactions=flagged_transactions,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
