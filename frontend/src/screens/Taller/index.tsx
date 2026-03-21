import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { workOrdersApi } from "../../api/work-orders.api";
import { WorkOrderDetail, WorkOrderStatus } from "../../types/work-order";
import { ACTIVE_STATUSES, STATUS_CONFIG } from "../../config/status.config";
import { IconChevronRight } from "../../components/ui/Icons";

const STALE_MS = 8 * 3600 * 1000;

type Period = "7d" | "30d" | "3m" | "year";
const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: "7d",   label: "7 días"   },
  { key: "30d",  label: "30 días"  },
  { key: "3m",   label: "3 meses"  },
  { key: "year", label: "Este año" },
];

function periodMs(period: Period): number | null {
  const now = Date.now();
  if (period === "7d")   return now - 7  * 24 * 3600 * 1000;
  if (period === "30d")  return now - 30 * 24 * 3600 * 1000;
  if (period === "3m")   return now - 90 * 24 * 3600 * 1000;
  // "year": desde el 1 ene del año actual
  return new Date(new Date().getFullYear(), 0, 1).getTime();
}

function formatCLP(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `$${Math.round(amount / 1_000)}k`;
  if (amount === 0)        return "—";
  return `$${amount}`;
}

function dayName(): string {
  return new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
  });
}

export function Taller() {
  const navigate = useNavigate();
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

  const stats = useMemo(() => {
    const now       = Date.now();
    const todayStr  = new Date().toDateString();
    const sinceMs   = periodMs(period)!;

    let cobradoHoy    = 0;
    let cobradoPeriodo = 0;

    orders.forEach(o => {
      if (o.paid_at) {
        const t      = new Date(o.paid_at).getTime();
        const amount = Number(o.paid_amount ?? 0);
        if (new Date(o.paid_at).toDateString() === todayStr) cobradoHoy     += amount;
        if (t >= sinceMs)                                    cobradoPeriodo += amount;
      }
    });

    const pendienteCobro  = activeOrders.filter(o => o.payment_status !== "paid").length;
    const stale           = activeOrders.filter(o =>
      o.status !== "ready" && (now - new Date(o.received_at).getTime()) > STALE_MS,
    ).length;
    const listos          = counts.ready          ?? 0;
    const enReparacion    = counts.in_progress    ?? 0;
    const esperandoPartes = counts.awaiting_parts ?? 0;

    return { cobradoHoy, cobradoPeriodo, pendienteCobro, stale, listos, enReparacion, esperandoPartes };
  }, [orders, activeOrders, counts, period]);

  const mechanicStats = useMemo(() => {
    const map: Record<string, number> = {};
    activeOrders.forEach(o => {
      if (o.assigned_user_name) {
        map[o.assigned_user_name] = (map[o.assigned_user_name] ?? 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [activeOrders]);

  const maxMechCount  = mechanicStats[0]?.count ?? 1;
  const totalActive   = activeOrders.length;

  if (isLoading) return <AppShell title="Taller"><LoadingSkeleton /></AppShell>;

  return (
    <AppShell title="Taller">
      <div className="flex flex-col pb-10">

        {/* ── Date header ── */}
        <div className="px-4 pt-5 pb-1">
          <p className="text-xs font-semibold text-slate-500 capitalize">{dayName()}</p>
          <p className="text-xl font-black text-slate-100 mt-0.5">
            Buenos días
            {stats.listos > 0 && (
              <span className="text-green-400"> · {stats.listos} listo{stats.listos > 1 ? "s" : ""} para retirar</span>
            )}
          </p>
        </div>

        {/* ── Facturación ── */}
        <Section label="Facturación">
          {/* Filtro de período */}
          <div className="flex gap-2 mb-3">
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
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon="💰"
              label="Cobrado hoy"
              value={formatCLP(stats.cobradoHoy)}
              valueColor={stats.cobradoHoy > 0 ? "text-green-400" : "text-slate-600"}
              sub={stats.cobradoHoy > 0 ? "del día" : "sin cobros"}
            />
            <MetricCard
              icon="📈"
              label={PERIOD_OPTIONS.find(p => p.key === period)!.label}
              value={formatCLP(stats.cobradoPeriodo)}
              valueColor={stats.cobradoPeriodo > 0 ? "text-brand" : "text-slate-600"}
              sub="acumulado"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <MetricCard
              icon="⏳"
              label="Cobros pendientes"
              value={String(stats.pendienteCobro)}
              valueColor={stats.pendienteCobro > 0 ? "text-amber-400" : "text-slate-600"}
              sub="sin cobrar"
              small
            />
            <MetricCard
              icon="⚠️"
              label="Vencidas +8h"
              value={String(stats.stale)}
              valueColor={stats.stale > 0 ? "text-red-400" : "text-slate-600"}
              sub="sin avance"
              small
            />
          </div>
        </Section>

        {/* ── Resumen operativo ── */}
        <Section label="En el taller ahora">
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              icon="🔧"
              label="En reparación"
              value={String(stats.enReparacion)}
              valueColor={stats.enReparacion > 0 ? "text-orange-400" : "text-slate-600"}
              small
            />
            <MetricCard
              icon="📦"
              label="Esperando repuestos"
              value={String(stats.esperandoPartes)}
              valueColor={stats.esperandoPartes > 0 ? "text-amber-400" : "text-slate-600"}
              small
            />
            <MetricCard
              icon="✅"
              label="Listos"
              value={String(stats.listos)}
              valueColor={stats.listos > 0 ? "text-green-400" : "text-slate-600"}
              small
            />
          </div>
        </Section>

        {/* ── Distribución por estado ── */}
        {totalActive > 0 && (
          <Section label="Distribución por estado">
            <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
              {ACTIVE_STATUSES.map((status, i) => {
                const count = counts[status] ?? 0;
                if (count === 0) return null;
                const cfg = STATUS_CONFIG[status];
                const pct = Math.round((count / totalActive) * 100);
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
                    <span className="text-xs font-bold text-slate-400 tabular-nums w-10 text-right">
                      {count} <span className="text-slate-600 font-normal">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
              {/* Total row */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-surface-border bg-surface-raised/30">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total activas</span>
                <span className="text-sm font-black text-slate-300">{totalActive}</span>
              </div>
            </div>
          </Section>
        )}

        {/* ── Carga por mecánico ── */}
        {mechanicStats.length > 0 && (
          <Section label="Carga por mecánico">
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
          </Section>
        )}

        {/* ── Empty state ── */}
        {totalActive === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 px-8 text-center gap-3">
            <span className="text-4xl">📊</span>
            <p className="text-slate-400 text-sm">Sin órdenes activas.</p>
            <p className="text-slate-600 text-xs">Las estadísticas aparecen cuando hay actividad en el taller.</p>
          </div>
        )}

        {/* ── Acceso rápido ── */}
        <Section label="Acceso rápido">
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
        </Section>

      </div>
    </AppShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 pt-5">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
        {label}
      </h2>
      {children}
    </div>
  );
}

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
      <span className={`font-black tabular-nums leading-none ${valueColor} ${small ? "text-2xl" : "text-3xl"}`}>
        {value}
      </span>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">
        {label}
      </span>
      {sub && <span className="text-[10px] text-slate-600 leading-none">{sub}</span>}
    </div>
  );
}

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

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 pt-6">
      <div className="h-5 w-40 bg-surface-card rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-surface-card rounded-xl animate-pulse border border-surface-border" />
        ))}
      </div>
      <div className="h-4 w-32 bg-surface-card rounded animate-pulse mt-2" />
      <div className="h-40 bg-surface-card rounded-xl animate-pulse border border-surface-border" />
    </div>
  );
}
