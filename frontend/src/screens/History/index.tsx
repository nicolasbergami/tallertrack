import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { workOrdersApi } from "../../api/work-orders.api";
import { getStatusConfig, ACTIVE_STATUSES } from "../../config/status.config";
import { IconSearch, IconX } from "../../components/ui/Icons";
import { WorkOrderDetail, WorkOrderStatus } from "../../types/work-order";
import { PlateVisual } from "../../components/ui/PlateVisual";

type StatusFilter = "all" | "active" | "delivered" | "cancelled";

// ─────────────────────────────────────────────────────────────────────────────

export function History() {
  const navigate = useNavigate();
  const [search,         setSearch]         = useState("");
  const [mechanicFilter, setMechanicFilter] = useState<string | null>(null);
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>("all");

  const { data, isLoading } = useQuery({
    queryKey:  ["work-orders-all"],
    queryFn:   () => workOrdersApi.list({ limit: 500 }),
    staleTime: 30_000,
  });

  const allOrders = useMemo(
    () => [...(data?.data ?? [])].sort(
      (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime(),
    ),
    [data],
  );

  // ── Derived stats (from all orders, before any filter) ──────────────────
  const stats = useMemo(() => ({
    total:     allOrders.length,
    active:    allOrders.filter((o) => (ACTIVE_STATUSES as string[]).includes(o.status)).length,
    delivered: allOrders.filter((o) => o.status === "delivered").length,
    cancelled: allOrders.filter((o) => o.status === "cancelled").length,
  }), [allOrders]);

  // ── Unique mechanics ─────────────────────────────────────────────────────
  const mechanics = useMemo(() => {
    const names = new Set<string>();
    allOrders.forEach((o) => { if (o.assigned_user_name) names.add(o.assigned_user_name); });
    return Array.from(names).sort();
  }, [allOrders]);

  // ── Filtered list (all filters combined) ────────────────────────────────
  const filtered = useMemo(() => {
    let list = allOrders;

    // Status tab
    if (statusFilter === "active")    list = list.filter((o) => (ACTIVE_STATUSES as string[]).includes(o.status));
    else if (statusFilter === "delivered") list = list.filter((o) => o.status === "delivered");
    else if (statusFilter === "cancelled") list = list.filter((o) => o.status === "cancelled");

    // Mechanic chip
    if (mechanicFilter) list = list.filter((o) => o.assigned_user_name === mechanicFilter);

    // Text search
    const q = search.trim().toUpperCase();
    if (q) {
      list = list.filter((o) =>
        o.vehicle_plate.toUpperCase().includes(q) ||
        (o.client_name        ?? "").toUpperCase().includes(q) ||
        (o.order_number       ?? "").toUpperCase().includes(q) ||
        (o.vehicle_brand      ?? "").toUpperCase().includes(q) ||
        (o.vehicle_model      ?? "").toUpperCase().includes(q) ||
        (o.assigned_user_name ?? "").toUpperCase().includes(q),
      );
    }

    return list;
  }, [allOrders, search, mechanicFilter, statusFilter]);

  // ── Group by month ───────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, WorkOrderDetail[]>();
    for (const o of filtered) {
      const key = new Date(o.received_at).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return map;
  }, [filtered]);

  const hasFilters = !!(search || mechanicFilter || statusFilter !== "all");

  return (
    <AppShell title="Historial">
      <div className="flex flex-col">

        {/* ── Sticky: search + mechanic chips ── */}
        <div className="sticky top-[3.5rem] z-30 bg-surface/95 backdrop-blur border-b border-surface-border">
          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Patente, cliente, mecánico, OT…"
                className="w-full h-10 bg-surface-card border border-surface-border rounded-xl
                           pl-10 pr-9 text-sm text-slate-100 placeholder-slate-500
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

          {/* Mechanic chips */}
          {mechanics.length > 0 && (
            <div className="flex overflow-x-auto gap-2 px-4 pb-3 scrollbar-hide">
              <MechanicChip label="Todos" active={mechanicFilter === null} onClick={() => setMechanicFilter(null)} />
              {mechanics.map((name) => (
                <MechanicChip
                  key={name}
                  label={name}
                  active={mechanicFilter === name}
                  onClick={() => setMechanicFilter(mechanicFilter === name ? null : name)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Loading skeletons ── */}
        {isLoading && <LoadingSkeleton />}

        {/* ── Content ── */}
        {!isLoading && (
          <>
            {/* Stats strip */}
            {allOrders.length > 0 && (
              <div className="grid grid-cols-4 border-b border-surface-border">
                <StatTile
                  value={stats.total}
                  label="Total"
                  active={statusFilter === "all"}
                  onClick={() => setStatusFilter("all")}
                />
                <StatTile
                  value={stats.active}
                  label="En taller"
                  valueColor={stats.active > 0 ? "text-amber-400" : "text-slate-600"}
                  dotColor={stats.active > 0 ? "bg-amber-400" : undefined}
                  active={statusFilter === "active"}
                  onClick={() => setStatusFilter("active")}
                />
                <StatTile
                  value={stats.delivered}
                  label="Entregadas"
                  valueColor={stats.delivered > 0 ? "text-green-400" : "text-slate-600"}
                  dotColor={stats.delivered > 0 ? "bg-green-400" : undefined}
                  active={statusFilter === "delivered"}
                  onClick={() => setStatusFilter("delivered")}
                />
                <StatTile
                  value={stats.cancelled}
                  label="Canceladas"
                  valueColor={stats.cancelled > 0 ? "text-slate-400" : "text-slate-600"}
                  active={statusFilter === "cancelled"}
                  onClick={() => setStatusFilter("cancelled")}
                />
              </div>
            )}

            {/* Result count / active filters */}
            {allOrders.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-surface-border/50">
                <p className="text-[11px] text-slate-600">
                  {hasFilters
                    ? `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""} de ${allOrders.length}`
                    : `${allOrders.length} orden${allOrders.length !== 1 ? "es" : ""} en total`}
                </p>
                {hasFilters && (
                  <button
                    onClick={() => { setSearch(""); setMechanicFilter(null); setStatusFilter("all"); }}
                    className="text-[11px] text-brand hover:underline"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}

            {/* Empty: no orders at all */}
            {allOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center">
                  <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div>
                  <p className="text-slate-300 font-semibold">Sin historial aún</p>
                  <p className="text-slate-500 text-sm mt-1">Las órdenes de trabajo aparecerán aquí</p>
                </div>
              </div>
            )}

            {/* Empty: filters returned nothing */}
            {allOrders.length > 0 && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-8 animate-fade-in">
                <div className="w-12 h-12 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center">
                  <IconSearch className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-slate-400 font-semibold text-sm">Sin resultados</p>
                  <p className="text-slate-500 text-xs mt-0.5">Probá cambiando los filtros activos</p>
                </div>
              </div>
            )}

            {/* Grouped list */}
            {filtered.length > 0 && (
              <div className="flex flex-col pb-8 animate-slide-up">
                {Array.from(grouped.entries()).map(([month, orders]) => (
                  <MonthSection
                    key={month}
                    month={month}
                    orders={orders}
                    search={search}
                    onPress={(id) => navigate(`/orders/${id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

// ── Stats tile (tappable to filter by status) ─────────────────────────────

function StatTile({
  value, label, valueColor = "text-slate-200",
  dotColor, active, onClick,
}: {
  value: number; label: string;
  valueColor?: string; dotColor?: string;
  active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-3.5 px-1 gap-0.5
                  border-r border-surface-border last:border-r-0 transition-colors select-none
                  ${active ? "bg-surface-raised/60" : "hover:bg-surface-raised/30"}
                  active:scale-[0.97]`}
    >
      <div className="flex items-center gap-1.5">
        {dotColor && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />}
        <span className={`text-[1.4rem] font-black tabular-nums leading-none ${valueColor}`}>
          {value}
        </span>
      </div>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-none mt-0.5">
        {label}
      </span>
    </button>
  );
}

// ── Month section ─────────────────────────────────────────────────────────

function MonthSection({
  month, orders, search, onPress,
}: {
  month: string;
  orders: WorkOrderDetail[];
  search: string;
  onPress: (id: string) => void;
}) {
  const delivered  = orders.filter((o) => o.status === "delivered").length;
  const cancelled  = orders.filter((o) => o.status === "cancelled").length;
  const inProgress = orders.length - delivered - cancelled;

  return (
    <div>
      {/* Month header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 capitalize whitespace-nowrap">
          {month}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-mono text-slate-600 bg-surface-raised px-1.5 py-0.5 rounded-md">
            {orders.length}
          </span>
          {delivered > 0 && (
            <span className="text-[10px] text-green-600 font-semibold">
              {delivered} ✓
            </span>
          )}
          {inProgress > 0 && (
            <span className="text-[10px] text-amber-600 font-semibold">
              {inProgress} activas
            </span>
          )}
        </div>
        <div className="flex-1 h-px bg-surface-raised/60" />
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 px-4">
        {orders.map((order) => (
          <HistoryCard
            key={order.id}
            order={order}
            search={search}
            onPress={() => onPress(order.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ── History card ─────────────────────────────────────────────────────────────

function HistoryCard({
  order, search, onPress,
}: {
  order: WorkOrderDetail;
  search: string;
  onPress: () => void;
}) {
  const cfg  = getStatusConfig(order.status);
  const date = new Date(order.received_at);
  const dayLabel = date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });

  const isLive = (ACTIVE_STATUSES as string[]).includes(order.status);

  return (
    <button
      onClick={onPress}
      className={`w-full text-left rounded-xl overflow-hidden border border-surface-border
                  border-l-[3px] ${cfg.borderColor}
                  bg-surface-card hover:bg-surface-raised
                  transition-all active:scale-[0.99] touch-feedback`}
    >
      <div className="flex items-center gap-3 px-3 pt-3 pb-2.5">

        {/* Plate */}
        <PlateVisual plate={order.vehicle_plate} size="sm" />

        {/* Main info */}
        <div className="flex-1 min-w-0">

          {/* Row 1: vehicle + badge */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-slate-200 truncate leading-snug">
              <Highlight text={`${order.vehicle_brand} ${order.vehicle_model}`} query={search} />
            </p>
            {/* Status badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border flex-shrink-0
                              text-[10px] font-bold ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotColor} ${isLive ? "animate-pulse" : ""}`} />
              {cfg.shortLabel}
            </span>
          </div>

          {/* Row 2: client */}
          <p className="text-xs text-slate-400 truncate leading-snug mt-0.5">
            {order.client_name
              ? <Highlight text={order.client_name} query={search} />
              : <span className="text-slate-600 italic">Sin cliente</span>}
          </p>

          {/* Row 3: meta info */}
          <div className="flex items-center justify-between mt-1.5 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mechanic */}
              {order.assigned_user_name && (
                <span className="flex items-center gap-1 text-[10px] text-slate-500 flex-shrink-0">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <Highlight
                    text={order.assigned_user_name.split(" ")[0]}
                    query={search}
                  />
                </span>
              )}
              {/* OT number */}
              <span className="font-mono text-[10px] text-slate-700 truncate">
                <Highlight text={order.order_number ?? ""} query={search} />
              </span>
            </div>

            {/* Right: date */}
            <span className="text-[10px] text-slate-600 flex-shrink-0">{dayLabel}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Search highlight ──────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const q   = query.trim().toUpperCase();
  const idx = text.toUpperCase().indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-brand/25 text-brand rounded px-0.5 not-italic font-semibold">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

// ── Mechanic filter chip ──────────────────────────────────────────────────────

function MechanicChip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  const initials = label === "Todos"
    ? null
    : label.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                  flex-shrink-0 transition-all active:scale-95
                  ${active
                    ? "bg-brand text-white"
                    : "bg-surface-card border border-surface-border text-slate-400 hover:border-slate-500 hover:text-slate-300"
                  }`}
    >
      {initials && (
        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black
                          ${active ? "bg-white/20" : "bg-surface-raised"}`}>
          {initials}
        </span>
      )}
      {label}
    </button>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4 pt-3">
      {/* Stats strip skeleton */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 bg-surface-card rounded-xl animate-pulse border border-surface-border" />
        ))}
      </div>
      {/* Card skeletons */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-[4.5rem] bg-surface-card rounded-xl animate-pulse border border-surface-border border-l-[3px] border-l-slate-700" />
      ))}
    </div>
  );
}
