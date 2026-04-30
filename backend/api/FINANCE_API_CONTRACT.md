# Finance API contract

Owned by Person 2 (`feature/finance-audit`).
**Do not change without telling Person 1 and Person 3.**

## Endpoints

| Method | Path                       | Notes |
|-------:|----------------------------|-------|
| GET    | `/finance/health`          | Liveness ping |
| GET    | `/finance/analyse/sample`  | Runs the pipeline against `data/mock_transactions.csv`. Use this for the demo. |
| POST   | `/finance/analyse`         | Multipart upload `file=<csv>`. CSV columns: `id,date,amount,vendor,description`. |

## Response shape (`FinanceAnalyseResponse`)

```json
{
  "transactions": [
    {
      "id": "T001",
      "date": "2026-04-01",
      "amount": 1450.00,
      "vendor": "Amazon Business",
      "description": "Bulk order - Red Bull 24 cans x 30",
      "category": "Inventory",
      "confidence": 0.92,
      "flags": ["duplicate"],
      "explanation": "Classified as Inventory based on the vendor name. Looks like a duplicate of another £1450.00 charge from 'Amazon Business' within 2 days."
    }
  ],
  "summary": {
    "total_transactions": 35,
    "total_amount": 38765.34,
    "by_category": { "Inventory": 7250.00, "Transport": 296.50 },
    "anomaly_count": 2,
    "duplicate_count": 4,
    "flagged_count": 6,
    "average_confidence": 0.812
  }
}
```

## Flags

A transaction's `flags` array can contain any of:

- `"anomaly"` — amount > 2× category average, or > μ+2σ, or largest in category and > £1,000.
- `"duplicate"` — same vendor + same amount within 2 days of another charge.
- `"repeat"` — 3+ charges from the same vendor within 1 day.

`confidence` starts from the categoriser confidence and is penalised by each flag (anomaly: −0.25, duplicate: −0.15, repeat: −0.10), clamped to `[0, 1]`.

## How the decision engine should consume this

Person 3's decision engine (`backend/services/decision_engine.py`) can use:

- `summary.flagged_count > 0` ⇒ at minimum `"Flagged"`.
- `summary.average_confidence < 0.7` ⇒ `"Needs Review"`.
- Any transaction with `"anomaly"` in `flags` is a strong signal for `"Needs Review"`.

## Optional LLM categorisation

Set both `AUDITZILLA_USE_LLM=1` and `OPENAI_API_KEY=...` to enable an OpenAI fallback for transactions the rule-based categoriser can't classify. Off by default — the demo never needs the network.
