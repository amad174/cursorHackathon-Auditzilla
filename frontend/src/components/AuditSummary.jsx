import { useState } from "react";

const STATUS_CONFIG = {
  Approved: {
    badgeClass: "badge-approved",
    glow: "border-terminal-green/50 shadow-[0_0_20px_rgba(0,255,136,0.15)]",
    icon: "✓",
    color: "text-terminal-green",
  },
  Flagged: {
    badgeClass: "badge-flagged",
    glow: "border-terminal-red/50 shadow-[0_0_20px_rgba(255,61,87,0.15)]",
    icon: "⚠",
    color: "text-terminal-red",
  },
  "Needs Review": {
    badgeClass: "badge-review",
    glow: "border-terminal-amber/50 shadow-[0_0_20px_rgba(255,179,0,0.15)]",
    icon: "◈",
    color: "text-terminal-amber",
  },
};

export default function AuditSummary({ data }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) {
    return (
      <div className="border border-dark-500 bg-dark-700 p-8 text-center">
        <p className="text-slate-500 font-mono text-sm">
          No audit data. Run an audit to see the decision summary.
        </p>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[data.overall_status] || STATUS_CONFIG["Needs Review"];

  return (
    <div className={`border bg-dark-700 p-6 ${cfg.glow} transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mb-1">
            DECISION ENGINE OUTPUT
          </p>
          <h2 className="text-white font-mono text-xl font-bold tracking-tight">
            Audit Summary Report
          </h2>
        </div>
        <span className={cfg.badgeClass}>
          {cfg.icon} {data.overall_status}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-dark-800 border border-dark-500 p-4">
          <p className="text-slate-500 text-xs font-mono mb-1">AVG CONFIDENCE</p>
          <p className={`text-2xl font-mono font-bold ${cfg.color}`}>
            {(data.confidence_avg * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-dark-800 border border-dark-500 p-4">
          <p className="text-slate-500 text-xs font-mono mb-1">STOCK DISCREPANCIES</p>
          <p className="text-2xl font-mono font-bold text-terminal-amber">
            {data.total_discrepancies}
          </p>
        </div>
        <div className="bg-dark-800 border border-dark-500 p-4">
          <p className="text-slate-500 text-xs font-mono mb-1">FLAGGED TRANSACTIONS</p>
          <p className="text-2xl font-mono font-bold text-terminal-red">
            {data.flagged_transactions}
          </p>
        </div>
      </div>

      {/* Decision logic trace */}
      <div className="bg-dark-900 border border-dark-500 p-4 mb-4">
        <p className="text-slate-500 text-xs font-mono mb-2 uppercase tracking-widest">
          // decision trace
        </p>
        <p className="text-slate-300 text-xs font-mono leading-relaxed">
          {data.overall_status === "Approved" && (
            <>confidence &gt; 0.85 AND no_issues → <span className="text-terminal-green">APPROVED</span></>
          )}
          {data.overall_status === "Flagged" && (
            <>confidence &gt; 0.85 AND discrepancy_detected → <span className="text-terminal-red">FLAGGED</span></>
          )}
          {data.overall_status === "Needs Review" && (
            <>confidence ≤ 0.85 → <span className="text-terminal-amber">NEEDS REVIEW</span></>
          )}
        </p>
      </div>

      {/* Expandable details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-slate-500 hover:text-slate-300 text-xs font-mono uppercase tracking-widest transition-colors"
      >
        {expanded ? "▲ HIDE DETAILS" : "▼ SHOW INVENTORY + TRANSACTION BREAKDOWN"}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Inventory */}
          <div>
            <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-2">
              Inventory
            </p>
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-slate-500 border-b border-dark-500">
                  <th className="text-left py-1">ITEM</th>
                  <th className="text-right py-1">EXPECTED</th>
                  <th className="text-right py-1">OBSERVED</th>
                  <th className="text-right py-1">DIFF</th>
                  <th className="text-right py-1">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {data.inventory_summary.map((row, i) => (
                  <tr key={i} className="border-b border-dark-600">
                    <td className="py-1 text-slate-300">{row.item}</td>
                    <td className="py-1 text-right text-slate-400">{row.expected}</td>
                    <td className="py-1 text-right text-slate-300">{row.observed}</td>
                    <td className={`py-1 text-right font-bold ${row.difference < 0 ? "text-terminal-red" : row.difference > 0 ? "text-terminal-amber" : "text-terminal-green"}`}>
                      {row.difference > 0 ? "+" : ""}{row.difference}
                    </td>
                    <td className="py-1 text-right">
                      <span className={
                        row.status === "Approved" ? "text-terminal-green" :
                        row.status === "Flagged" ? "text-terminal-red" :
                        "text-terminal-amber"
                      }>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Transactions */}
          <div>
            <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-2">
              Transactions
            </p>
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-slate-500 border-b border-dark-500">
                  <th className="text-left py-1">TRANSACTION</th>
                  <th className="text-left py-1">FLAGS</th>
                  <th className="text-right py-1">CONFIDENCE</th>
                  <th className="text-right py-1">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {data.transaction_summary.map((row, i) => (
                  <tr key={i} className="border-b border-dark-600">
                    <td className="py-1 text-slate-300">{row.transaction}</td>
                    <td className="py-1">
                      {row.flags.length > 0 ? (
                        row.flags.map((f, j) => (
                          <span key={j} className={`mr-1 text-xs px-1 ${f === "anomaly" ? "bg-terminal-red/20 text-terminal-red" : "bg-terminal-amber/20 text-terminal-amber"}`}>
                            {f}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-1 text-right text-slate-400">{(row.confidence * 100).toFixed(0)}%</td>
                    <td className="py-1 text-right">
                      <span className={
                        row.status === "Approved" ? "text-terminal-green" :
                        row.status === "Flagged" ? "text-terminal-red" :
                        "text-terminal-amber"
                      }>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-4 pt-4 border-t border-dark-500">
        <p className="text-slate-600 text-xs font-mono">
          TIMESTAMP: {data.timestamp ? new Date(data.timestamp).toLocaleString() : "—"}
        </p>
      </div>
    </div>
  );
}
