import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Users, Wrench, Calendar, ChevronLeft, ChevronRight, Pencil, Building2 } from "lucide-react";
import { backofficeApi, type BackofficeTenant } from "../../api/backoffice.api";

// ── Constants ─────────────────────────────────────────────────────────────────

const PLANS = ["starter", "professional", "enterprise"] as const;
const STATUSES = ["active", "trialing", "inactive", "cancelled", "past_due"] as const;

const PLAN_LABELS: Record<string, string> = {
  free:         "Free",
  starter:      "Independiente",
  professional: "Taller Pro",
  enterprise:   "Platinum",
};

const STATUS_LABELS: Record<string, string> = {
  active:    "Activo",
  trialing:  "En Trial",
  inactive:  "Inactivo",
  cancelled: "Cancelado",
  past_due:  "Vencido",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Avatar with initials ───────────────────────────────────────────────────────

function TenantAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  // Deterministic color from name hash
  const colors = [
    ["#1D4ED8", "#3B82F6"], // blue
    ["#7C3AED", "#8B5CF6"], // violet
    ["#0F766E", "#14B8A6"], // teal
    ["#B45309", "#F59E0B"], // amber
    ["#9D174D", "#EC4899"], // pink
    ["#065F46", "#10B981"], // emerald
  ];
  const idx = name.charCodeAt(0) % colors.length;
  const [from, to] = colors[idx];

  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                 text-white text-xs font-black select-none"
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      {initials || "?"}
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
    active:    { label: "Activo",    dot: "bg-emerald-400", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    trialing:  { label: "En Trial",  dot: "bg-amber-400",   bg: "bg-amber-500/10",  text: "text-amber-400",   border: "border-amber-500/20"   },
    inactive:  { label: "Inactivo",  dot: "bg-slate-500",   bg: "bg-slate-700/30",  text: "text-slate-500",   border: "border-slate-600/30"   },
    cancelled: { label: "Cancelado", dot: "bg-red-500",     bg: "bg-red-500/10",    text: "text-red-400",     border: "border-red-500/20"     },
    past_due:  { label: "Vencido",   dot: "bg-yellow-500",  bg: "bg-yellow-500/10", text: "text-yellow-400",  border: "border-yellow-500/20"  },
  };
  const s = cfg[status] ?? cfg.inactive;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                      text-[11px] font-semibold border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ── Plan badge ────────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "enterprise") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full
                   text-[11px] font-bold border border-violet-400/30 text-violet-200"
        style={{
          background: "linear-gradient(135deg, rgba(109,40,217,0.25) 0%, rgba(139,92,246,0.15) 100%)",
          boxShadow: "0 0 10px rgba(139,92,246,0.15)",
        }}
      >
        <span className="text-[10px]">💎</span> Platinum
      </span>
    );
  }
  const cfg: Record<string, { label: string; style: string }> = {
    free:         { label: "Free",          style: "bg-slate-700/40 text-slate-500 border border-slate-600/30" },
    starter:      { label: "Independiente", style: "bg-blue-500/10 text-blue-400 border border-blue-500/20"    },
    professional: { label: "Taller Pro",    style: "bg-orange-500/10 text-orange-400 border border-orange-500/20" },
  };
  const c = cfg[plan] ?? cfg.free;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${c.style}`}>
      {c.label}
    </span>
  );
}

// ── Plan Edit Modal ───────────────────────────────────────────────────────────

function PlanModal({ tenant, onClose }: { tenant: BackofficeTenant; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [plan,   setPlan]   = useState(tenant.plan);
  const [status, setStatus] = useState(tenant.sub_status);

  const mutation = useMutation({
    mutationFn: () => backofficeApi.updateTenantPlan(tenant.id, plan, status),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ["backoffice-tenants"] }); onClose(); },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm flex flex-col gap-5 rounded-2xl p-6 border border-white/10"
        style={{ background: "#0D1117" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <TenantAvatar name={tenant.name} />
          <div>
            <p className="text-white font-bold text-sm leading-tight">{tenant.name}</p>
            <p className="text-slate-500 text-xs font-mono mt-0.5">{tenant.slug}</p>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Fields */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="h-10 px-3 rounded-xl border border-white/10 text-slate-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand"
              style={{ background: "#1A2235" }}
            >
              {["free", ...PLANS].map((p) => (
                <option key={p} value={p}>{PLAN_LABELS[p] ?? p}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 px-3 rounded-xl border border-white/10 text-slate-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand"
              style={{ background: "#1A2235" }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
              ))}
            </select>
          </div>
        </div>

        {mutation.isError && (
          <p className="text-red-400 text-xs">{(mutation.error as Error).message}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-white/10 text-slate-400
                       hover:bg-white/5 text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex-1 h-10 rounded-xl bg-brand hover:bg-brand-hover text-white
                       font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tenant Row ────────────────────────────────────────────────────────────────

function TenantRow({ tenant, onEdit }: { tenant: BackofficeTenant; onEdit: (t: BackofficeTenant) => void }) {
  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group">

      {/* Taller — avatar + nombre + slug */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <TenantAvatar name={tenant.name} />
          <div className="min-w-0">
            <p className="text-slate-100 font-semibold text-sm leading-tight truncate">{tenant.name}</p>
            <p className="text-slate-500 text-[11px] font-mono mt-0.5">{tenant.slug}</p>
          </div>
        </div>
      </td>

      {/* Plan */}
      <td className="px-5 py-3.5">
        <PlanBadge plan={tenant.plan} />
      </td>

      {/* Estado */}
      <td className="px-5 py-3.5">
        <StatusPill status={tenant.sub_status} />
      </td>

      {/* Usuarios */}
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-1.5 text-slate-400">
          <Users className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-sm tabular-nums">{tenant.user_count}</span>
        </div>
      </td>

      {/* OT Activas */}
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-1.5 text-slate-400">
          <Wrench className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-sm tabular-nums">{tenant.active_work_orders}</span>
        </div>
      </td>

      {/* Registro */}
      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-1.5 text-slate-500">
          <Calendar className="w-3.5 h-3.5 text-slate-700" />
          <span className="text-xs whitespace-nowrap">{fmtDate(tenant.created_at)}</span>
        </div>
      </td>

      {/* Acción */}
      <td className="px-5 py-3.5 text-right">
        <button
          onClick={() => onEdit(tenant)}
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg
                     text-xs font-semibold border border-white/8 text-slate-500
                     opacity-0 group-hover:opacity-100
                     hover:border-brand/40 hover:text-brand hover:bg-brand/5
                     transition-all"
        >
          <Pencil className="w-3 h-3" />
          Editar
        </button>
      </td>
    </tr>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="border-b border-white/[0.04]">
          <td className="px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 animate-pulse" />
              <div className="flex flex-col gap-1.5">
                <div className="h-3.5 w-28 rounded bg-white/5 animate-pulse" />
                <div className="h-2.5 w-20 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
          </td>
          {[...Array(5)].map((_, j) => (
            <td key={j} className="px-5 py-3.5">
              <div className="h-3 w-16 rounded bg-white/5 animate-pulse ml-auto" />
            </td>
          ))}
          <td className="px-5 py-3.5" />
        </tr>
      ))}
    </>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <tr>
      <td colSpan={7}>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Building2 className="w-7 h-7 text-slate-600" />
          </div>
          <div className="text-center">
            <p className="text-slate-400 font-semibold text-sm">
              {hasFilters ? "Sin resultados" : "No hay talleres registrados"}
            </p>
            <p className="text-slate-600 text-xs mt-1">
              {hasFilters
                ? "Probá ajustando los filtros de búsqueda"
                : "Los talleres aparecerán aquí cuando se registren"}
            </p>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function TenantsTab() {
  const [search,  setSearch]  = useState("");
  const [plan,    setPlan]    = useState("");
  const [status,  setStatus]  = useState("");
  const [page,    setPage]    = useState(1);
  const [editing, setEditing] = useState<BackofficeTenant | null>(null);

  const hasFilters = !!(search || plan || status);

  function applyFilter(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["backoffice-tenants", page, search, plan, status],
    queryFn:  () => backofficeApi.getTenants({ page, limit: 20, search, plan, status }),
  });

  return (
    <div className="flex flex-col gap-4">

      {/* ── Filters card ── */}
      <div
        className="rounded-2xl border border-white/[0.07] p-4 flex flex-wrap gap-3"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => applyFilter(setSearch, e.target.value)}
            placeholder="Buscar por nombre o slug…"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/[0.03] border border-white/8
                       text-slate-200 text-sm placeholder-slate-600
                       focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/40
                       transition-colors"
          />
        </div>

        {/* Filter group */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <select
            value={plan}
            onChange={(e) => applyFilter(setPlan, e.target.value)}
            className="h-10 px-3 rounded-xl bg-white/[0.03] border border-white/8
                       text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50
                       transition-colors"
          >
            <option value="">Todos los planes</option>
            {["free", ...PLANS].map((p) => (
              <option key={p} value={p}>{PLAN_LABELS[p] ?? p}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => applyFilter(setStatus, e.target.value)}
            className="h-10 px-3 rounded-xl bg-white/[0.03] border border-white/8
                       text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50
                       transition-colors"
          >
            <option value="">Todos los estados</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
            ))}
          </select>

          {/* Active filter count badge */}
          {hasFilters && (
            <button
              onClick={() => { applyFilter(setSearch, ""); applyFilter(setPlan, ""); applyFilter(setStatus, ""); }}
              className="h-7 px-2.5 rounded-lg bg-brand/15 border border-brand/30
                         text-brand text-[11px] font-bold hover:bg-brand/20 transition-colors"
            >
              Limpiar ×
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div
        className="rounded-2xl border border-white/[0.06] overflow-hidden"
        style={{ background: "rgba(255,255,255,0.015)" }}
      >
        {/* Counter header */}
        {data && !isLoading && (
          <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              {data.total} {data.total === 1 ? "taller" : "talleres"}
            </p>
            {data.total_pages > 1 && (
              <p className="text-[11px] text-slate-600">
                Página {data.page} de {data.total_pages}
              </p>
            )}
          </div>
        )}

        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider">Taller</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider">Plan</th>
              <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider">Estado</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-600 uppercase tracking-wider">Usuarios</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-600 uppercase tracking-wider">OT Activas</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-600 uppercase tracking-wider">Registro</th>
              <th className="px-5 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton />
            ) : data?.tenants.length === 0 ? (
              <EmptyState hasFilters={hasFilters} />
            ) : (
              data?.tenants.map((t) => (
                <TenantRow key={t.id} tenant={t} onEdit={setEditing} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-600">
            Mostrando {(data.page - 1) * 20 + 1}–{Math.min(data.page * 20, data.total)} de {data.total}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="w-8 h-8 rounded-lg border border-white/8 text-slate-500
                         flex items-center justify-center
                         disabled:opacity-25 hover:border-white/15 hover:text-slate-300
                         transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 px-2 tabular-nums">
              {page} / {data.total_pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={page >= data.total_pages}
              className="w-8 h-8 rounded-lg border border-white/8 text-slate-500
                         flex items-center justify-center
                         disabled:opacity-25 hover:border-white/15 hover:text-slate-300
                         transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editing && (
        <PlanModal tenant={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
