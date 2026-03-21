import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

const PLAN_COLORS: Record<string, string> = {
  free:         "bg-slate-700/60 text-slate-400",
  starter:      "bg-blue-500/15 text-blue-300 border border-blue-500/30",
  professional: "bg-orange-500/15 text-orange-300 border border-orange-500/30",
  enterprise:   "bg-violet-500/15 text-violet-300 border border-violet-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-emerald-500/15 text-emerald-400",
  trialing:  "bg-orange-500/15 text-orange-400",
  inactive:  "bg-slate-700/50 text-slate-500",
  cancelled: "bg-red-500/15 text-red-400",
  past_due:  "bg-yellow-500/15 text-yellow-400",
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

// ── Plan Edit Modal ───────────────────────────────────────────────────────────

function PlanModal({
  tenant,
  onClose,
}: {
  tenant: BackofficeTenant;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [plan,   setPlan]   = useState(tenant.plan);
  const [status, setStatus] = useState(tenant.sub_status);

  const mutation = useMutation({
    mutationFn: () => backofficeApi.updateTenantPlan(tenant.id, plan, status),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ["backoffice-tenants"] });
      onClose();
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#0D1117] border border-white/10 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-5">
        <div>
          <p className="text-white font-bold text-base">{tenant.name}</p>
          <p className="text-slate-500 text-xs mt-0.5">{tenant.slug}</p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[#1A2235] border border-white/10
                         text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {["free", ...PLANS].map((p) => (
                <option key={p} value={p}>{PLAN_LABELS[p] ?? p}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[#1A2235] border border-white/10
                         text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
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

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-white/10 text-slate-400
                       hover:border-white/20 text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex-1 h-10 rounded-xl bg-brand hover:bg-brand-hover text-white
                       font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tenants Row ───────────────────────────────────────────────────────────────

function TenantRow({
  tenant,
  onEdit,
}: {
  tenant: BackofficeTenant;
  onEdit: (t: BackofficeTenant) => void;
}) {
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      {/* Name + slug */}
      <td className="px-4 py-3">
        <p className="text-slate-200 font-semibold text-sm">{tenant.name}</p>
        <p className="text-slate-500 text-xs font-mono">{tenant.slug}</p>
      </td>
      {/* Plan */}
      <td className="px-4 py-3">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${PLAN_COLORS[tenant.plan] ?? PLAN_COLORS.free}`}>
          {PLAN_LABELS[tenant.plan] ?? tenant.plan}
        </span>
      </td>
      {/* Status */}
      <td className="px-4 py-3">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${STATUS_COLORS[tenant.sub_status] ?? STATUS_COLORS.inactive}`}>
          {STATUS_LABELS[tenant.sub_status] ?? tenant.sub_status}
        </span>
      </td>
      {/* Users */}
      <td className="px-4 py-3 text-slate-400 text-sm text-right tabular-nums">
        {tenant.user_count}
      </td>
      {/* Active WO */}
      <td className="px-4 py-3 text-slate-400 text-sm text-right tabular-nums">
        {tenant.active_work_orders}
      </td>
      {/* Created */}
      <td className="px-4 py-3 text-slate-500 text-xs text-right whitespace-nowrap">
        {fmtDate(tenant.created_at)}
      </td>
      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onEdit(tenant)}
          className="text-xs text-brand hover:text-brand-hover font-semibold transition-colors"
        >
          Editar plan
        </button>
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

  // Reset to page 1 on filter change
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
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => applyFilter(setSearch, e.target.value)}
          placeholder="Buscar por nombre o slug…"
          className="flex-1 min-w-[200px] h-10 px-3 rounded-xl bg-[#111827] border border-white/10
                     text-slate-200 text-sm placeholder-slate-600
                     focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <select
          value={plan}
          onChange={(e) => applyFilter(setPlan, e.target.value)}
          className="h-10 px-3 rounded-xl bg-[#111827] border border-white/10
                     text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">Todos los planes</option>
          {["free", ...PLANS].map((p) => (
            <option key={p} value={p}>{PLAN_LABELS[p] ?? p}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => applyFilter(setStatus, e.target.value)}
          className="h-10 px-3 rounded-xl bg-[#111827] border border-white/10
                     text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Taller</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Usuarios</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">OT Activas</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Registro</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-600">
                    No se encontraron talleres con esos filtros.
                  </td>
                </tr>
              ) : (
                data?.tenants.map((t) => (
                  <TenantRow key={t.id} tenant={t} onEdit={setEditing} />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {data.total} talleres · página {data.page} de {data.total_pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8 px-3 rounded-lg border border-white/10 text-slate-400 text-xs
                         disabled:opacity-30 hover:border-white/20 transition-colors"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={page >= data.total_pages}
              className="h-8 px-3 rounded-lg border border-white/10 text-slate-400 text-xs
                         disabled:opacity-30 hover:border-white/20 transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <PlanModal tenant={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
