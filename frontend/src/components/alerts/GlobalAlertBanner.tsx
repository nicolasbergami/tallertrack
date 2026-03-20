import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useAuthStore } from "../../store/auth.store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type WaStatus = "not_started" | "connecting" | "qr" | "connected" | "disconnected";

interface WaStatusResponse {
  status: WaStatus;
  phone:  string | null;
}

interface BillingStatusResponse {
  sub_status:    string;
  plan:          string;
  is_active:     boolean;
  days_remaining: number | null;
  trial_ends_at:  string | null;
}

interface Alert {
  id:      string;
  level:   "red" | "amber";
  message: string;
  action:  { label: string; to: string };
}

// ---------------------------------------------------------------------------
// GlobalAlertBanner
// ---------------------------------------------------------------------------
export function GlobalAlertBanner() {
  const navigate   = useNavigate();
  const user       = useAuthStore((s) => s.user);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: waStatus } = useQuery<WaStatusResponse>({
    queryKey:       ["whatsapp-status"],
    queryFn:        () => api.get<WaStatusResponse>("/whatsapp/status"),
    refetchInterval: 60_000,
    // Only fetch if user is owner/admin — others don't manage WA
    enabled: user?.role === "owner" || user?.role === "admin",
  });

  const { data: billing } = useQuery<BillingStatusResponse>({
    queryKey:       ["billing-status"],
    queryFn:        () => api.get<BillingStatusResponse>("/billing/status"),
    refetchInterval: 5 * 60_000,
    enabled: user?.role === "owner" || user?.role === "admin",
  });

  // Build active alerts list
  const alerts: Alert[] = [];

  if (waStatus?.status === "disconnected") {
    alerts.push({
      id:      "wa-disconnected",
      level:   "red",
      message: "WhatsApp desconectado. Los clientes no están recibiendo notificaciones.",
      action:  { label: "Reconectar", to: "/profile" },
    });
  }

  if (billing) {
    const { sub_status, is_active, days_remaining } = billing;

    if (sub_status === "trialing" && days_remaining !== null && days_remaining <= 3) {
      const daysText = days_remaining <= 0
        ? "hoy"
        : days_remaining === 1
          ? "en 1 día"
          : `en ${days_remaining} días`;
      alerts.push({
        id:      "trial-expiring",
        level:   "amber",
        message: `Tu período de prueba vence ${daysText}. Activá tu plan para continuar.`,
        action:  { label: "Ver plan", to: "/billing" },
      });
    } else if (!is_active && sub_status !== "trialing") {
      alerts.push({
        id:      "sub-inactive",
        level:   "red",
        message: "Tu suscripción está inactiva. Renovála para seguir usando TallerTrack.",
        action:  { label: "Ver plan", to: "/billing" },
      });
    }
  }

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  function dismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  return (
    <div className="flex flex-col">
      {visible.map((alert) => (
        <AlertRow
          key={alert.id}
          alert={alert}
          onDismiss={() => dismiss(alert.id)}
          onAction={() => navigate(alert.action.to)}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AlertRow
// ---------------------------------------------------------------------------
function AlertRow({
  alert, onDismiss, onAction,
}: {
  alert:     Alert;
  onDismiss: () => void;
  onAction:  () => void;
}) {
  const isRed = alert.level === "red";

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium
                  ${isRed
                    ? "bg-red-950/80 border-b border-red-900/50 text-red-200"
                    : "bg-amber-950/70 border-b border-amber-800/40 text-amber-200"
                  }`}
    >
      {/* Icon */}
      <span className="flex-shrink-0 text-base leading-none" aria-hidden>
        {isRed ? "⚠️" : "⏳"}
      </span>

      {/* Message */}
      <p className="flex-1 leading-snug">{alert.message}</p>

      {/* Action button */}
      <button
        onClick={onAction}
        className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold
                    transition-colors
                    ${isRed
                      ? "bg-red-700/60 hover:bg-red-600/70 text-red-100 border border-red-600/40"
                      : "bg-amber-700/50 hover:bg-amber-600/60 text-amber-100 border border-amber-600/40"
                    }`}
      >
        {alert.action.label}
      </button>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        aria-label="Cerrar"
        className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg
                    transition-colors text-lg leading-none
                    ${isRed
                      ? "text-red-500 hover:text-red-300 hover:bg-red-900/40"
                      : "text-amber-600 hover:text-amber-300 hover:bg-amber-900/30"
                    }`}
      >
        ×
      </button>
    </div>
  );
}
