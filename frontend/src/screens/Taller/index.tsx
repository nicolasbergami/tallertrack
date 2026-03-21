import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { workOrdersApi } from "../../api/work-orders.api";
import { WorkOrderDetail, WorkOrderStatus } from "../../types/work-order";
import { ACTIVE_STATUSES, STATUS_CONFIG, formatElapsed } from "../../config/status.config";
import { IconChevronRight } from "../../components/ui/Icons";

const STALE_MS = 8 * 3600 * 1000;

// ── Period selector ────────────────────────────────────────────────────────

type Period = "7d" | "30d" | "3m" | "year";

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: "7d",   label: "7 días"   },
  { key: "30d",  label: "30 días"  },
  { key: "3m",   label: "3 meses"  },
  { key: "year", label: "Este año" },
];

function periodSince(period: Period): number {
  if (period === "7d")   return Date.now() - 7  * 24 * 3600 * 1000;
  if (period === "30d")  return Date.now() - 30 * 24 * 3600 * 1000;
  if (period === "3m")   return Date.now() - 90 * 24 * 3600 * 1000;
  return new Date(new Date().getFullYear(), 0, 1).getTime();
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCLP(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `$${Math.round(amount / 1_000)}k`;
  if (amount === 0)        return "—";
  return `$${amount}`;
}

function dayGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function dayName(): string {
  return new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
  });
}

// ── Screen ─────────────────────────────────────────────────────────────────

export function Taller() {
  const navigate       = useNavigate();
  const [period, setPeriod] = useState<Period>("7d");

  const { data, isLoading } = useQuery({
    queryKey:        ["work-orders-all"],
    queryFn:         () => workOrdersApi.list({ limit: 200 }),
    refetchInterval: 60_000,
    staleTime:       30_000,
  });

  const orders: WorkOrderDetail[] = data?.data ?? [];

  const activeOrders = useMemo(
    () => orders.filter(o => ACTIVE_STATUSES.includes(o.status)),
    [orders],
  );

  const counts = useMemo(() => {
    const map: Partial<Record<WorkOrderStatus, number>> = {};
    activeOrders.forEach(o => { map[o.status] = (map[o.status] ?? 0) + 1; });
    return map;
  }, [activeOrders]);

  // Billing stats (react to period selector)
  const billing = useMemo(() => {
    const todayStr = new Date().toDateString();
    const sinceMs  = periodSince(period);

    let cobradoHoy     = 0;
    let cobradoPeriodo = 0;
    let paidCount      = 0;

    orders.forEach(o => {
      if (o.paid_at) {
        const t      = new Date(o.paid_at).getTime();
        const amount = Number(o.paid_amount ?? 0);
        if (new Date(o.paid_at).toDateString() === todayStr) cobradoHoy     += amount;
        if (t >= sinceMs) { cobradoPeriodo += amount; paidCount++; }
      }
    });

    const pendienteCobro = activeOrders.filter(o => o.payment_status !== "paid").length;
    const ticketPromedio = paidCount > 0 ? Math.round(cobradoPeriodo / paidCount) : 0;

    return { cobradoHoy, cobradoPeriodo, pendienteCobro, ticketPromedio, paidCount };
  }, [orders, activeOrders, period]);

  // Operational snapshot
  const ops = useMemo(() => ({
    total:          activeOrders.length,
    listos:         counts.ready          ?? 0,
    enReparacion:   counts.in_progress    ?? 0,
    repuestos:      counts.awaiting_parts ?? 0,
    diagnosing:     counts.diagnosing     ?? 0,
  }), [activeOrders, counts]);

  // Stale orders (8h+ without progress) — used in Alertas
  const staleOrders = useMemo(() => {
    const now = Date.now();
    return activeOrders
      .filter(o =>
        o.status !== "ready" &&
        (now - new Date(o.received_at).getTime()) > STALE_MS,
      )
      .sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime());
  }, [activeOrders]);

  // Mechanics
  const mechanicStats = useMemo(() => {
    const map: Record<string, number> = {};
    activeOrders.forEach(o => {
      if (o.assigned_user_name) map[o.assigned_user_name] = (map[o.assigned_user_name] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeOrders]);

  const maxMechCount = mechanicStats[0]?.count ?? 1;
  const periodLabel  = PERIOD_OPTIONS.find(p => p.key === period)!.label;

  if (isLoading) return <AppShell title="Taller"><LoadingSkeleton /></AppShell>;

  return (
    <AppShell title="Taller">
      <div className="pb-10">

        {/* ── Date / greeting header ── */}
        <div className="px-4 pt-5 pb-2 lg:px-6">
          <p className="text-xs font-semibold text-slate-500 capitalize">{dayName()}</p>
          <p className="text-xl font-black text-slate-100 mt-0.5">
            {dayGreeting()}
            {ops.listos > 0 && (
              <span className="text-green-400">
                {" "}· {ops.listos} listo{ops.listos > 1 ? "s" : ""} para retirar
              </span>
            )}
            {staleOrders.length > 0 && ops.listos === 0 && (
              <span className="text-red-400">
                {" "}· {staleOrders.length} auto{staleOrders.length > 1 ? "s" : ""} sin avance
              </span>
            )}
          </p>
        </div>

        {/* ── Two-column layout (lg+) ── */}
        <div className="flex flex-col lg:grid lg:grid-cols-[3fr_2fr] lg:gap-6 lg:px-6 lg:pt-2 lg:items-start">

          {/* ── LEFT COLUMN: Facturación + Distribución ── */}
          <div className="flex flex-col">

            {/* ── Facturación ── */}
            <InnerSection label="Facturación">
              {/* Period selector */}
              <div className="flex gap-2 mb-3 flex-wrap">
                {PERIOD_OPTIONS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setPeriod(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                      ${period === key
                        ? "bg-brand text-white"
                        : "bg-surface-card border border-surface-border text-slate-400 hover:text-slate-200"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* 2×2 metric grid */}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  icon="💰"
                  label="Cobrado hoy"
                  value={formatCLP(billing.cobradoHoy)}
                  valueColor={billing.cobradoHoy > 0 ? "text-green-400" : "text-slate-600"}
                  sub={billing.cobradoHoy > 0 ? "del día" : "sin cobros aún"}
                />
                <MetricCard
                  icon="📈"
                  label={periodLabel}
                  value={formatCLP(billing.cobradoPeriodo)}
                  valueColor={billing.cobradoPeriodo > 0 ? "text-brand" : "text-slate-600"}
                  sub={`${billing.paidCount} cobro${billing.paidCount !== 1 ? "s" : ""}`}
                />
                <MetricCard
                  icon="⏳"
                  label="Cobros pendientes"
                  value={String(billing.pendienteCobro)}
                  valueColor={billing.pendienteCobro > 0 ? "text-amber-400" : "text-slate-600"}
                  sub="sin cobrar"
                  small
                />
                <MetricCard
                  icon="🎫"
                  label={`Ticket promedio ${periodLabel.toLowerCase()}`}
                  value={formatCLP(billing.ticketPromedio)}
                  valueColor={billing.ticketPromedio > 0 ? "text-sky-400" : "text-slate-600"}
                  sub={billing.paidCount > 0 ? "por orden" : "sin datos"}
                  small
                />
              </div>
            </InnerSection>

            {/* ── Distribución por estado ── */}
            {ops.total > 0 && (
              <InnerSection label="Distribución por estado">
                <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
                  {ACTIVE_STATUSES.map((status, i) => {
                    const count = counts[status] ?? 0;
                    if (count === 0) return null;
                    const cfg = STATUS_CONFIG[status];
                    const pct = Math.round((count / ops.total) * 100);
                    return (
                      <div
                        key={status}
                        className={`flex items-center gap-3 px-4 py-3
                          ${i > 0 ? "border-t border-surface-border/50" : ""}`}
                      >
                        <div className="flex items-center gap-2 w-28 flex-shrink-0">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
                          <span className={`text-xs font-semibold ${cfg.textColor}`}>{cfg.shortLabel}</span>
                        </div>
                        <div className="flex-1 h-2 bg-surface-raised rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cfg.dotColor} opacity-70`}
                            style={{ width: `${Math.max(pct, 4)}%`, transition: "width 0.6s ease" }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-400 tabular-nums w-14 text-right">
                          {count}{" "}
                          <span className="text-slate-600 font-normal">({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-surface-border bg-surface-raised/30">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Total activas
                    </span>
                    <span className="text-sm font-black text-slate-300">{ops.total}</span>
                  </div>
                </div>
              </InnerSection>
            )}
          </div>

          {/* ── RIGHT COLUMN: Operativo + Alertas + Mecánicos ── */}
          <div className="flex flex-col">

            {/* ── En el taller ahora ── */}
            <InnerSection label="En el taller ahora">
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  icon="🔧"
                  label="En reparación"
                  value={String(ops.enReparacion)}
                  valueColor={ops.enReparacion > 0 ? "text-orange-400" : "text-slate-600"}
                  small
                />
                <MetricCard
                  icon="📦"
                  label="Repuestos"
                  value={String(ops.repuestos)}
                  valueColor={ops.repuestos > 0 ? "text-amber-400" : "text-slate-600"}
                  small
                />
                <MetricCard
                  icon="✅"
                  label="Listos"
                  value={String(ops.listos)}
                  valueColor={ops.listos > 0 ? "text-green-400" : "text-slate-600"}
                  small
                />
                <MetricCard
                  icon="🔍"
                  label="Diagnóstico"
                  value={String(ops.diagnosing)}
                  valueColor={ops.diagnosing > 0 ? "text-sky-400" : "text-slate-600"}
                  small
                />
              </div>
            </InnerSection>

            {/* ── 🚨 Alertas Operativas ── */}
            <InnerSection label="🚨 Alertas Operativas">
              {staleOrders.length > 0 ? (
                <div className="rounded-xl border border-red-900/50 bg-red-950/20 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-red-900/40 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                      Vencidas +8h sin avance
                    </span>
                    <span className="text-xs font-black text-red-400 bg-red-950/60 px-2 py-0.5 rounded-full">
                      {staleOrders.length}
                    </span>
                  </div>
                  {staleOrders.map((o, i) => {
                    const cfg = STATUS_CONFIG[o.status];
                    return (
                      <div
                        key={o.id}
                        className={`flex items-center justify-between px-4 py-3
                          ${i > 0 ? "border-t border-red-900/30" : ""}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-black text-red-200 font-mono tracking-wider leading-none">
                              {o.vehicle_plate}
                            </p>
                            <p className="text-[10px] text-red-400/70 mt-0.5">
                              {o.client_name ?? "Sin cliente"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 flex-shrink-0 ml-2">
                          <span className={`text-[10px] font-semibold ${cfg.textColor}`}>
                            {cfg.shortLabel}
                          </span>
                          <span className="text-[10px] text-red-400/60 tabular-nums">
                            {formatElapsed(o.received_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-green-900/40 bg-green-950/20 px-4 py-4
                                flex items-center gap-3">
                  <span className="text-xl flex-shrink-0">✅</span>
                  <div>
                    <p className="text-sm font-semibold text-green-300">Todo al día</p>
                    <p className="text-xs text-green-700 mt-0.5">
                      Ningún auto con más de 8h sin avance
                    </p>
                  </div>
                </div>
              )}
            </InnerSection>

            {/* ── Carga por mecánico ── */}
            {mechanicStats.length > 0 && (
              <InnerSection label="Carga por mecánico">
                <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
                  {mechanicStats.map(({ name, count }, i) => {
                    const pct      = Math.round((count / maxMechCount) * 100);
                    const initials = name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
                    return (
                      <div
                        key={name}
                        className={`flex items-center gap-3 px-4 py-3
                          ${i > 0 ? "border-t border-surface-border/50" : ""}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-surface-raised border border-surface-border
                                        flex items-center justify-center text-[11px] font-black text-slate-400
                                        flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-slate-300 truncate">{name}</span>
                            <span className="text-xs text-slate-500 tabular-nums flex-shrink-0 ml-2">
                              {count} OT{count !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand/60"
                              style={{ width: `${pct}%`, transition: "width 0.6s ease" }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </InnerSection>
            )}
          </div>
        </div>

        {/* ── Empty state ── */}
        {ops.total === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 px-8 text-center gap-3">
            <span className="text-4xl">📊</span>
            <p className="text-slate-400 text-sm">Sin órdenes activas.</p>
            <p className="text-slate-600 text-xs">
              Las estadísticas aparecen cuando hay actividad en el taller.
            </p>
          </div>
        )}

        {/* ── Acceso rápido (full width) ── */}
        <div className="px-4 pt-6 lg:px-6">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
            Acceso rápido
          </h2>
          <div className="flex flex-col gap-2">
            <QuickLink
              icon="🕐"
              label="Historial de órdenes"
              sub="Órdenes entregadas y canceladas"
              onClick={() => navigate("/history")}
            />
            <QuickLink
              icon="💳"
              label="Facturación"
              sub="Gestión de cobros y pagos"
              onClick={() => navigate("/billing")}
            />
            <QuickLink
              icon="👥"
              label="Equipo"
              sub="Mecánicos asignados"
              onClick={() => navigate("/team")}
            />
          </div>
        </div>

      </div>
    </AppShell>
  );
}

// ── Layout helpers ─────────────────────────────────────────────────────────

/**
 * Section used *inside* the two-column grid — adds px-4 on mobile,
 * relies on the grid container's lg:px-6 on desktop.
 */
function InnerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 pt-5 lg:px-0">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
        {label}
      </h2>
      {children}
    </div>
  );
}

// ── Metric card ────────────────────────────────────────────────────────────

function MetricCard({
  icon, label, value, valueColor = "text-slate-300", sub, small = false,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 bg-surface-card border border-surface-border rounded-xl p-4">
      <span className={small ? "text-base" : "text-xl"}>{icon}</span>
      <span
        className={`font-black tabular-nums leading-none ${valueColor}
          ${small ? "text-2xl" : "text-3xl"}`}
      >
        {value}
      </span>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">
        {label}
      </span>
      {sub && <span className="text-[10px] text-slate-600 leading-none">{sub}</span>}
    </div>
  );
}

// ── Quick link row ─────────────────────────────────────────────────────────

function QuickLink({
  icon, label, sub, onClick,
}: {
  icon: string; label: string; sub: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl
                 bg-surface-card border border-surface-border
                 hover:bg-surface-raised transition-colors text-left active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-sm font-semibold text-slate-200">{label}</p>
          <p className="text-xs text-slate-500">{sub}</p>
        </div>
      </div>
      <IconChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
    </button>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 pt-6 lg:grid lg:grid-cols-[3fr_2fr] lg:gap-6 lg:px-6">
      <div className="flex flex-col gap-4">
        <div className="h-4 w-32 bg-surface-card rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-surface-card rounded-xl animate-pulse border border-surface-border" />
          ))}
        </div>
        <div className="h-4 w-40 bg-surface-card rounded animate-pulse mt-2" />
        <div className="h-40 bg-surface-card rounded-xl animate-pulse border border-surface-border" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-4 w-32 bg-surface-card rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-surface-card rounded-xl animate-pulse border border-surface-border" />
          ))}
        </div>
        <div className="h-4 w-28 bg-surface-card rounded animate-pulse mt-2" />
        <div className="h-20 bg-surface-card rounded-xl animate-pulse border border-surface-border" />
      </div>
    </div>
  );
}
