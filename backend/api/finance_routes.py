"""FastAPI router for finance endpoints."""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.models.schemas import (
    FinanceAnalyseResponse,
    AIAuditDecision,
    ChatRequest,
    ChatResponse,
)
from backend.services import finance_service
from backend.services.decision_engine import ai_audit_decision
from backend.utils.logger import get_logger

log = get_logger("finance_routes")

router = APIRouter(tags=["finance"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "finance"}


@router.get("/analyse/sample", response_model=FinanceAnalyseResponse)
def analyse_sample() -> FinanceAnalyseResponse:
    """Run the pipeline against the bundled mock CSV."""
    log.info("running finance analysis on mock CSV")
    return finance_service.analyse_mock()


@router.post("/analyse", response_model=FinanceAnalyseResponse)
async def analyse_upload(file: UploadFile = File(...)) -> FinanceAnalyseResponse:
    """Analyse a user-uploaded CSV. Columns: id, date, amount, vendor, description."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        txs = finance_service.load_transactions(raw)
    except Exception as exc:
        log.exception("failed to parse CSV upload")
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {exc}") from exc

    if not txs:
        raise HTTPException(status_code=400, detail="No valid transactions found in CSV")

    log.info("analysing %d uploaded transactions", len(txs))
    return finance_service.analyse(txs)


@router.get("/transactions")
def get_transactions() -> dict:
    """Return all mock transactions enriched with categories and flags for the UI."""
    result = finance_service.analyse_mock()
    return {
        "transactions": [
            {
                "id": t.id,
                "date": str(t.date),
                "amount": t.amount,
                "vendor": t.vendor,
                "description": t.description,
                "category": t.category,
                "confidence": t.confidence,
                "flags": t.flags,
                "explanation": t.explanation,
            }
            for t in result.transactions
        ]
    }


@router.get("/ai-audit", response_model=AIAuditDecision)
def get_ai_audit() -> AIAuditDecision:
    """Run Claude financial intelligence audit against the mock transaction set."""
    log.info("running AI audit against mock CSV")
    result = finance_service.analyse_mock()
    tx_dicts = [
        {
            "id": t.id,
            "date": str(t.date),
            "amount": t.amount,
            "vendor": t.vendor,
            "description": t.description,
            "category": t.category,
            "confidence": t.confidence,
            "flags": t.flags,
            "explanation": t.explanation,
        }
        for t in result.transactions
    ]
    return ai_audit_decision(tx_dicts)


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    """Ask Claude a plain-English question about a transaction or the full ledger."""
    import os
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return ChatResponse(
            answer="AI chat is unavailable: ANTHROPIC_API_KEY is not configured.",
            transaction_id=body.transaction_id,
        )

    result = finance_service.analyse_mock()

    # Build context — single transaction or full ledger
    if body.transaction_id:
        target = next((t for t in result.transactions if t.id == body.transaction_id), None)
        if not target:
            raise HTTPException(status_code=404, detail=f"Transaction {body.transaction_id} not found")
        context_data = {
            "id": target.id,
            "date": str(target.date),
            "amount": target.amount,
            "vendor": target.vendor,
            "description": target.description,
            "category": target.category,
            "confidence": target.confidence,
            "flags": target.flags,
            "explanation": target.explanation,
        }
        context = f"Transaction:\n{context_data}\n\nQuestion: {body.question}"
    else:
        tx_list = [
            {
                "id": t.id,
                "date": str(t.date),
                "amount": t.amount,
                "vendor": t.vendor,
                "category": t.category,
                "flags": t.flags,
            }
            for t in result.transactions
        ]
        context = f"All transactions:\n{tx_list}\n\nQuestion: {body.question}"

    try:
        client = anthropic.Anthropic(api_key=api_key)
        with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=1000,
            system=(
                "You are a financial intelligence agent. Answer questions about business "
                "transactions clearly and concisely in plain English. Be specific about "
                "risks, fraud signals, and concerns. Keep answers under 200 words."
            ),
            messages=[{"role": "user", "content": context}],
        ) as stream:
            response = stream.get_final_message()

        answer = next(b.text for b in response.content if b.type == "text")
        return ChatResponse(answer=answer, transaction_id=body.transaction_id)

    except Exception as exc:
        log.warning("AI chat failed: %s", exc)
        return ChatResponse(
            answer=f"AI response unavailable: {exc}",
            transaction_id=body.transaction_id,
        )
