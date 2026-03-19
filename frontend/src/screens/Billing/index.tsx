import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../../components/layout/AppShell";
import { api } from "../../api/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PlanConfig {
  id:          string;
  displayName: string;
  price:       number;
  currency:    string;
  features:    string[];
}

interface BillingStatus {
  sub_status:             string;
  plan:                   string;
  trial_ends_at:          string | null;
  sub_current_period_end: string | null;
  is_active:              boolean;
  days_remaining:         number | null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function StatusBanner({ status }: { status: BillingStatus }) {
  const { sub_status, days_remaining, trial_ends_at, sub_current_period_end } = status;

  if (sub_status === "active") {
    const endDate = sub_current_period_end
      ? new Date(sub_current_period_end).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
      : null;
    return (
      <div className="bg-green-900/30 border border-green-700/40 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 font-semibold text-sm">Suscripción activa</span>
        </div>
        {endDate && (
          <p className="text-slate-400 text-xs">Próximo cobro: {endDate}</p>
        )}
      </div>
    );
  }

  if (sub_status === "trialing") {
    const isExpired = !days_remaining || days_remaining <= 0;
    const trialEnd  = trial_ends_at
      ? new Date(trial_ends_at).toLocaleDateString("es-AR", { day: "numeric", month: "long" })
      : null;

    return (
      <div className={`rounded-2xl px-5 py-4 border ${isExpired
        ? "bg-red-900/30 border-red-700/40"
        : "bg-yellow-900/20 border-yellow-700/40"
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full ${isExpired ? "bg-red-400" : "bg-yellow-400"}`} />
          <span className={`font-semibold text-sm ${isExpired ? "text-red-400" : "text-yellow-400"}`}>
            {isExpired ? "Período de prueba expirado" : `Prueba gratuita — ${days_remaining} días restantes`}
          </span>
        </div>
        {!isExpired && trialEnd && (
          <p className="text-slate-400 text-xs">Tu prueba vence el {trialEnd}. Suscribite para no perder acceso.</p>
        )}
        {isExpired && (
          <p className="text-slate-400 text-xs">Elegí un plan para reactivar tu cuenta.</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-red-900/30 border border-red-700/40 rounded-2xl px-5 py-4">
      <p className="text-red-400 font-semibold text-sm">Suscripción inactiva</p>
      <p className="text-slate-400 text-xs mt-1">Elegí un plan para continuar usando TallerTrack.</p>
    </div>
  );
}

function PlanCard({
  plan,
  current,
  onSubscribe,
  loading,
}: {
  plan:        PlanConfig;
  current:     string;
  onSubscribe: (planId: string) => void;
  loading:     boolean;
}) {
  const isCurrent = current === plan.id;
  const isPopular = plan.id === "professional";

  return (
    <div className={`relative flex flex-col rounded-2xl border p-5 gap-4 ${
      isPopular
        ? "border-blue-500/60 bg-blue-900/10"
        : "border-surface-border bg-surface-card"
    }`}>
      {isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-bold px-3 py-1 rounded-full">
          MÁS POPULAR
        </span>
      )}

      <div>
        <p className="text-white font-bold text-lg">{plan.displayName}</p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl font-black text-white">
            ${plan.price.toLocaleString("es-AR")}
          </span>
          <span className="text-slate-400 text-sm">/mes</span>
        </div>
      </div>

      <ul className="space-y-2 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
            <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSubscribe(plan.id)}
        disabled={loading || isCurrent}
        className={`w-full h-11 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isCurrent
            ? "border border-slate-600 text-slate-400"
            : isPopular
            ? "bg-blue-600 hover:bg-blue-500 text-white"
            : "bg-slate-700 hover:bg-slate-600 text-white"
        }`}
      >
        {isCurrent ? "Plan actual" : loading ? "Procesando…" : "Suscribirme"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export function Billing() {
  const [searchParams]  = useSearchParams();
  const queryClient     = useQueryClient();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const justPaid = searchParams.get("success") === "1";

  const { data: status, isLoading: statusLoading } = useQuery<BillingStatus>({
    queryKey: ["billing-status"],
    queryFn:  () => api.get<BillingStatus>("/billing/status"),
    refetchInterval: justPaid ? 3000 : false,  // poll after redirect from MP
  });

  const { data: plans, isLoading: plansLoading } = useQuery<PlanConfig[]>({
    queryKey: ["billing-plans"],
    queryFn:  () => api.get<PlanConfig[]>("/billing/plans"),
    staleTime: Infinity,
  });

  const subscribeMutation = useMutation({
    mutationFn: (plan: string) =>
      api.post<{ init_point: string }>("/billing/subscribe", { plan }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["billing-status"] });
      // Redirect to Mercado Pago checkout
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

  return (
    <AppShell title="Suscripción">
      <div className="flex flex-col gap-5 p-4 animate-slide-up">

        {/* Success banner after MP redirect */}
        {justPaid && (
          <div className="bg-green-900/30 border border-green-700/40 rounded-2xl px-5 py-4 text-center">
            <p className="text-green-400 font-bold text-sm">¡Pago recibido!</p>
            <p className="text-slate-400 text-xs mt-1">
              Estamos activando tu suscripción. Puede demorar unos segundos.
            </p>
          </div>
        )}

        {/* Current status */}
        {statusLoading ? (
          <div className="h-16 bg-slate-800 rounded-2xl animate-pulse" />
        ) : status ? (
          <StatusBanner status={status} />
        ) : null}

        {/* Plan grid */}
        <section>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1 mb-3">
            Planes disponibles
          </p>

          {plansLoading ? (
            <div className="grid grid-cols-1 gap-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-56 bg-slate-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {(plans ?? []).map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  current={status?.plan ?? "free"}
                  onSubscribe={handleSubscribe}
                  loading={loadingPlan === plan.id}
                />
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-[11px] text-slate-600 pb-2">
          Los cobros se realizan mensualmente a través de Mercado Pago.
          Podés cancelar cuando quieras desde el panel de MP.
        </p>
      </div>
    </AppShell>
  );
}
