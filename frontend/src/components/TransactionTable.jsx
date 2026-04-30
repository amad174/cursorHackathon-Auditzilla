import { useState } from "react";

const FLAG_STYLES = {
  anomaly: "bg-terminal-red/20 text-terminal-red border border-terminal-red/30",
  duplicate: "bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/30",
};

const ROW_HIGHLIGHT = {
  anomaly: "bg-terminal-red/5 border-l-2 border-l-terminal-red",
  duplicate: "bg-terminal-amber/5 border-l-2 border-l-terminal-amber",
  none: "",
};

function getRowClass(flags) {
  if (!flags || flags.length === 0) return "";
  if (flags.includes("anomaly")) return ROW_HIGHLIGHT.anomaly;
  if (flags.includes("duplicate")) return ROW_HIGHLIGHT.duplicate;
  return "";
}

export default function TransactionTable({ transactions }) {
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("asc");
  const [filterFlag, setFilterFlag] = useState("all");

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sorted = [...(transactions || [])].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const filtered = filterFlag === "all"
    ? sorted
    : sorted.filter(t => (t.flags || []).includes(filterFlag));

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span className="text-dark-400 ml-1">⇅</span>;
    return <span className="text-terminal-green ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="flex gap-2 mb-4">
        {["all", "anomaly", "duplicate"].map(f => (
          <button
            key={f}
            onClick={() => setFilterFlag(f)}
            className={`text-xs font-mono px-3 py-1 uppercase tracking-widest border transition-colors ${
              filterFlag === f
                ? f === "all" ? "border-terminal-green/50 text-terminal-green bg-terminal-green/10"
                  : f === "anomaly" ? "border-terminal-red/50 text-terminal-red bg-terminal-red/10"
                  : "border-terminal-amber/50 text-terminal-amber bg-terminal-amber/10"
                : "border-dark-400 text-slate-500 hover:border-dark-400 hover:text-slate-300"
            }`}
          >
            {f === "all" ? `ALL (${transactions?.length ?? 0})` : f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-dark-500 overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-dark-600 border-b border-dark-500">
              {[
                { key: "date", label: "DATE" },
                { key: "vendor", label: "VENDOR" },
                { key: "description", label: "DESCRIPTION" },
                { key: "category", label: "CATEGORY" },
                { key: "amount", label: "AMOUNT" },
                { key: null, label: "FLAGS" },
              ].map(col => (
                <th
                  key={col.label}
                  onClick={() => col.key && handleSort(col.key)}
                  className={`text-left text-xs font-mono text-slate-500 uppercase tracking-widest px-4 py-3 ${col.key ? "cursor-pointer hover:text-slate-300" : ""} select-none`}
                >
                  {col.label}
                  {col.key && <SortIcon col={col.key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-600 text-xs font-mono">
                  No transactions match filter.
                </td>
              </tr>
            )}
            {filtered.map((txn, i) => {
              const flags = txn.flags ? txn.flags.filter(Boolean) : [];
              return (
                <tr key={i} className={`border-b border-dark-600 hover:bg-dark-600 transition-colors ${getRowClass(flags)}`}>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">{txn.date}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-200 font-medium">{txn.vendor}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400 max-w-[200px] truncate">{txn.description}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">{txn.category}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-200 text-right font-bold">
                    £{parseFloat(txn.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {flags.length === 0 ? (
                        <span className="text-slate-600 text-xs font-mono">—</span>
                      ) : (
                        flags.map((f, j) => (
                          <span key={j} className={`text-xs font-mono px-1.5 py-0.5 ${FLAG_STYLES[f] || "bg-slate-700 text-slate-300"}`}>
                            {f}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-dark-600 border-t border-dark-500">
              <td colSpan={4} className="px-4 py-2 text-xs font-mono text-slate-500 uppercase tracking-widest">
                TOTAL ({filtered.length} rows)
              </td>
              <td className="px-4 py-2 text-sm font-mono text-slate-200 font-bold text-right">
                £{filtered.reduce((s, t) => s + parseFloat(t.amount || 0), 0).toFixed(2)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
