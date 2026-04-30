import { useState, useEffect } from "react";
import AuditSummary from "../components/AuditSummary";

const MOCK_AUDIT = {
  overall_status: "Flagged",
  confidence_avg: 0.8567,
  total_discrepancies: 2,
  flagged_transactions: 2,
  inventory_summary: [
    { item: "Red Bull", expected: 30, observed: 24, difference: -6, status: "Flagged" },
    { item: "Coca-Cola", expected: 48, observed: 48, difference: 0, status: "Approved" },
    { item: "Heineken", expected: 20, observed: 12, difference: -8, status: "Flagged" },
  ],
  transaction_summary: [
    { transaction: "Amazon £120", category: "Inventory", confidence: 0.88, flags: ["anomaly"], status: "Flagged" },
    { transaction: "Amazon £120", category: "Inventory", confidence: 0.88, flags: ["duplicate"], status: "Flagged" },
    { transaction: "Tesco £45", category: "Supplies", confidence: 0.93, flags: [], status: "Approved" },
  ],
  timestamp: new Date().toISOString(),
};

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mb-2">{label}</p>
          <p className={`text-4xl font-mono font-bold ${
            color === "green" ? "text-terminal-green" :
            color === "red" ? "text-terminal-red" :
            color === "amber" ? "text-terminal-amber" :
            "text-terminal-blue"
          }`}>{value}</p>
          {sub && <p className="text-slate-500 text-xs font-mono mt-1">{sub}</p>}
        </div>
        <span className={`text-2xl opacity-30 ${
          color === "green" ? "text-terminal-green" :
          color === "red" ? "text-terminal-red" :
          color === "amber" ? "text-terminal-amber" :
          "text-terminal-blue"
        }`}>{icon}</span>
      </div>
    </div>
  );
}

function InventoryBar({ item, expected, observed }) {
  const pct = Math.min((observed / Math.max(expected, 1)) * 100, 100);
  const isShort = observed < expected;
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs font-mono text-slate-400 w-24 truncate">{item}</p>
      <div className="flex-1 bg-dark-500 h-2 relative">
        <div
          className={`h-2 transition-all duration-700 ${isShort ? "bg-terminal-red" : "bg-terminal-green"}`}
          style={{ width: `${pct}%` }}
        />
        {/* Expected marker */}
        <div className="absolute top-0 right-0 h-2 w-0.5 bg-slate-500" style={{ right: `${100 - 100}%` }} />
      </div>
      <p className={`text-xs font-mono font-bold w-16 text-right ${isShort ? "text-terminal-red" : "text-terminal-green"}`}>
        {observed}/{expected}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  // Blinking cursor tick
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 800);
    return () => clearInterval(id);
  }, []);

  const runAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/audit/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vision_results: [
            { item: "Red Bull", count: 24, confidence: 0.87 },
            { item: "Coca-Cola", count: 48, confidence: 0.91 },
            { item: "Heineken", count: 12, confidence: 0.76 },
          ],
          finance_results: [
            { transaction: "Amazon £120", category: "Inventory", confidence: 0.88, flags: ["anomaly"] },
            { transaction: "Amazon £120", category: "Inventory", confidence: 0.88, flags: ["duplicate"] },
            { transaction: "Tesco £45", category: "Supplies", confidence: 0.93, flags: [] },
          ],
          expected_inventory: { "Red Bull": 30, "Coca-Cola": 48, "Heineken": 20 },
        }),
      });
      const data = await res.json();
      setAuditData(data);
    } catch {
      setAuditData(MOCK_AUDIT);
    } finally {
      setLoading(false);
    }
  };

  const display = auditData || MOCK_AUDIT;

  const statusColor = display.overall_status === "Approved" ? "text-terminal-green" :
    display.overall_status === "Flagged" ? "text-terminal-red" : "text-terminal-amber";
  const statusBadge = display.overall_status === "Approved" ? "badge-approved" :
    display.overall_status === "Flagged" ? "badge-flagged" : "badge-review";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Hero header */}
      <div className="border border-dark-500 bg-dark-700 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-terminal-green rounded-full glow-green" />
              <p className="text-terminal-green text-xs font-mono uppercase tracking-widest">
                AUDIT-AI / LIVE DASHBOARD
              </p>
              <span className={`text-terminal-green text-xs font-mono ${tick % 2 === 0 ? "opacity-100" : "opacity-0"}`}>█</span>
            </div>
            <h1 className="text-white text-3xl font-mono font-bold tracking-tight">
              Inventory & Finance Audit
            </h1>
            <p className="text-slate-500 text-xs font-mono mt-1">
              {new Date().toLocaleString()} — Warehouse A
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className={statusBadge}>{display.overall_status}</span>
            <button
              onClick={runAudit}
              disabled={loading}
              className="bg-terminal-green/10 hover:bg-terminal-green/20 border border-terminal-green/50 text-terminal-green px-5 py-2 text-xs font-mono uppercase tracking-widest transition-all disabled:opacity-40"
            >
              {loading ? "RUNNING..." : "▶ RUN AUDIT"}
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Overall Status"
          value={display.overall_status === "Approved" ? "✓" : display.overall_status === "Flagged" ? "⚠" : "◈"}
          sub={display.overall_status}
          color={display.overall_status === "Approved" ? "green" : display.overall_status === "Flagged" ? "red" : "amber"}
          icon="◉"
        />
        <StatCard
          label="Stock Discrepancies"
          value={display.total_discrepancies}
          sub={`${display.inventory_summary?.length ?? 0} items checked`}
          color="amber"
          icon="◫"
        />
        <StatCard
          label="Flagged Transactions"
          value={display.flagged_transactions}
          sub={`${display.transaction_summary?.length ?? 0} total`}
          color="red"
          icon="⊘"
        />
        <StatCard
          label="Avg Confidence"
          value={`${(display.confidence_avg * 100).toFixed(1)}%`}
          sub={display.confidence_avg >= 0.85 ? "Above threshold" : "Below threshold"}
          color="blue"
          icon="◈"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Inventory stock levels */}
        <div className="border border-dark-500 bg-dark-700">
          <div className="bg-dark-600 border-b border-dark-500 px-4 py-3">
            <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">
              Stock Levels — Expected vs Observed
            </p>
          </div>
          <div className="p-4 space-y-4">
            {display.inventory_summary?.map((item, i) => (
              <InventoryBar key={i} item={item.item} expected={item.expected} observed={item.observed} />
            ))}
          </div>
          <div className="px-4 pb-4">
            <div className="flex gap-4 text-xs font-mono text-slate-600">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-1 bg-terminal-green" /> On target</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-1 bg-terminal-red" /> Short</span>
            </div>
          </div>
        </div>

        {/* Recent flags */}
        <div className="border border-dark-500 bg-dark-700">
          <div className="bg-dark-600 border-b border-dark-500 px-4 py-3">
            <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">
              Recent Flags & Anomalies
            </p>
          </div>
          <div className="divide-y divide-dark-500">
            {display.transaction_summary?.filter(t => t.flags?.length > 0).length === 0 && (
              <div className="px-4 py-6 text-center text-slate-600 text-xs font-mono">
                No flags detected.
              </div>
            )}
            {display.transaction_summary?.filter(t => t.flags?.length > 0).map((txn, i) => (
              <div key={i} className={`px-4 py-3 flex items-center justify-between ${
                txn.flags.includes("anomaly") ? "bg-terminal-red/5" : "bg-terminal-amber/5"
              }`}>
                <div>
                  <p className="text-sm font-mono text-slate-200">{txn.transaction}</p>
                  <p className="text-xs font-mono text-slate-500">{txn.category}</p>
                </div>
                <div className="flex gap-2">
                  {txn.flags.map((f, j) => (
                    <span key={j} className={`text-xs font-mono px-2 py-0.5 ${
                      f === "anomaly" ? "bg-terminal-red/20 text-terminal-red border border-terminal-red/30" : "bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/30"
                    }`}>{f}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Summary Decision Card */}
      <AuditSummary data={display} />

      {/* Terminal footer */}
      <div className="text-xs font-mono text-slate-600 flex items-center justify-between py-2">
        <span>audit-ai v1.0.0 — decision engine active</span>
        <span>backend: localhost:8000</span>
      </div>
    </div>
  );
}
