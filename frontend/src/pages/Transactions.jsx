import { useState, useEffect } from "react";
import TransactionTable from "../components/TransactionTable";

const MOCK_TRANSACTIONS = [
  { date: "2026-04-01", amount: 45.00, vendor: "Tesco", description: "Weekly supplies run", category: "Supplies", flags: "" },
  { date: "2026-04-02", amount: 120.00, vendor: "Amazon", description: "Inventory restock - Red Bull x24", category: "Inventory", flags: "anomaly" },
  { date: "2026-04-03", amount: 67.50, vendor: "Office Depot", description: "Printer paper and pens", category: "Office", flags: "" },
  { date: "2026-04-04", amount: 120.00, vendor: "Amazon", description: "Inventory restock - Red Bull x24", category: "Inventory", flags: "duplicate" },
  { date: "2026-04-05", amount: 890.00, vendor: "PC World", description: "New laptop for warehouse", category: "Equipment", flags: "anomaly" },
  { date: "2026-04-06", amount: 32.00, vendor: "Starbucks", description: "Team coffee meeting", category: "Entertainment", flags: "" },
  { date: "2026-04-07", amount: 200.00, vendor: "Shell", description: "Delivery van fuel", category: "Fuel", flags: "" },
  { date: "2026-04-08", amount: 55.00, vendor: "Tesco", description: "Weekly supplies run", category: "Supplies", flags: "" },
  { date: "2026-04-09", amount: 18.99, vendor: "Spotify", description: "Monthly subscription", category: "Software", flags: "" },
  { date: "2026-04-10", amount: 340.00, vendor: "DHL", description: "Bulk shipping Q1", category: "Logistics", flags: "" },
  { date: "2026-04-11", amount: 75.00, vendor: "HMRC", description: "VAT payment Q1", category: "Tax", flags: "" },
  { date: "2026-04-12", amount: 18.99, vendor: "Spotify", description: "Monthly subscription", category: "Software", flags: "duplicate" },
  { date: "2026-04-13", amount: 1200.00, vendor: "Airbnb", description: "Conference accommodation", category: "Travel", flags: "anomaly" },
  { date: "2026-04-14", amount: 48.00, vendor: "Sainsbury's", description: "Staff kitchen supplies", category: "Supplies", flags: "" },
  { date: "2026-04-15", amount: 95.00, vendor: "BT", description: "Broadband bill", category: "Utilities", flags: "" },
];

function parseTransactions(raw) {
  return raw.map(t => ({
    ...t,
    flags: t.flags ? t.flags.split(",").map(f => f.trim()).filter(Boolean) : [],
  }));
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
            <span className="text-slate-500">duplicate — same amount + vendor within 30 days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
