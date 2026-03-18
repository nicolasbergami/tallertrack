import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../../components/layout/AppShell";
import { BigButton } from "../../components/ui/BigButton";
import { WorkOrderCard } from "./WorkOrderCard";
import { workOrdersApi } from "../../api/work-orders.api";
import { WorkOrderStatus, WorkOrderDetail } from "../../types/work-order";
import { ACTIVE_STATUSES, STATUS_CONFIG } from "../../config/status.config";

// Kanban column order (only active states)
const KANBAN_COLUMNS: WorkOrderStatus[] = ACTIVE_STATUSES;

export function Dashboard() {
  const navigate = useNavigate();
  const [search, setSearch]           = useState("");
  const [activeTab, setActiveTab]     = useState<WorkOrderStatus | "all">("all");
  const [viewMode, setViewMode]       = useState<"kanban" | "list">("list");

  const { data, isLoading, error } = useQuery({
    queryKey: ["work-orders"],
    queryFn: () => workOrdersApi.list({ limit: 100 }),
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  const orders: WorkOrderDetail[] = data?.data ?? [];

  // Filter by search (license plate) and active tab
  const filtered = useMemo(() => {
    let list = orders;
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter((o) => o.vehicle_plate.toUpperCase().includes(q));
    }
    if (activeTab !== "all") {
      list = list.filter((o) => o.status === activeTab);
    }
    return list;
  }, [orders, search, activeTab]);

  // Count per status for tab badges
  const counts = useMemo(() => {
    const map: Partial<Record<WorkOrderStatus, number>> = {};
    orders.forEach((o) => { map[o.status] = (map[o.status] ?? 0) + 1; });
    return map;
  }, [orders]);

  return (
    <AppShell
      title="Órdenes activas"
      action={
        <div className="flex items-center gap-2">
          {/* Toggle list/kanban */}
          <button
            onClick={() => setViewMode(v => v === "list" ? "kanban" : "list")}
            className="w-10 h-10 rounded-xl bg-surface-raised flex items-center justify-center text-slate-300 hover:bg-surface-border transition-colors"
            title={viewMode === "list" ? "Vista Kanban" : "Vista lista"}
          >
            {viewMode === "list" ? "⊞" : "☰"}
          </button>
          <BigButton size="md" onClick={() => navigate("/new")} icon={<span>＋</span>}>
            Nueva OT
          </BigButton>
        </div>
      }
    >
      <div className="flex flex-col gap-0">

        {/* ── Search bar ── */}
        <div className="px-4 py-3 bg-surface sticky top-[3.75rem] z-30 border-b border-surface-border">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por patente…"
              className="w-full h-touch bg-surface-card border border-surface-border rounded-2xl
                         pl-12 pr-4 text-lg text-slate-100 placeholder-slate-500
                         focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent
                         transition-colors font-plate tracking-widest"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xl"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Status Tabs ── */}
        <div className="flex overflow-x-auto scrollbar-hide border-b border-surface-border bg-surface sticky top-[7.25rem] z-20">
          {/* "All" tab */}
          <StatusTab
            label="Todo"
            count={orders.length}
            active={activeTab === "all"}
            onClick={() => setActiveTab("all")}
            color="text-slate-300"
            activeBg="border-b-2 border-slate-300"
          />
          {KANBAN_COLUMNS.map((status) => {
            const cfg = STATUS_CONFIG[status];
            return (
              <StatusTab
                key={status}
                label={cfg.shortLabel}
                count={counts[status] ?? 0}
                active={activeTab === status}
                onClick={() => setActiveTab(status)}
                color={cfg.textColor}
                activeBg={`border-b-2 ${cfg.borderColor}`}
                emoji={cfg.emoji}
              />
            );
          })}
        </div>

        {/* ── Content ── */}
        {isLoading && <LoadingState />}
        {error    && <ErrorState message={(error as Error).message} />}

        {!isLoading && !error && (
          viewMode === "list"
            ? <ListView orders={filtered} />
            : <KanbanView orders={orders} search={search} counts={counts} />
        )}
      </div>
    </AppShell>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatusTab({
  label, count, active, onClick, color, activeBg, emoji,
}: {
  label: string; count: number; active: boolean; onClick: () => void;
  color: string; activeBg: string; emoji?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center gap-0.5 px-3 py-2.5 flex-shrink-0
        text-xs font-semibold whitespace-nowrap transition-all touch-feedback
        ${active ? `${color} ${activeBg}` : "text-slate-500 hover:text-slate-400 border-b-2 border-transparent"}
      `}
    >
      <span>{emoji}{emoji ? " " : ""}{label}</span>
      <span className={`font-black text-base leading-none ${active ? color : "text-slate-600"}`}>
        {count}
      </span>
    </button>
  );
}

function ListView({ orders }: { orders: WorkOrderDetail[] }) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-500">
        <span className="text-6xl">🏁</span>
        <p className="text-lg font-semibold">Sin órdenes activas</p>
        <p className="text-sm">¡Todo al día!</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 p-4 animate-slide-up">
      {orders.map((o) => <WorkOrderCard key={o.id} order={o} />)}
    </div>
  );
}

function KanbanView({
  orders, search, counts,
}: {
  orders: WorkOrderDetail[];
  search: string;
  counts: Partial<Record<WorkOrderStatus, number>>;
}) {
  return (
    <div className="flex overflow-x-auto gap-3 p-4 pb-6 snap-x snap-mandatory">
      {KANBAN_COLUMNS.map((status) => {
        const cfg = STATUS_CONFIG[status];
        const colOrders = orders.filter(
          (o) =>
            o.status === status &&
            (!search.trim() || o.vehicle_plate.toUpperCase().includes(search.toUpperCase()))
        );
        return (
          <div
            key={status}
            className="flex flex-col gap-3 flex-shrink-0 w-72 snap-start"
          >
            {/* Column header */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${cfg.bgColor}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dotColor} flex-shrink-0`} />
              <span className={`font-bold text-sm ${cfg.textColor} flex-1`}>{cfg.label}</span>
              <span className={`font-black text-base ${cfg.textColor}`}>{counts[status] ?? 0}</span>
            </div>
            {/* Cards */}
            <div className="flex flex-col gap-2">
              {colOrders.map((o) => <WorkOrderCard key={o.id} order={o} />)}
              {colOrders.length === 0 && (
                <div className="text-center text-slate-600 text-sm py-6">Sin órdenes</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-surface-card rounded-2xl h-28 animate-pulse" />
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <span className="text-5xl">⚠️</span>
      <p className="text-red-400 font-semibold">Error al cargar órdenes</p>
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
}
