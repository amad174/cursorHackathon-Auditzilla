from __future__ import annotations

import json
import os
from typing import List, Dict, Optional

from backend.models.schemas import (
    VisionItem,
    FinanceResult,
    InventorySummaryItem,
    TransactionSummaryItem,
    AIAuditDecision,
)
from backend.utils.logger import get_logger

log = get_logger("decision_engine")

_SYSTEM_PROMPT = (
    "You are a financial intelligence agent auditing business transactions. "
    "Your job is to identify fraud, anomalies, duplicate charges, and policy "
    "violations. You must decide whether a set of transactions can be auto-approved "
    "or needs human review. Be specific about why you are flagging something. "
    "Respond only in valid JSON."
)


# ---------------------------------------------------------------------------
# Legacy rule-based helpers (kept for /audit/summary backwards compatibility)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Claude-powered AI audit decision
# ---------------------------------------------------------------------------

def ai_audit_decision(
    transactions: list[dict],
    vision_results: Optional[list[dict]] = None,
) -> AIAuditDecision:
    """Call Claude to produce a financial intelligence audit decision.

    Args:
        transactions: List of transaction dicts (id, date, amount, vendor,
                      description, category, flags, explanation, confidence).
        vision_results: Optional list of vision detection dicts.

    Returns:
        AIAuditDecision with status, reasoning, escalation info, and risk flags.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        log.warning("ANTHROPIC_API_KEY not set — using rule-based fallback")
        return _fallback_decision(transactions)

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)

        tx_text = json.dumps(transactions, indent=2, default=str)
        vision_text = (
            json.dumps(vision_results, indent=2, default=str)
            if vision_results
            else "null"
        )

        user_content = (
            "Audit the following business transactions and produce a decision.\n\n"
            f"TRANSACTIONS:\n{tx_text}\n\n"
            f"VISION / INVENTORY RESULTS:\n{vision_text}\n\n"
            "Return exactly this JSON structure (no markdown fences):\n"
            "{\n"
            '  "status": "Approved" | "Flagged" | "Needs Review - Escalate to Human",\n'
            '  "confidence": 0.0-1.0,\n'
            '  "reasoning": "Plain English explanation of the decision",\n'
            '  "escalate": true | false,\n'
            '  "escalation_reason": "Why a human needs to look at this (empty string if no escalation)",\n'
            '  "risk_flags": ["list of specific concerns"]\n'
            "}"
        )

        with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=2000,
            thinking={"type": "adaptive"},
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
        ) as stream:
            response = stream.get_final_message()

        text = next(b.text for b in response.content if b.type == "text")
        text = _strip_fences(text)
        data = json.loads(text)

        return AIAuditDecision(
            status=data.get("status", "Needs Review - Escalate to Human"),
            confidence=float(data.get("confidence", 0.5)),
            reasoning=data.get("reasoning", ""),
            escalate=bool(data.get("escalate", False)),
            escalation_reason=data.get("escalation_reason", ""),
            risk_flags=data.get("risk_flags", []),
        )

    except Exception as exc:
        log.warning("AI audit decision failed: %s", exc)
        return _fallback_decision(transactions)


def _strip_fences(text: str) -> str:
    text = text.strip()
    if "```" in text:
        parts = text.split("```")
        # parts[1] is the fenced block
        block = parts[1]
        if block.startswith("json"):
            block = block[4:]
        return block.strip()
    return text


def _fallback_decision(transactions: list[dict]) -> AIAuditDecision:
    flagged = [t for t in transactions if t.get("flags")]
    escalate = len(flagged) >= 3
    if escalate:
        status = "Needs Review - Escalate to Human"
    elif flagged:
        status = "Flagged"
    else:
        status = "Approved"

    risk_flags = [
        f"Transaction {t.get('id', '?')} ({t.get('vendor', '?')} £{t.get('amount', 0):.2f})"
        f" — {', '.join(t.get('flags', []))}"
        for t in flagged[:5]
    ]

    return AIAuditDecision(
        status=status,
        confidence=0.55,
        reasoning=(
            "AI analysis unavailable (ANTHROPIC_API_KEY not set). "
            f"Rule-based detection found {len(flagged)} flagged transaction(s)."
        ),
        escalate=escalate,
        escalation_reason="Multiple flagged transactions require human review." if escalate else "",
        risk_flags=risk_flags,
    )
