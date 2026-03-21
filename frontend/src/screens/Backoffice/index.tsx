import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { DashboardTab } from "./DashboardTab";
import { TenantsTab }   from "./TenantsTab";
import { ActivityTab }  from "./ActivityTab";

// ── Tab config ────────────────────────────────────────────────────────────────

type TabId = "dashboard" | "tenants" | "activity";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard",  icon: "📊" },
  { id: "tenants",   label: "Talleres",   icon: "🏪" },
  { id: "activity",  label: "Actividad",  icon: "📅" },
];

// ── Layout ────────────────────────────────────────────────────────────────────

export function Backoffice() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const user = useAuthStore((s) => s.user);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#080D14", color: "#E2E8F0" }}
    >
      {/* ── Top bar ── */}
      <header
        className="sticky top-0 z-30 flex items-center gap-4 px-4 h-14 border-b border-white/5"
        style={{ background: "rgba(8,13,20,0.95)", backdropFilter: "blur(12px)" }}
      >
        {/* Logo + title */}
        <div className="flex items-center gap-2.5 mr-2">
          <img src="/logo.png" alt="TallerTrack" className="h-7 w-auto" />
          <div className="hidden sm:block">
            <p className="text-white font-black text-sm leading-none">TallerTrack</p>
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-[0.15em] leading-none mt-0.5">
              Backoffice
            </p>
          </div>
        </div>

        {/* SUPERADMIN badge */}
        <span
          className="text-[9px] font-black uppercase tracking-[0.18em] px-2 py-1
                     rounded-full text-rose-300 border border-rose-500/30"
          style={{ background: "rgba(244,63,94,0.08)" }}
        >
          SUPERADMIN
        </span>

        <div className="flex-1" />

        {/* User + exit */}
        <div className="flex items-center gap-3">
          <p className="hidden sm:block text-slate-500 text-xs truncate max-w-[160px]">{user?.email}</p>
          <Link
            to="/dashboard"
            className="h-8 px-3 rounded-lg border border-white/10 text-slate-400
                       hover:border-white/20 hover:text-slate-200 text-xs font-semibold
                       transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            App
          </Link>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <nav className="sticky top-14 z-20 flex border-b border-white/5 px-4"
           style={{ background: "rgba(8,13,20,0.95)", backdropFilter: "blur(12px)" }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold
                          border-b-2 transition-colors -mb-px ${
                active
                  ? "border-brand text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Content ── */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "tenants"   && <TenantsTab />}
        {activeTab === "activity"  && <ActivityTab />}
      </main>
    </div>
  );
}
