import { useState, useEffect } from "react";
import TransactionTable from "../components/TransactionTable";

const MOCK_TRANSACTIONS = [
  { id: "T001", date: "2026-04-01", amount: 240.00, vendor: "Stripe", description: "Monthly processing fee - card payments", category: "Income", confidence: 0.92, flags: ["duplicate"], explanation: "Classified as Income. Looks like a duplicate of another £240.00 charge from 'Stripe' within 2 days." },
  { id: "T002", date: "2026-04-02", amount: 180.40, vendor: "AWS", description: "Cloud compute charges - production servers", category: "Software", confidence: 0.78, flags: ["duplicate"], explanation: "Classified as Software. Looks like a duplicate charge within 2 days." },
  { id: "T003", date: "2026-04-03", amount: 48.00, vendor: "Notion", description: "Teams plan - monthly subscription", category: "Software", confidence: 0.93, flags: [], explanation: "Classified as Software. No anomalies detected." },
  { id: "T004", date: "2026-04-03", amount: 240.00, vendor: "Stripe", description: "Monthly processing fee - card payments", category: "Income", confidence: 0.78, flags: ["duplicate"], explanation: "Duplicate of T001." },
  { id: "T005", date: "2026-04-04", amount: 180.40, vendor: "AWS", description: "Cloud compute charges - production servers", category: "Software", confidence: 0.78, flags: ["duplicate"], explanation: "Duplicate of T002." },
  { id: "T006", date: "2026-04-06", amount: 8500.00, vendor: "FastCash Holdings Ltd", description: "Equipment procurement reference FC-0042", category: "Uncategorised", confidence: 0.28, flags: ["anomaly"], explanation: "⚠ Unknown vendor, unusually large amount." },
  { id: "T007", date: "2026-04-06", amount: 350.00, vendor: "Unknown Trading Ltd", description: "Automated transfer processed 03:15 AM", category: "Uncategorised", confidence: 0.32, flags: ["anomaly"], explanation: "⚠ 3am transaction to unknown vendor." },
  { id: "T008", date: "2026-04-07", amount: 5000.00, vendor: "Consultancy Services Ltd", description: "Professional advisory services Q1", category: "Professional Services", confidence: 0.55, flags: ["anomaly"], explanation: "⚠ Round-number payment to generic consultancy vendor." },
];

function parseTransactions(raw) {
  return raw.map(t => ({
    ...t,
    flags: Array.isArray(t.flags)
      ? t.flags
      : (t.flags || "").split(",").map(f => f.trim()).filter(Boolean),
  }));
}

function AIChatBox({ transactions }) {
  const [question, setQuestion] = useState("");
  const [txId, setTxId] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  const flaggedTxs = transactions.filter(t => t.flags && t.flags.length > 0);

  const askQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("http://localhost:8000/finance/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          transaction_id: txId,
        }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      setAnswer(data.answer);
    } catch (err) {
      setAnswer("Could not reach the AI — check that the backend is running and ANTHROPIC_API_KEY is set.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-terminal-amber/40 bg-dark-700">
      <div className="bg-dark-600 border-b border-dark-500 px-6 py-3 flex items-center gap-2">
        <div className="w-2 h-2 bg-terminal-amber rounded-full" />
        <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">
          AI TRANSACTION ANALYST — Ask Claude
        </p>
      </div>

      <form onSubmit={askQuestion} className="p-6 space-y-4">
        <div className="flex gap-3">
          {/* Optional transaction selector */}
          <select
            value={txId}
            onChange={e => setTxId(e.target.value)}
            className="bg-dark-800 border border-dark-500 text-slate-300 text-xs font-mono px-3 py-2 focus:outline-none focus:border-terminal-amber/60 w-48"
          >
            <option value="">Select a transaction</option>
            {flaggedTxs.map(t => (
              <option key={t.id} value={t.id}>
                {t.id} — {t.vendor}
              </option>
            ))}
          </select>

          {/* Question input */}
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Why was this transaction flagged? Is this fraud? What should I do?"
            className="flex-1 bg-dark-800 border border-dark-500 text-slate-200 text-xs font-mono px-4 py-2 focus:outline-none focus:border-terminal-amber/60 placeholder-slate-600"
          />

          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="bg-terminal-amber/10 hover:bg-terminal-amber/20 border border-terminal-amber/50 text-terminal-amber px-5 py-2 text-xs font-mono uppercase tracking-widest transition-all disabled:opacity-40 whitespace-nowrap"
          >
            {loading ? "ASKING..." : "▶ ASK AI"}
          </button>
        </div>

        {/* Suggested questions */}
        <div className="flex flex-wrap gap-2">
          {[
            "Why was this flagged?",
            "Is this fraud?",
            "What action should I take?",
            "Explain the risk level",
          ].map(q => (
            <button
              key={q}
              type="button"
              onClick={() => setQuestion(q)}
              className="text-slate-600 hover:text-slate-400 text-xs font-mono px-2 py-1 border border-dark-500 hover:border-dark-400 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </form>

      {/* Response */}
      {(loading || answer) && (
        <div className="border-t border-dark-500 px-6 pb-6 pt-4">
          <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mb-3">
            // claude response{txId ? ` — ${txId}` : ""}
          </p>
          {loading ? (
            <div className="space-y-2">
              <div className="h-3 bg-dark-500 animate-pulse w-full" />
              <div className="h-3 bg-dark-500 animate-pulse w-4/5" />
              <div className="h-3 bg-dark-500 animate-pulse w-3/5" />
            </div>
          ) : (
            <p className="text-slate-200 text-sm font-mono leading-relaxed bg-dark-800 border border-dark-500 p-4">
              {answer}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Transactions() {
  const [transactions, setTransactions] = useState(parseTransactions(MOCK_TRANSACTIONS));
  const [loading, setLoading] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/finance/transactions");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      const parsed = (data.transactions || []).map(t => ({
        ...t,
        flags: Array.isArray(t.flags) ? t.flags : (t.flags || "").split(",").map(f => f.trim()).filter(Boolean),
      }));
      setTransactions(parsed);
    } catch {
      setTransactions(parseTransactions(MOCK_TRANSACTIONS));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const anomalies = transactions.filter(t => t.flags.includes("anomaly")).length;
  const duplicates = transactions.filter(t => t.flags.includes("duplicate")).length;
  const totalSpend = transactions.reduce((s, t) => s + parseFloat(t.amount || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border border-dark-500 bg-dark-700 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-terminal-amber text-xs font-mono uppercase tracking-widest mb-1">
              FINANCE MODULE / TRANSACTION LEDGER
            </p>
            <h1 className="text-white text-2xl font-mono font-bold tracking-tight">
              Transaction Review
            </h1>
            <p className="text-slate-500 text-xs font-mono mt-1">
              Flagged: {anomalies} anomalies, {duplicates} duplicates — Total spend: £{totalSpend.toFixed(2)}
            </p>
          </div>
          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="bg-terminal-amber/10 hover:bg-terminal-amber/20 border border-terminal-amber/50 text-terminal-amber px-5 py-2 text-xs font-mono uppercase tracking-widest transition-all disabled:opacity-40"
          >
            {loading ? "LOADING..." : "↻ REFRESH"}
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        <div className="bg-dark-700 border border-dark-500 px-4 py-2 flex items-center gap-2">
          <span className="w-2 h-2 bg-slate-500 inline-block" />
          <span className="text-slate-400 text-xs font-mono">{transactions.length} TOTAL</span>
        </div>
        <div className="bg-dark-700 border border-terminal-red/30 px-4 py-2 flex items-center gap-2">
          <span className="w-2 h-2 bg-terminal-red inline-block" />
          <span className="text-terminal-red text-xs font-mono">{anomalies} ANOMALIES</span>
        </div>
        <div className="bg-dark-700 border border-terminal-amber/30 px-4 py-2 flex items-center gap-2">
          <span className="w-2 h-2 bg-terminal-amber inline-block" />
          <span className="text-terminal-amber text-xs font-mono">{duplicates} DUPLICATES</span>
        </div>
        <div className="bg-dark-700 border border-terminal-green/30 px-4 py-2 flex items-center gap-2">
          <span className="w-2 h-2 bg-terminal-green inline-block" />
          <span className="text-terminal-green text-xs font-mono">
            {transactions.filter(t => t.flags.length === 0).length} CLEAN
          </span>
        </div>
      </div>

      <TransactionTable transactions={transactions} />

      {/* AI Chat */}
      <AIChatBox transactions={transactions} />

      {/* Legend */}
      <div className="bg-dark-900 border border-dark-500 p-4">
        <p className="text-slate-600 text-xs font-mono mb-2 uppercase tracking-widest">// flag legend</p>
        <div className="flex gap-6 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="border-l-2 border-l-terminal-red inline-block w-4 h-3 bg-terminal-red/10" />
            <span className="text-slate-500">anomaly — unusual amount or vendor for category</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="border-l-2 border-l-terminal-amber inline-block w-4 h-3 bg-terminal-amber/10" />
            <span className="text-slate-500">duplicate — same amount + vendor within 2 days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
