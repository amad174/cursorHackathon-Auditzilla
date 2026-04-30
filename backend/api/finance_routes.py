"""FastAPI router for finance endpoints.

Owned by Person 2 (feature/finance-audit).

Person 3: mount this in `backend/main.py` like:

    from backend.api.finance_routes import router as finance_router
    app.include_router(finance_router)

API contract (matches `backend/models/schemas.py`):

    POST /finance/analyse               -> upload a CSV, get FinanceAnalyseResponse
    GET  /finance/analyse/sample        -> run on bundled mock_transactions.csv
    GET  /finance/health                -> liveness ping
"""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.models.schemas import FinanceAnalyseResponse
from backend.services import finance_service
from backend.utils.logger import get_logger

log = get_logger("finance_routes")

router = APIRouter(prefix="/finance", tags=["finance"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "finance"}


@router.get("/analyse/sample", response_model=FinanceAnalyseResponse)
def analyse_sample() -> FinanceAnalyseResponse:
    """Run the pipeline against the bundled mock CSV.

    Useful for the UI demo and for Person 3's /audit/summary fallback.
    """
    log.info("running finance analysis on mock CSV")
    return finance_service.analyse_mock()


@router.post("/analyse", response_model=FinanceAnalyseResponse)
async def analyse_upload(file: UploadFile = File(...)) -> FinanceAnalyseResponse:
    """Analyse a user-uploaded CSV.

    Expected columns: id, date, amount, vendor, description.
    """
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
