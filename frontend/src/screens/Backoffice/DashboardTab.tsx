import { useQuery } from "@tanstack/react-query";
import { backofficeApi, type BackofficeDashboard } from "../../api/backoffice.api";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n);
}

function growthBadge(current: number, previous: number) {
  if (previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up  = pct >= 0;
  return (
    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
      up ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
    }`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, badge, accent,
}: {
  label:   string;
  value:   string | number;
  sub?:    string;
  badge?:  React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 flex flex-col gap-2">
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className={`text-[2rem] font-black leading-none tabular-nums ${accent ?? "text-white"}`}>
          {value}
        </p>
        {badge}
      </div>
      {sub && <p className="text-slate-500 text-xs">{sub}</p>}
    </div>
  );
}

// ── Plan distribution bar ─────────────────────────────────────────────────────

function PlanBar({ data }: { data: BackofficeDashboard }) {
  const total = data.total_tenants || 1;
  const segments = [
    { label: "Active",   value: data.active_tenants,   color: "bg-emerald-500" },
    { label: "Trial",    value: data.trialing_tenants,  color: "bg-orange-400" },
    { label: "Free/Inact", value: data.free_tenants,   color: "bg-slate-600"  },
  ];

  return (
    <div className="bg-[#111827] border border-white/5 rounded-2xl p-5 col-span-full">
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-4">
        Distribución de talleres
      </p>
      {/* Bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        {segments.map((s) => (
          <div
            key={s.label}
            className={`${s.color} transition-all`}
            style={{ width: `${(s.value / total) * 100}%`, minWidth: s.value > 0 ? "4px" : "0" }}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />
            <span className="text-slate-400 text-xs">
              {s.label} <span className="text-white font-bold">{s.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function DashboardTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey:        ["backoffice-dashboard"],
    queryFn:         () => backofficeApi.getDashboard(),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-[#111827] border border-white/5 rounded-2xl p-5 h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-20 text-slate-500">
        Error cargando métricas. Verificá que ADMIN_DATABASE_URL esté configurado correctamente.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="MRR Estimado"
          value={fmtCurrency(data.mrr)}
          sub="Suscripciones activas (sin trial)"
          accent="text-emerald-400"
        />
        <KpiCard
          label="Total Talleres"
          value={data.total_tenants}
          sub={`${data.active_tenants} activos · ${data.trialing_tenants} en trial`}
        />
        <KpiCard
          label="Total Usuarios"
          value={data.total_users}
          sub="Across all tenants"
        />
        <KpiCard
          label="Nuevos este mes"
          value={data.new_tenants_this_month}
          sub={`Mes anterior: ${data.new_tenants_last_month}`}
          badge={growthBadge(data.new_tenants_this_month, data.new_tenants_last_month)}
        />
      </div>

      {/* Plan distribution */}
      <div className="grid grid-cols-1">
        <PlanBar data={data} />
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          label="En Trial"
          value={data.trialing_tenants}
          accent="text-orange-400"
        />
        <KpiCard
          label="Activos (pagos)"
          value={data.active_tenants}
          accent="text-emerald-400"
        />
        <KpiCard
          label="Inactivos / Free"
          value={data.free_tenants}
          accent="text-slate-400"
        />
      </div>
    </div>
  );
}
