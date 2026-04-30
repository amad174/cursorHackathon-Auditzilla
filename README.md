# Audit-AI

Smart inventory + finance auditing system. Built for the hackathon.

## Architecture

- **Backend** — FastAPI + Pydantic decision engine (Person 3)
- **Vision** — Computer vision inventory counting (Person 1 — stub)
- **Finance** — Transaction categorisation & anomaly detection (Person 2 — stub)

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API available at `http://localhost:8000`
Swagger docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:5173`

## Key Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/audit/summary` | Unified audit — combines vision + finance through decision engine |
| POST | `/vision/analyse` | Upload image for inventory analysis (stub) |
| GET | `/finance/transactions` | List transactions with flags (stub) |
| POST | `/finance/analyse` | Categorise transactions (stub) |

## Decision Engine Logic

```
confidence > 0.85 AND no_issues  → Approved
confidence > 0.85 AND discrepancy → Flagged
else                              → Needs Review
```

## Example Audit Request

```bash
curl -X POST http://localhost:8000/audit/summary \
  -H "Content-Type: application/json" \
  -d '{
    "vision_results": [{"item": "Red Bull", "count": 24, "confidence": 0.87}],
    "finance_results": [{"transaction": "Amazon £120", "category": "Inventory", "confidence": 0.88, "flags": ["anomaly"]}],
    "expected_inventory": {"Red Bull": 30}
  }'
```

## Project Structure

```
audit-ai/
├── backend/
│   ├── main.py                    # FastAPI app + CORS
│   ├── api/
│   │   ├── audit_routes.py        # /audit/summary (decision engine)
│   │   ├── vision_routes.py       # /vision/analyse (stub)
│   │   └── finance_routes.py      # /finance/transactions (stub)
│   ├── services/
│   │   ├── decision_engine.py     # Core audit logic
│   │   ├── vision_service.py      # Stub
│   │   └── finance_service.py     # Stub
│   ├── models/schemas.py          # Pydantic models
│   └── utils/confidence.py, logger.py
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx      # Hero page — status + stock + flags
│       │   ├── Upload.jsx         # Image upload + vision results
│       │   └── Transactions.jsx   # Sortable transaction table
│       └── components/
│           ├── AuditSummary.jsx   # Decision card
│           ├── ImageResult.jsx    # Annotated image + counts
│           └── TransactionTable.jsx # Colour-coded table
├── data/
│   ├── mock_transactions.csv      # 15 rows, 2 duplicates, 1 anomaly
│   └── mock_inventory.json        # Expected stock levels
└── README.md
```

## Demo Flow (30 seconds)

1. Open `http://localhost:5173` — Dashboard shows **Flagged** status with stock discrepancies
2. Click **Upload** → drag in any warehouse photo → see mock item counts + confidence scores
3. Click **Transactions** → see table with red/amber highlighted anomalies & duplicates
4. Back on **Dashboard** → click **RUN AUDIT** → decision engine returns unified summary
