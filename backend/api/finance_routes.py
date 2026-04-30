from fastapi import APIRouter

router = APIRouter()


@router.get("/transactions")
def get_transactions():
    """Stub endpoint — returns mock finance transactions."""
    return {
        "transactions": [
            {"transaction": "Amazon £120", "category": "Inventory", "confidence": 0.88, "flags": ["anomaly"]},
            {"transaction": "Tesco £45", "category": "Supplies", "confidence": 0.93, "flags": []},
            {"transaction": "Amazon £120", "category": "Inventory", "confidence": 0.88, "flags": ["duplicate"]},
            {"transaction": "Shell £200", "category": "Fuel", "confidence": 0.62, "flags": []},
            {"transaction": "Office Depot £890", "category": "Equipment", "confidence": 0.71, "flags": ["anomaly"]},
        ],
        "source": "mock",
    }


@router.post("/analyse")
def analyse_transactions():
    """Stub endpoint — returns mock categorisation results."""
    return {
        "categorised": True,
        "source": "mock",
        "results": [
            {"transaction": "Amazon £120", "category": "Inventory", "confidence": 0.88, "flags": ["anomaly"]},
        ],
    }
