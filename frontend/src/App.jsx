import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Transactions from "./pages/Transactions";

function NavItem({ to, label, dot }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-4 py-2 text-xs font-mono uppercase tracking-widest transition-colors border-b-2 ${
          isActive
            ? "text-terminal-green border-terminal-green"
            : "text-slate-500 border-transparent hover:text-slate-300"
        }`
      }
    >
      {dot && <span className="inline-block w-1.5 h-1.5 rounded-full bg-terminal-green mr-1.5 mb-0.5" />}
      {label}
    </NavLink>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-dark-900 text-slate-200">
        {/* Top nav */}
        <nav className="border-b border-dark-500 bg-dark-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-12">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-terminal-green rounded-full glow-green" />
              <span className="text-terminal-green font-mono text-sm font-bold tracking-widest">
                AUDIT<span className="text-white">—AI</span>
              </span>
              <span className="text-dark-400 text-xs font-mono">|</span>
              <span className="text-slate-600 text-xs font-mono">smart inventory auditing</span>
            </div>
            <div className="flex items-center">
              <NavItem to="/" label="Dashboard" dot />
              <NavItem to="/upload" label="Upload" />
              <NavItem to="/transactions" label="Transactions" />
            </div>
          </div>
        </nav>

        {/* Routes */}
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/transactions" element={<Transactions />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
