import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../../components/layout/AppShell";
import { api } from "../../api/client";

// ---------------------------------------------------------------------------
// Cancel subscription modal
// ---------------------------------------------------------------------------

const CANCEL_REASONS = [
  { id: "price",   label: "Precio muy alto" },
  { id: "unused",  label: "Ya no uso el servicio" },
  { id: "switch",  label: "Me cambié a otro sistema" },
  { id: "tech",    label: "Problemas técnicos" },
  { id: "other",   label: "Otro" },
];

function CancelModal({
  periodEnd,
  onClose,
  onConfirm,
  loading,
}: {
  periodEnd:  string | null;
  onClose:    () => void;
  onConfirm:  (reason: string) => void;
  loading:    boolean;
}) {
  const [selected, setSelected] = useState("");
  const [custom,   setCustom]   = useState("");

  const finalReason = selected === "other" ? custom.trim() : selected;
  const canSubmit   = !!selected && (selected !== "other" || custom.trim().length > 0);

  const endDate = periodEnd
    ? new Date(periodEnd).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 p-6 flex flex-col gap-5"
        style={{ background: "#0D1117" }}
      >
        {/* Header */}
        <div>
          <p className="text-white font-bold text-base">Cancelar suscripción</p>
          <p className="text-slate-400 text-sm mt-1 leading-relaxed">
            {endDate
              ? `Seguís teniendo acceso hasta el ${endDate}. No se realizarán más cobros.`
              : "No se realizarán más cobros. Tu acceso continúa hasta que venza el período actual."}
          </p>
        </div>

        {/* Reason selector */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            ¿Por qué cancelás?
          </p>
          {CANCEL_REASONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all
                          ${selected === r.id
                            ? "border-brand/60 bg-brand/10 text-white"
                            : "border-white/8 text-slate-400 hover:border-white/15 hover:text-slate-300"
                          }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                                  ${selected === r.id ? "border-brand" : "border-slate-600"}`}>
                  {selected === r.id && <span className="w-2 h-2 rounded-full bg-brand" />}
                </span>
                {r.label}
              </div>
            </button>
          ))}
          {selected === "other" && (
            <textarea
              autoFocus
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Contanos más…"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.03]
                         text-slate-200 text-[16px] md:text-sm placeholder-slate-600 resize-none
                         focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/40"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-white/10 text-slate-400
                       hover:bg-white/5 text-sm transition-colors"
          >
            Volver
          </button>
          <button
            onClick={() => canSubmit && onConfirm(finalReason)}
            disabled={!canSubmit || loading}
            className="flex-1 h-11 rounded-xl bg-red-700/80 hover:bg-red-700 text-white
                       font-semibold text-sm transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Procesando…" : "Confirmar cancelación"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static plan definitions — IDs must match backend plan keys
// ---------------------------------------------------------------------------

const PLAN_RANK: Record<string, number> = {
  starter:      0,
  professional: 1,
  enterprise:   2,
};

interface PlanDef {
  id:       string;
  name:     string;
  price:    number;
  limit:    string;
  badge?:   string;
  features: string[];
  tier:     "standard" | "popular" | "premium";
}

const PLANS: PlanDef[] = [
  {
    id:    "starter",
    name:  "Mecánico Independiente",
    price: 18_000,
    limit: "Hasta 10 vehículos en simultáneo",
    tier:  "standard",
    features: [
      "1 Usuario",
      "Presupuesto Digital Interactivo",
      "Diagnóstico con IA por voz",
      "WhatsApp automático (cambios de estado)",
      "Seguimiento QR para clientes",
    ],
  },
  {
    id:    "professional",
    name:  "Taller Pro",
    price: 35_000,
    limit: "Hasta 30 vehículos en simultáneo",
    badge: "MÁS POPULAR",
    tier:  "popular",
    features: [
      "Todo lo anterior, más:",
      "Hasta 3 Usuarios",
      "Personalización de Marca (tu logo en presupuestos)",
      "Recordatorios Automáticos de Service",
    ],
  },
  {
    id:    "enterprise",
    name:  "Taller Platinum",
    price: 80_000,
    limit: "Vehículos ilimitados",
    tier:  "premium",
    features: [
      "Todo lo anterior, más:",
      "Usuarios ilimitados",
      "Múltiples sucursales",
      "Dashboard de métricas y finanzas",
      "Soporte técnico prioritario",
    ],
  },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BillingStatus {
  sub_status:             string;
  plan:                   string;
  trial_ends_at:          string | null;
  sub_current_period_end: string | null;
  is_active:              boolean;
  days_remaining:         number | null;
}

// ---------------------------------------------------------------------------
// Trial Banner
// ---------------------------------------------------------------------------

const TRIAL_PRO_PERKS = [
  "Hasta 3 usuarios en tu equipo",
  "Logo de tu taller en presupuestos",
  "Recordatorios automáticos de service",
];

function TrialBanner({ days_remaining }: { days_remaining: number | null }) {
  const days      = days_remaining ?? 0;
  const isExpired = days <= 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-orange-500/40 px-5 py-4"
      style={{
        background:
          "linear-gradient(135deg, rgba(194,65,12,0.20) 0%, rgba(120,53,15,0.10) 100%)",
      }}
    >
      {/* Ambient glows */}
      <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -left-4 w-28 h-28 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

      <div className="relative flex items-start gap-3">
        <span className="text-[26px] leading-none mt-0.5 flex-shrink-0">🎁</span>
        <div className="flex-1 min-w-0">
          <p className="text-orange-200 font-black text-sm leading-snug">
            Estás disfrutando los beneficios del plan Taller Pro
          </p>

          {/* Active Pro features */}
          <ul className="mt-2 flex flex-col gap-1.5">
            {TRIAL_PRO_PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-1.5 text-xs text-orange-200/75">
                <svg
                  className="w-3 h-3 flex-shrink-0 text-orange-400"
                  fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {perk}
              </li>
            ))}
          </ul>

          {isExpired ? (
            <p className="text-orange-400/70 text-xs mt-2">
              Tu período de prueba expiró. Elegí un plan para reactivar tu cuenta.
            </p>
          ) : (
            <p className="text-orange-300/70 text-xs mt-2">
              Te quedan{" "}
              <span className="font-bold text-orange-300">
                {days} {days === 1 ? "día" : "días"}
              </span>
              . Elegí tu plan para mantener el acceso.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status Banner (active / inactive)
// ---------------------------------------------------------------------------

function StatusBanner({
  status,
  onCancel,
}: {
  status:    BillingStatus;
  onCancel?: () => void;
}) {
  const { sub_status, days_remaining, sub_current_period_end } = status;

  if (sub_status === "trialing") {
    return <TrialBanner days_remaining={days_remaining} />;
  }

  if (sub_status === "canceling") {
    const endDate = sub_current_period_end
      ? new Date(sub_current_period_end).toLocaleDateString("es-AR", {
          day: "numeric", month: "long", year: "numeric",
        })
      : null;
    return (
      <div className="bg-slate-800/50 border border-slate-600/40 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full bg-slate-500 flex-shrink-0" />
          <span className="text-slate-300 font-semibold text-sm">Suscripción cancelada</span>
        </div>
        {endDate && (
          <p className="text-slate-500 text-xs">Tenés acceso hasta el {endDate}</p>
        )}
      </div>
    );
  }

  if (sub_status === "active") {
    const endDate = sub_current_period_end
      ? new Date(sub_current_period_end).toLocaleDateString("es-AR", {
          day: "numeric", month: "long", year: "numeric",
        })
      : null;
    return (
      <div className="bg-green-900/30 border border-green-700/40 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
          <span className="text-green-400 font-semibold text-sm">Suscripción activa</span>
        </div>
        {endDate && (
          <p className="text-slate-400 text-xs">Próximo cobro: {endDate}</p>
        )}
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-2 text-[11px] text-slate-600 hover:text-red-400/80 transition-colors"
          >
            Cancelar suscripción
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-red-900/30 border border-red-700/40 rounded-2xl px-5 py-4">
      <p className="text-red-400 font-semibold text-sm">Suscripción inactiva</p>
      <p className="text-slate-400 text-xs mt-1">
        Elegí un plan para continuar usando TallerTrack.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanCard
// ---------------------------------------------------------------------------

function PlanCard({
  plan,
  currentPlan,
  subStatus,
  onSubscribe,
  loading,
}: {
  plan:        PlanDef;
  currentPlan: string;
  subStatus:   string;
  onSubscribe: (planId: string) => void;
  loading:     boolean;
}) {
  const isTrialing    = subStatus === "trialing";
  const isTrialPlan   = isTrialing && plan.id === "professional";
  const isCurrent     = currentPlan === plan.id && !isTrialing;
  const currentRank   = PLAN_RANK[currentPlan] ?? -1;
  const thisPlanRank  = PLAN_RANK[plan.id]     ??  0;
  const isUpgrade     = !isTrialing && !isCurrent && thisPlanRank > currentRank;

  const { tier } = plan;

  // ── Button label ──────────────────────────────────────────────────────────
  let btnLabel: string;
  if (loading)          btnLabel = "Procesando…";
  else if (isCurrent)   btnLabel = "Plan Actual";
  else if (isTrialPlan) btnLabel = "Activar para continuar";
  else if (isTrialing)  btnLabel = "Elegir este plan";
  else if (isUpgrade)   btnLabel = "Mejorar Plan";
  else                  btnLabel = "Cambiar Plan";

  // ── Card styles ───────────────────────────────────────────────────────────
  const cardBase = "relative flex flex-col rounded-2xl p-5 gap-4 border transition-all";

  const cardStyle =
    tier === "popular"
      ? `${cardBase} border-orange-500/55 shadow-xl shadow-orange-900/25
         sm:scale-[1.04] sm:z-10`
      : tier === "premium"
      ? `${cardBase} border-violet-700/45 bg-violet-950/10`
      : `${cardBase} border-slate-700/60 bg-surface-card`;

  const popularBg = {
    background:
      "linear-gradient(160deg, rgba(124,45,18,0.28) 0%, rgba(69,26,3,0.18) 100%)",
  };

  // ── Checkmark color ───────────────────────────────────────────────────────
  const checkColor =
    tier === "popular"
      ? "text-orange-400"
      : tier === "premium"
      ? "text-violet-400"
      : "text-green-400";

  // ── Limit badge ───────────────────────────────────────────────────────────
  const limitBadge =
    tier === "popular"
      ? "bg-orange-500/15 text-orange-300 border border-orange-500/30"
      : tier === "premium"
      ? "bg-violet-500/10 text-violet-300 border border-violet-500/25"
      : "bg-slate-700/60 text-slate-400 border border-slate-600/50";

  // ── CTA button ────────────────────────────────────────────────────────────
  let btnClass: string;
  if (isCurrent) {
    btnClass = "border border-slate-700 text-slate-500 cursor-default";
  } else if (tier === "popular") {
    btnClass =
      "bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold shadow-md shadow-orange-900/40 active:scale-[0.98]";
  } else if (tier === "premium") {
    btnClass =
      "border border-violet-600/50 text-violet-300 hover:bg-violet-900/30 active:scale-[0.98]";
  } else {
    btnClass = "bg-slate-700 hover:bg-slate-600 text-slate-100 active:scale-[0.98]";
  }

  return (
    <div className={cardStyle} style={tier === "popular" ? popularBg : undefined}>

      {/* Popular / Trial badge */}
      {(plan.badge || isTrialPlan) && (
        <span
          className="absolute -top-3.5 left-1/2 -translate-x-1/2
                     text-white text-[10px] font-black uppercase tracking-[0.12em]
                     px-4 py-1 rounded-full whitespace-nowrap"
          style={
            isTrialPlan
              ? {
                  background: "linear-gradient(90deg, #065F46 0%, #059669 50%, #10B981 100%)",
                  boxShadow: "0 4px 12px rgba(16,185,129,0.35)",
                }
              : {
                  background: "linear-gradient(90deg, #C2410C 0%, #F97316 50%, #FB923C 100%)",
                  boxShadow: "0 4px 12px rgba(194,65,12,0.40)",
                }
          }
        >
          ✦ {isTrialPlan ? "EN PRUEBA ACTIVA" : plan.badge}
        </span>
      )}

      {/* Name + price */}
      <div className={plan.badge || isTrialPlan ? "mt-2" : ""}>
        <p
          className={`font-black text-base leading-tight ${
            tier === "popular" ? "text-orange-100" : "text-white"
          }`}
        >
          {plan.name}
        </p>
        <div className="flex items-baseline gap-1 mt-1.5">
          <span
            className={`text-[2rem] font-black tabular-nums leading-none ${
              tier === "popular" ? "text-orange-100" : "text-white"
            }`}
          >
            ${plan.price.toLocaleString("es-AR")}
          </span>
          <span className="text-slate-400 text-sm">/mes</span>
        </div>
      </div>

      {/* Vehicle limit badge */}
      <div
        className={`inline-flex items-center gap-1.5 self-start
                    px-2.5 py-1.5 rounded-xl text-[11px] font-semibold
                    ${limitBadge}`}
      >
        {/* Car icon */}
        <svg
          className="w-3.5 h-3.5 flex-shrink-0"
          fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={1.75}
        >
          <path
            strokeLinecap="round" strokeLinejoin="round"
            d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
          />
        </svg>
        {plan.limit}
      </div>

      {/* Features */}
      <ul className="flex flex-col gap-2 flex-1">
        {plan.features.map((f, i) => {
          if (f.startsWith("Todo lo anterior")) {
            return (
              <li key={i} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pt-0.5 pb-0.5">
                {f}
              </li>
            );
          }
          return (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <svg
                className={`w-4 h-4 flex-shrink-0 mt-0.5 ${checkColor}`}
                fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {f}
            </li>
          );
        })}
      </ul>

      {/* CTA */}
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => { if (!isCurrent && !loading) onSubscribe(plan.id); }}
          disabled={isCurrent || loading}
          className={`w-full h-12 rounded-xl text-sm transition-all
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${btnClass}`}
        >
          {btnLabel}
        </button>
        {isTrialPlan && (
          <p className="text-center text-[10px] text-emerald-400/60">
            Para mantener el acceso luego del trial
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function Billing() {
  const [searchParams] = useSearchParams();
  const queryClient    = useQueryClient();
  const [loadingPlan,  setLoadingPlan]  = useState<string | null>(null);
  const [showCancel,   setShowCancel]   = useState(false);

  const justPaid = searchParams.get("success") === "1";

  const { data: status, isLoading: statusLoading } = useQuery<BillingStatus>({
    queryKey:        ["billing-status"],
    queryFn:         () => api.get<BillingStatus>("/billing/status"),
    refetchInterval: justPaid ? 3_000 : false,
  });

  const { data: apiPlans } = useQuery<{ id: string; price: number }[]>({
    queryKey: ["billing-plans"],
    queryFn:  () => api.get<{ id: string; price: number }[]>("/billing/plans"),
  });

  const plansWithPrices = PLANS.map(plan => ({
    ...plan,
    price: apiPlans?.find(p => p.id === plan.id)?.price ?? plan.price,
  }));

  const cancelMutation = useMutation({
    mutationFn: (reason: string) =>
      api.post<{ success: boolean }>("/billing/cancel", { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-status"] });
      setShowCancel(false);
    },
    onError: (err: Error) => alert(err.message),
  });

  const subscribeMutation = useMutation({
    mutationFn: (plan: string) =>
      api.post<{ init_point: string }>("/billing/subscribe", { plan }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["billing-status"] });
      window.location.href = data.init_point;
    },
    onError: (err: Error) => {
      alert(err.message);
    },
    onSettled: () => setLoadingPlan(null),
  });

  function handleSubscribe(planId: string) {
    setLoadingPlan(planId);
    subscribeMutation.mutate(planId);
  }

  const currentPlan = status?.plan       ?? "free";
  const subStatus   = status?.sub_status ?? "inactive";

  return (
    <AppShell title="Suscripción">
      <div className="flex flex-col gap-5 p-4 animate-slide-up">

        {/* Payment success banner (after MP redirect) */}
        {justPaid && (
          <div className="bg-green-900/30 border border-green-700/40 rounded-2xl px-5 py-4 text-center">
            <p className="text-green-400 font-bold text-sm">¡Pago recibido!</p>
            <p className="text-slate-400 text-xs mt-1">
              Estamos activando tu suscripción. Puede demorar unos segundos.
            </p>
          </div>
        )}

        {/* Status / Trial banner */}
        {statusLoading ? (
          <div className="h-20 bg-slate-800/60 rounded-2xl animate-pulse" />
        ) : status ? (
          <StatusBanner
            status={status}
            onCancel={status.sub_status === "active" ? () => setShowCancel(true) : undefined}
          />
        ) : null}

        {/* Plan grid */}
        <section>
          <div className="px-1 mb-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Planes disponibles
            </p>
            <p className="text-slate-500 text-xs">
              {subStatus === "trialing"
                ? "Elegí tu plan antes de que venza tu prueba. Sin contratos."
                : "Sin contratos. Cancelá cuando quieras."}
            </p>
          </div>

          {statusLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:py-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-80 bg-slate-800/60 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            /* sm:py-4 gives room for the popular card's scale-[1.04] overflow */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:items-start sm:py-4">
              {plansWithPrices.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  currentPlan={currentPlan}
                  subStatus={subStatus}
                  onSubscribe={handleSubscribe}
                  loading={loadingPlan === plan.id}
                />
              ))}
            </div>
          )}
        </section>

        {showCancel && (
          <CancelModal
            periodEnd={status?.sub_current_period_end ?? null}
            onClose={() => setShowCancel(false)}
            onConfirm={(reason) => cancelMutation.mutate(reason)}
            loading={cancelMutation.isPending}
          />
        )}

        <p className="text-center text-[11px] text-slate-600 pb-4">
          Los cobros se realizan mensualmente a través de Mercado Pago.
          <br />
          Podés cancelar cuando quieras desde el panel de MP.
        </p>

      </div>
    </AppShell>
  );
}
