import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../../components/layout/AppShell";
import { WorkOrderCard } from "./WorkOrderCard";
import { workOrdersApi } from "../../api/work-orders.api";
import { WorkOrderStatus, WorkOrderDetail } from "../../types/work-order";
import { ACTIVE_STATUSES, STATUS_CONFIG } from "../../config/status.config";
import { IconSearch, IconX, IconPlus, IconList, IconGrid, IconWrench } from "../../components/ui/Icons";
import { useAuthStore } from "../../store/auth.store";

const KANBAN_COLUMNS: WorkOrderStatus[] = ACTIVE_STATUSES;
const STALE_MS = 8 * 3600 * 1000; // 8 hours

export function Dashboard() {
  const navigate  = useNavigate();
  const tenantName = useAuthStore((s) => s.user?.tenantName ?? "");
  const [search,    setSearch]    = useState("");
  const [activeTab, setActiveTab] = useState<WorkOrderStatus | "all">("all");
  const [viewMode,  setViewMode]  = useState<"list" | "kanban">("list");

  const { data, isLoading, error } = useQuery({
    queryKey: ["work-orders"],
    queryFn:  () => workOrdersApi.list({ limit: 100 }),
    refetchInterval: 30_000,
  });

  const orders: WorkOrderDetail[] = data?.data ?? [];
  const activeOrders = useMemo(
    () => orders.filter(o => ACTIVE_STATUSES.includes(o.status)),
    [orders],
  );

  const counts = useMemo(() => {
    const map: Partial<Record<WorkOrderStatus, number>> = {};
    activeOrders.forEach((o) => { map[o.status] = (map[o.status] ?? 0) + 1; });
    return map;
  }, [activeOrders]);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      active:        activeOrders.length,
      ready:         counts.ready ?? 0,
      awaitingParts: counts.awaiting_parts ?? 0,
      stale:         activeOrders.filter(o =>
        o.status !== "ready" &&
        (now - new Date(o.received_at).getTime()) > STALE_MS
      ).length,
    };
  }, [activeOrders, counts]);

  const filtered = useMemo(() => {
    let list = activeOrders;
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      list = list.filter(o =>
        o.vehicle_plate.toUpperCase().includes(q) ||
        (o.client_name  ?? "").toUpperCase().includes(q) ||
        (o.order_number ?? "").toUpperCase().includes(q),
      );
    }
    if (activeTab !== "all") {
      list = list.filter(o => o.status === activeTab);
    }
    return list;
  }, [activeOrders, search, activeTab]);

  // Smart sections — only when "all" tab is active and no search query
  const sections = useMemo(() => {
    if (activeTab !== "all" || search.trim()) return null;

    const now = Date.now();
    const isStale = (o: WorkOrderDetail) =>
      o.status !== "ready" && (now - new Date(o.received_at).getTime()) > STALE_MS;

    const needsAttention = filtered
      .filter(o => o.status === "ready" || o.status === "awaiting_parts" || isStale(o))
      .sort((a, b) => {
        if (a.status === "ready" && b.status !== "ready") return -1;
        if (b.status === "ready" && a.status !== "ready") return 1;
        return new Date(a.received_at).getTime() - new Date(b.received_at).getTime();
      });

    const attentionIds = new Set(needsAttention.map(o => o.id));
    const inProgress = filtered
      .filter(o => !attentionIds.has(o.id))
      .sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime());

    return { needsAttention, inProgress };
  }, [filtered, activeTab, search]);

  return (
    <AppShell
      title={tenantName}
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(v => v === "list" ? "kanban" : "list")}
            className="w-9 h-9 flex items-center justify-center rounded-xl
                       bg-surface-raised text-slate-400 hover:text-slate-200
                       hover:bg-surface-border transition-colors"
            title={viewMode === "list" ? "Vista kanban" : "Vista lista"}
          >
            {viewMode === "list" ? <IconGrid className="w-4 h-4" /> : <IconList className="w-4 h-4" />}
          </button>
          <button
            onClick={() => navigate("/new")}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-brand
                       hover:bg-brand-hover text-white font-semibold text-sm
                       transition-colors active:scale-95"
          >
            <IconPlus className="w-4 h-4" />
            <span>Nueva OT</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col">

        {/* ── Stats Strip ── */}
        {!isLoading && activeOrders.length > 0 && (
          <div className="grid grid-cols-4 border-b border-surface-border bg-surface">
            <StatTile
              label="Activas"
              value={stats.active}
              sublabel="en taller"
              active={activeTab === "all" && !search}
              onClick={() => { setActiveTab("all"); setSearch(""); }}
            />
            <StatTile
              label="Listas"
              value={stats.ready}
              sublabel="para retirar"
              valueColor={stats.ready > 0 ? "text-green-400" : "text-slate-600"}
              dotColor={stats.ready > 0 ? "bg-green-400" : undefined}
              active={activeTab === "ready"}
              onClick={() => { setActiveTab("ready"); setSearch(""); }}
            />
            <StatTile
              label="Repuestos"
              value={stats.awaitingParts}
              sublabel="en espera"
              valueColor={stats.awaitingParts > 0 ? "text-amber-400" : "text-slate-600"}
              dotColor={stats.awaitingParts > 0 ? "bg-amber-400" : undefined}
              active={activeTab === "awaiting_parts"}
              onClick={() => { setActiveTab("awaiting_parts"); setSearch(""); }}
            />
            <StatTile
              label="Vencidas"
              value={stats.stale}
              sublabel="+8h sin avance"
              valueColor={stats.stale > 0 ? "text-red-400" : "text-slate-600"}
              dotColor={stats.stale > 0 ? "bg-red-400 animate-pulse" : undefined}
            />
          </div>
        )}

        {/* ── Search ── */}
        <div className="px-4 py-3 sticky top-[3.5rem] z-30 bg-surface border-b border-surface-border">
          <div className="relative">
            <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar patente, cliente, OT…"
              className="w-full h-10 bg-surface-card border border-surface-border rounded-xl
                         pl-10 pr-9 text-sm text-slate-100 placeholder-slate-500 font-mono tracking-widest
                         focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent
                         transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <IconX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Status Tabs — only in list mode ── */}
        {viewMode === "list" && (
          <div className="flex overflow-x-auto border-b border-surface-border bg-surface
                          sticky top-[6.5rem] z-20 scrollbar-hide">
            <TabItem
              label="Todas"
              count={activeOrders.length}
              active={activeTab === "all"}
              onClick={() => setActiveTab("all")}
            />
            {KANBAN_COLUMNS
              .filter(s => (counts[s] ?? 0) > 0)
              .map((status) => {
                const cfg = STATUS_CONFIG[status];
                return (
                  <TabItem
                    key={status}
                    label={cfg.shortLabel}
                    count={counts[status] ?? 0}
                    active={activeTab === status}
                    onClick={() => setActiveTab(status)}
                    activeColor={cfg.textColor}
                    activeBorder={cfg.borderColor}
                  />
                );
              })}
          </div>
        )}

        {/* ── Content ── */}
        {isLoading && <LoadingSkeleton />}
        {error     && <ErrorState message={(error as Error).message} />}

        {!isLoading && !error && viewMode === "list" && (
          sections
            ? <SectionedView sections={sections} total={filtered.length} />
            : <FlatList orders={filtered} />
        )}

        {!isLoading && !error && viewMode === "kanban" && (
          <KanbanView orders={activeOrders} search={search} counts={counts} />
        )}
      </div>
    </AppShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatTile({
  label, value, sublabel,
  valueColor = "text-slate-200",
  dotColor,
  onClick, active = false,
}: {
  label: string; value: number; sublabel: string;
  valueColor?: string; dotColor?: string;
  onClick?: () => void; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        flex flex-col items-center justify-center py-3.5 px-1 gap-1
        border-r border-surface-border last:border-r-0
        transition-colors select-none
        ${onClick ? "hover:bg-surface-raised/40 active:scale-[0.97] cursor-pointer" : "cursor-default"}
        ${active ? "bg-surface-raised/50" : ""}
      `}
    >
      <div className="flex items-center gap-1.5">
        {dotColor && (
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
        )}
        <span className={`text-[1.4rem] font-black tabular-nums leading-none ${valueColor}`}>
          {value}
        </span>
      </div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-none">
        {label}
      </span>
      <span className="text-[10px] text-slate-600 leading-none text-center px-1">
        {sublabel}
      </span>
    </button>
  );
}

function TabItem({
  label, count, active, onClick,
  activeColor = "text-brand", activeBorder = "border-brand",
}: {
  label: string; count: number; active: boolean; onClick: () => void;
  activeColor?: string; activeBorder?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-4 py-3 flex-shrink-0 text-xs font-semibold
        transition-colors border-b-2 whitespace-nowrap touch-feedback
        ${active
          ? `${activeColor} ${activeBorder}`
          : "text-slate-500 border-transparent hover:text-slate-400"
        }
      `}
    >
      <span>{label}</span>
      <span className={`
        text-[10px] font-black px-1.5 py-0.5 rounded-md min-w-[1.25rem] text-center
        ${active ? "bg-current/10" : "bg-surface-raised text-slate-600"}
      `}>
        {count}
      </span>
    </button>
  );
}

function SectionHeader({
  label, count, accent = "text-slate-500", dotColor,
}: {
  label: string; count: number; accent?: string; dotColor?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-2">
      {dotColor && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />}
      <span className={`text-[10px] font-bold uppercase tracking-widest ${accent}`}>{label}</span>
      <span className="text-[10px] text-slate-700 font-mono">{count}</span>
      <div className="flex-1 h-px bg-surface-raised/60 ml-1" />
    </div>
  );
}

function SectionedView({
  sections, total,
}: {
  sections: { needsAttention: WorkOrderDetail[]; inProgress: WorkOrderDetail[] };
  total: number;
}) {
  if (total === 0) return <EmptyState />;

  return (
    <div className="flex flex-col pb-6 animate-slide-up">

      {sections.needsAttention.length > 0 && (
        <>
          <SectionHeader
            label="Requieren atención"
            count={sections.needsAttention.length}
            accent="text-amber-500"
            dotColor="bg-amber-400 animate-pulse"
          />
          <div className="flex flex-col gap-2 px-4">
            {sections.needsAttention.map((o) => (
              <WorkOrderCard key={o.id} order={o} highlight />
            ))}
          </div>
        </>
      )}

      {sections.inProgress.length > 0 && (
        <>
          <SectionHeader
            label="En progreso"
            count={sections.inProgress.length}
          />
          <div className="flex flex-col gap-2 px-4">
            {sections.inProgress.map((o) => (
              <WorkOrderCard key={o.id} order={o} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FlatList({ orders }: { orders: WorkOrderDetail[] }) {
  if (orders.length === 0) return <EmptyState />;
  return (
    <div className="flex flex-col gap-2 p-4 animate-slide-up">
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
          (o) => o.status === status &&
            (!search.trim() || o.vehicle_plate.toUpperCase().includes(search.toUpperCase())),
        );
        return (
          <div key={status} className="flex flex-col gap-2 flex-shrink-0 w-72 snap-start">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${cfg.bgColor}`}>
              <span className={`w-2 h-2 rounded-full ${cfg.dotColor} flex-shrink-0`} />
              <span className={`font-semibold text-xs ${cfg.textColor} flex-1 uppercase tracking-wide`}>
                {cfg.shortLabel}
              </span>
              <span className={`font-black text-sm ${cfg.textColor}`}>{counts[status] ?? 0}</span>
            </div>
            <div className="flex flex-col gap-2">
              {colOrders.map((o) => <WorkOrderCard key={o.id} order={o} />)}
              {colOrders.length === 0 && (
                <div className="text-center text-slate-700 text-xs py-6 bg-surface-card/30
                                rounded-xl border border-dashed border-surface-border/60">
                  Sin órdenes
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 gap-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-card border border-surface-border
                      flex items-center justify-center">
        <IconWrench className="w-7 h-7 text-slate-600" />
      </div>
      <div>
        <p className="text-slate-300 font-semibold text-base">Sin órdenes activas</p>
        <p className="text-slate-500 text-sm mt-1">Todo al día por ahora</p>
      </div>
      <button
        onClick={() => navigate("/new")}
        className="flex items-center gap-2 px-5 h-10 rounded-xl bg-brand
                   text-white font-semibold text-sm transition-colors hover:bg-brand-hover"
      >
        <IconPlus className="w-4 h-4" />
        Crear primera orden
      </button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-surface-card rounded-xl h-[5.5rem] animate-pulse border border-surface-border" />
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-red-950/40 border border-red-900/50
                      flex items-center justify-center">
        <IconX className="w-5 h-5 text-red-400" />
      </div>
      <div>
        <p className="text-red-400 font-semibold text-sm">Error al cargar órdenes</p>
        <p className="text-slate-500 text-xs mt-1">{message}</p>
      </div>
    </div>
  );
}
