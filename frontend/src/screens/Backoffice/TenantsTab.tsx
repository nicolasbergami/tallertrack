import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, SlidersHorizontal, Users, Wrench, Calendar,
  ChevronLeft, ChevronRight, Building2,
  CreditCard, LogIn, Ban, MoreHorizontal, CheckCircle2, ShieldOff,
} from "lucide-react";
import { backofficeApi, type BackofficeTenant } from "../../api/backoffice.api";

// ── Constants ─────────────────────────────────────────────────────────────────

const PLANS    = ["starter", "professional", "enterprise"] as const;
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

// ── Toast ─────────────────────────────────────────────────────────────────────

type ToastType = "info" | "success" | "warning" | "error";

interface Toast {
  id:      number;
  message: string;
  type:    ToastType;
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null;
  const styles: Record<ToastType, string> = {
    info:    "bg-[#0D1117] border-brand/40 text-slate-200",
    success: "bg-[#0D1117] border-emerald-500/40 text-emerald-300",
    warning: "bg-[#0D1117] border-amber-500/40 text-amber-300",
    error:   "bg-[#0D1117] border-red-500/40 text-red-300",
  };
  const icons: Record<ToastType, string> = {
    info: "ℹ️", success: "✅", warning: "⚠️", error: "❌",
  };
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl
                      text-sm font-medium pointer-events-auto animate-slide-up
                      ${styles[t.type]}`}
          style={{ minWidth: 260, maxWidth: 360 }}
        >
          <span className="text-base leading-none flex-shrink-0">{icons[t.type]}</span>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="text-slate-600 hover:text-slate-300 ml-1 text-base leading-none">×</button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, type: ToastType = "info", duration = 3500) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, show, dismiss };
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  title, description, confirmLabel, confirmStyle,
  onConfirm, onClose, loading,
}: {
  title:        string;
  description:  string;
  confirmLabel: string;
  confirmStyle: "danger" | "warning";
  onConfirm:    () => void;
  onClose:      () => void;
  loading:      boolean;
}) {
  const btnStyle = confirmStyle === "danger"
    ? "bg-red-600 hover:bg-red-500 text-white"
    : "bg-amber-500 hover:bg-amber-400 text-black";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 p-6 flex flex-col gap-5"
        style={{ background: "#0D1117" }}
      >
        <div className="flex flex-col gap-2">
          <p className="text-white font-bold text-base">{title}</p>
          <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-white/10 text-slate-400
                       hover:bg-white/5 text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 h-10 rounded-xl font-semibold text-sm transition-colors
                        disabled:opacity-50 ${btnStyle}`}
          >
            {loading ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Avatar with initials ──────────────────────────────────────────────────────

function TenantAvatar({ name }: { name: string }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
  const colors = [
    ["#1D4ED8","#3B82F6"], ["#7C3AED","#8B5CF6"], ["#0F766E","#14B8A6"],
    ["#B45309","#F59E0B"], ["#9D174D","#EC4899"], ["#065F46","#10B981"],
  ];
  const [from, to] = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-black select-none"
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      {initials || "?"}
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
    active:    { label:"Activo",    dot:"bg-emerald-400", bg:"bg-emerald-500/10", text:"text-emerald-400", border:"border-emerald-500/20" },
    trialing:  { label:"En Trial",  dot:"bg-amber-400",   bg:"bg-amber-500/10",  text:"text-amber-400",   border:"border-amber-500/20"   },
    inactive:  { label:"Inactivo",  dot:"bg-slate-500",   bg:"bg-slate-700/30",  text:"text-slate-500",   border:"border-slate-600/30"   },
    cancelled: { label:"Cancelado", dot:"bg-red-500",     bg:"bg-red-500/10",    text:"text-red-400",     border:"border-red-500/20"     },
    past_due:  { label:"Vencido",   dot:"bg-yellow-500",  bg:"bg-yellow-500/10", text:"text-yellow-400",  border:"border-yellow-500/20"  },
  };
  const s = cfg[status] ?? cfg.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${s.bg} ${s.text} ${s.border}`}>
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
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border border-violet-400/30 text-violet-200"
        style={{ background:"linear-gradient(135deg,rgba(109,40,217,.25) 0%,rgba(139,92,246,.15) 100%)", boxShadow:"0 0 10px rgba(139,92,246,.15)" }}
      >
        <span className="text-[10px]">💎</span> Platinum
      </span>
    );
  }
  const cfg: Record<string, string> = {
    free:         "bg-slate-700/40 text-slate-500 border border-slate-600/30",
    starter:      "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    professional: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg[plan] ?? cfg.free}`}>
      {PLAN_LABELS[plan] ?? plan}
    </span>
  );
}

// ── Plan Edit Modal ───────────────────────────────────────────────────────────

function PlanModal({ tenant, onClose, onToast }: {
  tenant:  BackofficeTenant;
  onClose: () => void;
  onToast: (msg: string, type: ToastType) => void;
}) {
  const queryClient = useQueryClient();
  const [plan,   setPlan]   = useState(tenant.plan);
  const [status, setStatus] = useState(tenant.sub_status);

  const mutation = useMutation({
    mutationFn: () => backofficeApi.updateTenantPlan(tenant.id, plan, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backoffice-tenants"] });
      onToast(`Plan de "${tenant.name}" actualizado correctamente.`, "success");
      onClose();
    },
    onError: () => onToast("Error al actualizar el plan. Intentá de nuevo.", "error"),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 p-6 flex flex-col gap-5" style={{ background:"#0D1117" }}>
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
            <select value={plan} onChange={(e) => setPlan(e.target.value)}
              className="h-10 px-3 rounded-xl border border-white/10 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              style={{ background:"#1A2235" }}>
              {["free", ...PLANS].map((p) => <option key={p} value={p}>{PLAN_LABELS[p] ?? p}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="h-10 px-3 rounded-xl border border-white/10 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              style={{ background:"#1A2235" }}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 text-sm transition-colors">
            Cancelar
          </button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 h-10 rounded-xl bg-brand hover:bg-brand-hover text-white font-semibold text-sm transition-colors disabled:opacity-50">
            {mutation.isPending ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Actions Dropdown ──────────────────────────────────────────────────────────

type ModalState = "edit_plan" | "block" | "unblock" | null;

function ActionsDropdown({ tenant, onModal, onImpersonate }: {
  tenant:        BackofficeTenant;
  onModal:       (type: ModalState, t: BackofficeTenant) => void;
  onImpersonate: (t: BackofficeTenant) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isSuspended = tenant.sub_status === "inactive" || tenant.sub_status === "cancelled";

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function action(fn: () => void) { setOpen(false); fn(); }

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                    ${open ? "bg-white/10 text-slate-300" : "text-slate-600 hover:bg-white/8 hover:text-slate-300"}`}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-9 z-40 w-52 rounded-xl border border-white/10 py-1.5 shadow-2xl"
          style={{ background:"#0D1520" }}
        >
          {/* ── Editar plan ── */}
          <button
            onClick={() => action(() => onModal("edit_plan", tenant))}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-slate-300
                       hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <CreditCard className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span>Editar plan</span>
          </button>

          {/* ── Entrar como ── */}
          <button
            onClick={() => action(() => onImpersonate(tenant))}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm
                       text-brand hover:bg-brand/10 transition-colors font-semibold"
          >
            <LogIn className="w-4 h-4 flex-shrink-0" />
            <div className="text-left leading-tight">
              <p>Entrar como…</p>
              <p className="text-[11px] font-normal text-brand/60 truncate max-w-[140px]">{tenant.name}</p>
            </div>
          </button>

          <div className="my-1 h-px bg-white/5 mx-2" />

          {/* ── Bloquear / Reactivar ── */}
          {isSuspended ? (
            <button
              onClick={() => action(() => onModal("unblock", tenant))}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-emerald-400
                         hover:bg-emerald-500/10 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Reactivar taller</span>
            </button>
          ) : (
            <button
              onClick={() => action(() => onModal("block", tenant))}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-red-400
                         hover:bg-red-500/10 transition-colors"
            >
              <ShieldOff className="w-4 h-4 flex-shrink-0" />
              <span>Suspender taller</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tenant Row ────────────────────────────────────────────────────────────────

function TenantRow({ tenant, onModal, onImpersonate }: {
  tenant:        BackofficeTenant;
  onModal:       (type: ModalState, t: BackofficeTenant) => void;
  onImpersonate: (t: BackofficeTenant) => void;
}) {
  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors group">
      {/* Taller */}
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
      <td className="px-5 py-3.5"><PlanBadge plan={tenant.plan} /></td>
      {/* Estado */}
      <td className="px-5 py-3.5"><StatusPill status={tenant.sub_status} /></td>
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
      {/* Acciones */}
      <td className="px-4 py-3.5">
        <ActionsDropdown tenant={tenant} onModal={onModal} onImpersonate={onImpersonate} />
      </td>
    </tr>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

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
          <td className="px-4 py-3.5">
            <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse ml-auto" />
          </td>
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
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
               style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}>
            <Building2 className="w-7 h-7 text-slate-600" />
          </div>
          <div className="text-center">
            <p className="text-slate-400 font-semibold text-sm">
              {hasFilters ? "Sin resultados" : "No hay talleres registrados"}
            </p>
            <p className="text-slate-600 text-xs mt-1">
              {hasFilters ? "Probá ajustando los filtros de búsqueda" : "Los talleres aparecerán aquí cuando se registren"}
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
  const { toasts, show: showToast, dismiss } = useToast();

  // Modal state
  const [modalType,   setModalType]   = useState<ModalState>(null);
  const [activeTenant, setActiveTenant] = useState<BackofficeTenant | null>(null);

  const hasFilters = !!(search || plan || status);

  function applyFilter(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["backoffice-tenants", page, search, plan, status],
    queryFn:  () => backofficeApi.getTenants({ page, limit: 20, search, plan, status }),
  });

  const queryClient = useQueryClient();

  // ── Block / Unblock mutation ───────────────────────────────────────────────
  const toggleBlockMutation = useMutation({
    mutationFn: () => {
      if (!activeTenant) throw new Error("No tenant selected");
      const newStatus = modalType === "block" ? "inactive" : "active";
      return backofficeApi.updateTenantPlan(activeTenant.id, activeTenant.plan, newStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backoffice-tenants"] });
      showToast(
        modalType === "block"
          ? `"${activeTenant?.name}" suspendido correctamente.`
          : `"${activeTenant?.name}" reactivado correctamente.`,
        modalType === "block" ? "warning" : "success"
      );
      setModalType(null);
      setActiveTenant(null);
    },
    onError: () => showToast("Error al procesar la acción. Intentá de nuevo.", "error"),
  });

  // ── Impersonate (stub — future endpoint) ──────────────────────────────────
  function handleImpersonate(tenant: BackofficeTenant) {
    showToast(`Iniciando sesión como "${tenant.name}"…`, "info", 4000);
    // TODO: call POST /api/v1/backoffice/impersonate/:tenantId
    // const { token } = await backofficeApi.impersonate(tenant.id);
    // setAuth(token, ...); navigate("/dashboard");
    console.log("[Impersonate] tenant_id:", tenant.id);
  }

  function openModal(type: ModalState, tenant: BackofficeTenant) {
    setModalType(type);
    setActiveTenant(tenant);
  }

  function closeModal() {
    setModalType(null);
    setActiveTenant(null);
    toggleBlockMutation.reset();
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Filters ── */}
      <div className="rounded-2xl border border-white/[0.07] p-4 flex flex-wrap gap-3"
           style={{ background:"rgba(255,255,255,0.02)" }}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => applyFilter(setSearch, e.target.value)}
            placeholder="Buscar por nombre o slug…"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/[0.03] border border-white/8
                       text-slate-200 text-sm placeholder-slate-600
                       focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/40 transition-colors" />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-600 flex-shrink-0" />
          <select value={plan} onChange={(e) => applyFilter(setPlan, e.target.value)}
            className="h-10 px-3 rounded-xl bg-white/[0.03] border border-white/8 text-slate-300 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand/50 transition-colors">
            <option value="">Todos los planes</option>
            {["free", ...PLANS].map((p) => <option key={p} value={p}>{PLAN_LABELS[p] ?? p}</option>)}
          </select>
          <select value={status} onChange={(e) => applyFilter(setStatus, e.target.value)}
            className="h-10 px-3 rounded-xl bg-white/[0.03] border border-white/8 text-slate-300 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand/50 transition-colors">
            <option value="">Todos los estados</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
          </select>
          {hasFilters && (
            <button onClick={() => { applyFilter(setSearch,""); applyFilter(setPlan,""); applyFilter(setStatus,""); }}
              className="h-7 px-2.5 rounded-lg bg-brand/15 border border-brand/30 text-brand text-[11px] font-bold hover:bg-brand/20 transition-colors">
              Limpiar ×
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background:"rgba(255,255,255,0.015)" }}>
        {data && !isLoading && (
          <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              {data.total} {data.total === 1 ? "taller" : "talleres"}
            </p>
            {data.total_pages > 1 && (
              <p className="text-[11px] text-slate-600">Página {data.page} de {data.total_pages}</p>
            )}
          </div>
        )}
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.04]">
              {["Taller","Plan","Estado","Usuarios","OT Activas","Registro"].map((h, i) => (
                <th key={h} className={`px-5 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider ${i >= 3 ? "text-right" : "text-left"}`}>{h}</th>
              ))}
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {isLoading   ? <TableSkeleton /> :
             data?.tenants.length === 0 ? <EmptyState hasFilters={hasFilters} /> :
             data?.tenants.map((t) => (
               <TenantRow key={t.id} tenant={t} onModal={openModal} onImpersonate={handleImpersonate} />
             ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-600">
            Mostrando {(data.page-1)*20+1}–{Math.min(data.page*20, data.total)} de {data.total}
          </p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page<=1}
              className="w-8 h-8 rounded-lg border border-white/8 text-slate-500 flex items-center justify-center disabled:opacity-25 hover:border-white/15 hover:text-slate-300 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 px-2 tabular-nums">{page} / {data.total_pages}</span>
            <button onClick={() => setPage((p) => Math.min(data.total_pages, p+1))} disabled={page>=data.total_pages}
              className="w-8 h-8 rounded-lg border border-white/8 text-slate-500 flex items-center justify-center disabled:opacity-25 hover:border-white/15 hover:text-slate-300 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {modalType === "edit_plan" && activeTenant && (
        <PlanModal tenant={activeTenant} onClose={closeModal} onToast={showToast} />
      )}

      {(modalType === "block" || modalType === "unblock") && activeTenant && (
        <ConfirmModal
          title={modalType === "block" ? `Suspender "${activeTenant.name}"` : `Reactivar "${activeTenant.name}"`}
          description={
            modalType === "block"
              ? "El taller quedará inactivo y sus usuarios no podrán iniciar sesión. Podés reactivarlo en cualquier momento."
              : "El taller volverá al estado activo y sus usuarios podrán acceder nuevamente."
          }
          confirmLabel={modalType === "block" ? "Suspender" : "Reactivar"}
          confirmStyle={modalType === "block" ? "danger" : "warning"}
          loading={toggleBlockMutation.isPending}
          onConfirm={() => toggleBlockMutation.mutate()}
          onClose={closeModal}
        />
      )}

      {/* ── Toasts ── */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
