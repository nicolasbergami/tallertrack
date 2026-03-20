import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { workOrdersApi } from "../../api/work-orders.api";
import { getStatusConfig, ACTIVE_STATUSES } from "../../config/status.config";
import { IconSearch, IconX } from "../../components/ui/Icons";
import { WorkOrderDetail, WorkOrderStatus } from "../../types/work-order";
import { PlateVisual } from "../../components/ui/PlateVisual";

export function History() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["work-orders-all"],
    queryFn:  () => workOrdersApi.list({ limit: 200 }),
    staleTime: 30_000,
  });

  const allOrders = useMemo(
    () => [...(data?.data ?? [])].sort(
      (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    ),
    [data],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return allOrders;
    return allOrders.filter((o) =>
      o.vehicle_plate.toUpperCase().includes(q) ||
      (o.client_name   ?? "").toUpperCase().includes(q) ||
      (o.order_number  ?? "").toUpperCase().includes(q) ||
      (o.vehicle_brand ?? "").toUpperCase().includes(q) ||
      (o.vehicle_model ?? "").toUpperCase().includes(q),
    );
  }, [allOrders, search]);

  // Group visible orders by month for sectioned display
  const grouped = useMemo(() => {
    const map = new Map<string, WorkOrderDetail[]>();
    for (const o of filtered) {
      const key = new Date(o.received_at).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return map;
  }, [filtered]);

  return (
    <AppShell title="Historial">
      <div className="flex flex-col">

        {/* ── Search bar ── */}
        <div className="px-4 py-3 sticky top-[3.5rem] z-30 bg-surface/95 backdrop-blur border-b border-surface-border">
          <div className="relative">
            <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar patente, cliente, marca, OT…"
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
          <p className="text-[11px] text-slate-600 mt-1.5">
            {data?.total ?? 0} órdenes en total
            {search ? ` · ${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}` : ""}
          </p>
        </div>

        {/* ── Loading skeletons ── */}
        {isLoading && (
          <div className="flex flex-col gap-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-surface-card rounded-xl animate-pulse border border-surface-border" />
            ))}
          </div>
        )}

        {/* ── Empty ── */}
        {!isLoading && allOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <p className="text-slate-300 font-semibold">Sin historial aún</p>
              <p className="text-slate-500 text-sm mt-1">Las órdenes creadas aparecerán aquí</p>
            </div>
          </div>
        )}

        {/* ── No search results ── */}
        {!isLoading && allOrders.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-8 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center">
              <IconSearch className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-slate-400 font-semibold text-sm">Sin resultados para "{search}"</p>
              <button
                onClick={() => setSearch("")}
                className="text-brand text-xs mt-1 hover:underline"
              >
                Limpiar búsqueda
              </button>
            </div>
          </div>
        )}

        {/* ── Grouped order list ── */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex flex-col pb-6 animate-slide-up">
            {Array.from(grouped.entries()).map(([month, orders]) => (
              <div key={month}>
                {/* Month header */}
                <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 capitalize">
                    {month}
                  </span>
                  <span className="text-[10px] text-slate-700 font-mono">{orders.length}</span>
                  <div className="flex-1 h-px bg-surface-raised/60 ml-1" />
                </div>

                {/* Orders */}
                <div className="flex flex-col px-4 gap-0">
                  {orders.map((order) => (
                    <HistoryRow key={order.id} order={order} search={search} onPress={() => navigate(`/orders/${order.id}`)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Live badge — pulses if the state is active ───────────────────────────────

function LiveBadge({ status }: { status: WorkOrderStatus }) {
  const cfg    = getStatusConfig(status);
  const isLive = (ACTIVE_STATUSES as string[]).includes(status);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border
                  text-[10px] font-bold whitespace-nowrap flex-shrink-0
                  ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotColor}
                    ${isLive ? "animate-pulse" : ""}`}
      />
      {cfg.shortLabel}
    </span>
  );
}

// ── Row component ─────────────────────────────────────────────────────────────

function HistoryRow({
  order, search, onPress,
}: {
  order: WorkOrderDetail;
  search: string;
  onPress: () => void;
}) {
  const date = new Date(order.received_at);

  return (
    <button
      onClick={onPress}
      className="flex items-center gap-3 py-2.5 px-2 -mx-2 border-b border-surface-border/40
                 last:border-b-0 text-left rounded-xl transition-all
                 hover:bg-surface-card/60 active:scale-[0.99] touch-feedback"
    >
      {/* Date column */}
      <div className="flex-shrink-0 w-8 text-center">
        <p className="text-base font-black text-slate-300 leading-none">{date.getDate()}</p>
        <p className="text-[10px] text-slate-600 uppercase tracking-wide">
          {date.toLocaleDateString("es-AR", { month: "short" })}
        </p>
      </div>

      {/* Divider */}
      <div className="w-px h-10 bg-surface-border/60 flex-shrink-0" />

      {/* Plate visual */}
      <PlateVisual plate={order.vehicle_plate} size="sm" />

      {/* Info: vehicle / client / OT */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <p className="text-sm font-bold text-slate-200 truncate leading-snug">
          <Highlight text={`${order.vehicle_brand} ${order.vehicle_model}`} query={search} />
        </p>
        <p className="text-xs text-slate-400 truncate leading-snug">
          {order.client_name
            ? <Highlight text={order.client_name} query={search} />
            : <span className="text-slate-600">Sin cliente</span>}
        </p>
        <p className="font-mono text-[10px] text-slate-600 leading-snug">
          <Highlight text={order.order_number ?? ""} query={search} />
        </p>
      </div>

      {/* Status badge */}
      <LiveBadge status={order.status} />
    </button>
  );
}

// ── Search highlight helper ───────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;

  const q = query.trim().toUpperCase();
  const idx = text.toUpperCase().indexOf(q);
  if (idx === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-brand/20 text-brand rounded px-0.5 not-italic font-semibold">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
