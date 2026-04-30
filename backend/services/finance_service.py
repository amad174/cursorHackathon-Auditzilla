"""Finance + Intelligence service.

Owned by Person 2 (feature/finance-audit).

Pipeline:
    bytes/path -> Transaction[]                       (load)
              -> categorise (rule-based, OpenAI opt.) (classify)
              -> detect duplicates                    (audit signal)
              -> detect anomalies + repeated charges  (audit signal)
              -> build human-readable explanations    (explain)
              -> aggregate FinanceSummary             (rollup)
              -> FinanceAnalyseResponse               (return)

The service is deliberately framework-free — it takes raw inputs and
returns Pydantic models so it can be called from FastAPI, a CLI, or a
unit test with no glue.
"""

from __future__ import annotations

import csv
import io
import os
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from statistics import mean, pstdev
from typing import Iterable

from backend.models.schemas import (
    FinanceAnalyseResponse,
    FinanceSummary,
    Transaction,
    TransactionResult,
)
from backend.utils.confidence import clamp, combine, penalise
from backend.utils.logger import get_logger

log = get_logger("finance_service")


# ---------------------------------------------------------------------------
# Categorisation rules
# ---------------------------------------------------------------------------
#
# Each rule = (regex matched against vendor + description, category label,
# base confidence when matched). Order matters: first match wins, so put the
# specific rules above the generic ones.

@dataclass(frozen=True)
class CategoryRule:
    pattern: re.Pattern[str]
    category: str
    confidence: float


def _rule(pattern: str, category: str, confidence: float) -> CategoryRule:
    return CategoryRule(re.compile(pattern, re.IGNORECASE), category, confidence)


CATEGORY_RULES: list[CategoryRule] = [
    # Inventory / wholesale
    _rule(r"\bamazon\b", "Inventory", 0.92),
    _rule(r"\bcostco\b", "Inventory", 0.93),
    _rule(r"\bbooker\b", "Inventory", 0.93),
    _rule(r"\bb&q\b|\bbq\b|\bhomebase\b", "Inventory", 0.88),
    # Transport
    _rule(r"\buber\b|\blyft\b|\bbolt\b|\bcab\b|\btaxi\b", "Transport", 0.93),
    # Fuel
    _rule(r"\bshell\b|\bbp\b|\besso\b|\btexaco\b|\bfuel\b", "Fuel", 0.92),
    # Groceries
    _rule(r"\btesco\b|\bsainsbury\b|\basda\b|\bwaitrose\b|\bmorrison\b|\baldi\b|\blidl\b",
          "Groceries", 0.9),
    # Food & drink
    _rule(r"\bpret\b|\bstarbucks\b|\bcosta\b|\bgreggs\b|\bnando\b|\bmcdonald\b",
          "Food & Drink", 0.9),
    # Software / SaaS
    _rule(r"\bzoom\b|\baws\b|\bgoogle workspace\b|\badobe\b|\bgithub\b|\bnotion\b|\bslack\b",
          "Software", 0.93),
    # Tax
    _rule(r"\bhmrc\b|\binland revenue\b|\bvat\b", "Tax", 0.97),
    # Income / payment processors (treated as inflow)
    _rule(r"\bstripe\b|\bsquare\b|\bsumup\b|\bpayout\b|\bsalary\b|\bpayroll\b",
          "Income", 0.92),
]

UNCATEGORISED = "Uncategorised"
UNCATEGORISED_CONFIDENCE = 0.35


# ---------------------------------------------------------------------------
# Tunables
# ---------------------------------------------------------------------------

DUPLICATE_WINDOW_DAYS = 2
REPEAT_WINDOW_DAYS = 1
REPEAT_MIN_HITS = 3            # 3+ charges from same vendor inside the window
ANOMALY_MULTIPLIER = 2.0       # 2x category average per spec
ANOMALY_ABSOLUTE_FLOOR = 1000  # always look at large absolute amounts too


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------


def load_transactions(source: str | Path | bytes | io.IOBase) -> list[Transaction]:
    """Load transactions from a CSV path, raw bytes, or file-like object.

    CSV columns: id, date, amount, vendor, description
    """
    if isinstance(source, (str, Path)):
        with open(source, "r", encoding="utf-8", newline="") as f:
            return _parse_csv(f)
    if isinstance(source, bytes):
        return _parse_csv(io.StringIO(source.decode("utf-8")))
    return _parse_csv(source)  # assume text-mode file-like


def _parse_csv(stream: io.IOBase) -> list[Transaction]:
    reader = csv.DictReader(stream)
    out: list[Transaction] = []
    for i, row in enumerate(reader, start=1):
        try:
            out.append(
                Transaction(
                    id=row.get("id") or f"T{i:04d}",
                    date=_parse_date(row["date"]),
                    amount=float(row["amount"]),
                    vendor=row["vendor"].strip(),
                    description=(row.get("description") or "").strip(),
                )
            )
        except (KeyError, ValueError) as exc:
            log.warning("skipping malformed row %d: %s", i, exc)
    log.info("loaded %d transactions", len(out))
    return out


def _parse_date(value: str) -> date:
    value = value.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"unrecognised date format: {value!r}")


# ---------------------------------------------------------------------------
# Categorisation
# ---------------------------------------------------------------------------


def categorise(tx: Transaction) -> tuple[str, float, str]:
    """Return (category, confidence, matched_rule_label) for a transaction."""
    haystack = f"{tx.vendor} {tx.description}"
    for rule in CATEGORY_RULES:
        if rule.pattern.search(haystack):
            return rule.category, rule.confidence, rule.pattern.pattern
    return UNCATEGORISED, UNCATEGORISED_CONFIDENCE, ""


def _categorise_all_with_claude(txs: list[Transaction]) -> dict[str, tuple[str, float, str]]:
    """Call Claude once to categorise all transactions in a single batch.

    Returns a mapping of tx.id -> (category, confidence, explanation).
    Falls back to an empty dict (rule-based takes over) if the API is unavailable.
    """
    import json as _json

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return {}

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)

        tx_list = [
            {
                "id": tx.id,
                "vendor": tx.vendor,
                "description": tx.description,
                "amount": tx.amount,
                "date": str(tx.date),
            }
            for tx in txs
        ]

        prompt = (
            "You are a financial intelligence agent. Categorise each business transaction below.\n\n"
            "For every transaction return:\n"
            "  - id: the original transaction id\n"
            "  - category: one of Inventory, Transport, Fuel, Groceries, Food & Drink, "
            "Software, Tax, Income, Utilities, Equipment, Professional Services, Uncategorised\n"
            "  - confidence: 0.0-1.0\n"
            "  - explanation: one sentence explaining the categorisation\n"
            "  - suspicious: true if the transaction looks unusual, fraudulent, or policy-violating\n"
            "  - suspicious_reason: brief plain-English reason when suspicious, else empty string\n\n"
            "Return a JSON array — one object per transaction, preserving id. No markdown fences.\n\n"
            f"Transactions:\n{_json.dumps(tx_list, indent=2)}"
        )

        with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=4000,
            system=(
                "You are a financial intelligence agent. Categorise transactions and flag suspicious "
                "activity. Respond only in valid JSON (a plain array, no markdown)."
            ),
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            response = stream.get_final_message()

        text = next(b.text for b in response.content if b.type == "text")
        text = text.strip()
        if "```" in text:
            parts = text.split("```")
            block = parts[1]
            if block.startswith("json"):
                block = block[4:]
            text = block.strip()

        items = _json.loads(text)
        result: dict[str, tuple[str, float, str]] = {}
        for item in items:
            tx_id = str(item["id"])
            cat = item.get("category", UNCATEGORISED)
            conf = clamp(float(item.get("confidence", 0.7)))
            explanation = item.get("explanation", "")
            if item.get("suspicious"):
                reason = item.get("suspicious_reason", "Flagged as suspicious.")
                explanation = f"⚠ {reason} {explanation}".strip()
            result[tx_id] = (cat, conf, explanation)
        log.info("Claude categorised %d transactions", len(result))
        return result

    except Exception as exc:
        log.warning("Claude batch categorisation failed: %s", exc)
        return {}


# ---------------------------------------------------------------------------
# Duplicate / repeat / anomaly detection
# ---------------------------------------------------------------------------


def find_duplicates(
    txs: list[Transaction], window_days: int = DUPLICATE_WINDOW_DAYS
) -> set[str]:
    """IDs of transactions that look like duplicates of an earlier one.

    A duplicate = same vendor (case-insensitive), same amount, dated within
    `window_days` of the earlier one. We mark *both* sides so they highlight
    in the UI.
    """
    flagged: set[str] = set()
    by_vendor: dict[tuple[str, float], list[Transaction]] = defaultdict(list)
    for tx in txs:
        by_vendor[(tx.vendor.lower(), round(tx.amount, 2))].append(tx)

    for group in by_vendor.values():
        if len(group) < 2:
            continue
        group_sorted = sorted(group, key=lambda t: t.date)
        for i, earlier in enumerate(group_sorted):
            for later in group_sorted[i + 1 :]:
                if (later.date - earlier.date).days <= window_days:
                    flagged.add(earlier.id)
                    flagged.add(later.id)
    return flagged


def find_repeats(
    txs: list[Transaction],
    window_days: int = REPEAT_WINDOW_DAYS,
    min_hits: int = REPEAT_MIN_HITS,
) -> set[str]:
    """IDs of transactions in a same-vendor cluster of >= min_hits within window."""
    flagged: set[str] = set()
    by_vendor: dict[str, list[Transaction]] = defaultdict(list)
    for tx in txs:
        by_vendor[tx.vendor.lower()].append(tx)

    for group in by_vendor.values():
        if len(group) < min_hits:
            continue
        group_sorted = sorted(group, key=lambda t: t.date)
        for i in range(len(group_sorted)):
            window_end = group_sorted[i].date + timedelta(days=window_days)
            cluster = [t for t in group_sorted[i:] if t.date <= window_end]
            if len(cluster) >= min_hits:
                flagged.update(t.id for t in cluster)
    return flagged


MIN_CATEGORY_SIZE_FOR_STATS = 3


def find_anomalies(
    txs: list[Transaction],
    multiplier: float = ANOMALY_MULTIPLIER,
    absolute_floor: float = ANOMALY_ABSOLUTE_FLOOR,
) -> dict[str, str]:
    """Map of tx.id -> reason for amount-based anomalies.

    A transaction is anomalous if any of:
      - it falls in `Uncategorised` AND its amount >= `absolute_floor`
        (we can't reason about it, so any large unknown spend gets flagged);
      - its category has >= `MIN_CATEGORY_SIZE_FOR_STATS` entries AND
        amount > `multiplier` * category mean;
      - same precondition AND amount > μ + 2σ for the category.

    Categories with too few entries are skipped — a single £2,400 HMRC
    payment isn't anomalous just because it's the only one of its kind.
    """
    reasons: dict[str, str] = {}

    # Group by category using the rule-based categoriser (cheap + deterministic).
    by_category: dict[str, list[Transaction]] = defaultdict(list)
    for tx in txs:
        cat, _, _ = categorise(tx)
        by_category[cat].append(tx)

    for cat, group in by_category.items():
        # Uncategorised: any large unknown payment is worth a second look.
        if cat == UNCATEGORISED:
            for t in group:
                if t.amount >= absolute_floor:
                    reasons[t.id] = (
                        f"£{t.amount:.2f} from '{t.vendor}' could not be "
                        f"categorised and exceeds the £{absolute_floor:.0f} "
                        "review floor."
                    )
            continue

        if len(group) < MIN_CATEGORY_SIZE_FOR_STATS:
            continue

        amounts = [t.amount for t in group]
        avg = mean(amounts)
        stdev = pstdev(amounts) if len(amounts) > 1 else 0.0
        threshold_mult = avg * multiplier
        threshold_z = avg + 2 * stdev
        for t in group:
            if avg > 0 and t.amount > threshold_mult:
                reasons[t.id] = (
                    f"£{t.amount:.2f} is more than {multiplier:g}× the "
                    f"average {cat.lower()} spend (£{avg:.2f})."
                )
            elif stdev > 0 and t.amount > threshold_z:
                reasons[t.id] = (
                    f"£{t.amount:.2f} is more than two standard deviations "
                    f"above typical {cat.lower()} spend (μ=£{avg:.2f}, "
                    f"σ=£{stdev:.2f})."
                )
    return reasons


# ---------------------------------------------------------------------------
# Top-level analysis
# ---------------------------------------------------------------------------


def analyse(txs: list[Transaction]) -> FinanceAnalyseResponse:
    """Run the full pipeline and return the API response model.

    Categorisation order:
      1. Claude batch API (when ANTHROPIC_API_KEY is set) — returns category +
         one-line explanation + suspicious flag for every transaction at once.
      2. Rule-based fallback for any transaction Claude didn't cover.
    Duplicate / anomaly / repeat detection always runs regardless.
    """
    # Try Claude batch categorisation; falls back to {} if unavailable
    claude_cats = _categorise_all_with_claude(txs)

    duplicates = find_duplicates(txs)
    repeats = find_repeats(txs)
    anomalies = find_anomalies(txs)

    results: list[TransactionResult] = []
    for tx in txs:
        if tx.id in claude_cats:
            category, base_conf, ai_explanation = claude_cats[tx.id]
        else:
            category, base_conf, _ = categorise(tx)
            ai_explanation = ""

        flags: list[str] = []
        if tx.id in anomalies:
            flags.append("anomaly")
        if tx.id in duplicates:
            flags.append("duplicate")
        if tx.id in repeats:
            flags.append("repeat")

        conf = base_conf
        if "anomaly" in flags:
            conf = penalise(conf, 0.25)
        if "duplicate" in flags:
            conf = penalise(conf, 0.15)
        if "repeat" in flags:
            conf = penalise(conf, 0.1)

        # Merge Claude's explanation with rule-based flag details
        explanation = _build_explanation(tx, category, flags, anomalies, ai_explanation)

        results.append(
            TransactionResult(
                id=tx.id,
                date=tx.date,
                amount=tx.amount,
                vendor=tx.vendor,
                description=tx.description,
                category=category,
                confidence=conf,
                flags=flags,
                explanation=explanation,
            )
        )

    summary = _summarise(results)
    return FinanceAnalyseResponse(transactions=results, summary=summary)


def _build_explanation(
    tx: Transaction,
    category: str,
    flags: list[str],
    anomaly_reasons: dict[str, str],
    ai_explanation: str = "",
) -> str:
    parts: list[str] = []

    # Lead with Claude's explanation when available
    if ai_explanation:
        parts.append(ai_explanation)
    elif category == UNCATEGORISED:
        parts.append(
            f"Could not auto-categorise '{tx.vendor}' from rules — review manually."
        )
    else:
        parts.append(f"Classified as {category} based on the vendor name.")

    if "duplicate" in flags:
        parts.append(
            f"Looks like a duplicate of another £{tx.amount:.2f} charge from "
            f"'{tx.vendor}' within {DUPLICATE_WINDOW_DAYS} days."
        )
    if "repeat" in flags:
        parts.append(
            f"Part of a cluster of {REPEAT_MIN_HITS}+ charges from "
            f"'{tx.vendor}' within {REPEAT_WINDOW_DAYS} day(s)."
        )
    if "anomaly" in flags:
        parts.append(anomaly_reasons.get(tx.id, "Amount looks unusually large."))

    if not flags and not ai_explanation and category != UNCATEGORISED:
        parts.append("No anomalies detected.")
    return " ".join(parts)


def _summarise(results: Iterable[TransactionResult]) -> FinanceSummary:
    results = list(results)
    if not results:
        return FinanceSummary(
            total_transactions=0,
            total_amount=0.0,
            by_category={},
            anomaly_count=0,
            duplicate_count=0,
            flagged_count=0,
            average_confidence=0.0,
        )

    by_category: dict[str, float] = defaultdict(float)
    anomaly = duplicate = flagged = 0
    total = 0.0
    for r in results:
        by_category[r.category] += r.amount
        total += r.amount
        if "anomaly" in r.flags:
            anomaly += 1
        if "duplicate" in r.flags:
            duplicate += 1
        if r.flags:
            flagged += 1

    return FinanceSummary(
        total_transactions=len(results),
        total_amount=round(total, 2),
        by_category={k: round(v, 2) for k, v in by_category.items()},
        anomaly_count=anomaly,
        duplicate_count=duplicate,
        flagged_count=flagged,
        average_confidence=round(mean(r.confidence for r in results), 3),
    )


# ---------------------------------------------------------------------------
# Convenience for demos / Person 3
# ---------------------------------------------------------------------------


DEFAULT_MOCK_PATH = Path(__file__).resolve().parents[2] / "data" / "mock_transactions.csv"


def analyse_mock(path: str | Path | None = None) -> FinanceAnalyseResponse:
    """Run the pipeline against the bundled mock CSV.

    Person 3 can call this from /audit/summary if no upload is provided.
    """
    target = Path(path) if path else DEFAULT_MOCK_PATH
    return analyse(load_transactions(target))
