import { useState, useCallback } from "react";
import { useAuthStore } from "../store/auth.store";

// ── Subscription plans ──────────────────────────────────────────────────────

export type SubscriptionPlan = "free" | "starter" | "professional" | "enterprise";

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free:         0,
  starter:      1,
  professional: 2,
  enterprise:   3,
};

export const PLAN_DISPLAY: Record<SubscriptionPlan, string> = {
  free:         "Plan Gratis",
  starter:      "Plan Starter",
  professional: "Plan Profesional",
  enterprise:   "Plan Enterprise",
};

// ── Premium features ────────────────────────────────────────────────────────

export type PremiumFeature =
  | "voice_diagnosis"
  | "ai_quote"
  | "delivery_prediction"
  | "brand_logo";

export interface FeatureGateConfig {
  /** Large emoji shown as the feature icon */
  icon: string;
  /** CSS gradient for the icon's background card */
  iconBg: string;
  /** CSS color string for the radial glow behind the icon */
  iconGlow: string;
  /** Tailwind text-color class for accents (badge, checkmarks) */
  accentText: string;
  /** Tailwind bg-color class for accent backgrounds */
  accentBg: string;
  /** Tailwind border-color class */
  accentBorder: string;
  /** Modal headline */
  title: string;
  /** One-liner value proposition */
  subtitle: string;
  /** Minimum plan required */
  planRequired: SubscriptionPlan;
  /** Feature bullet points (3-4 items) */
  perks: string[];
  /** CTA button label */
  ctaLabel: string;
  /** CSS gradient for the CTA button */
  ctaGradient: string;
  /** CSS color string for the CTA's breathing glow animation */
  ctaGlow: string;
}

export const FEATURE_GATES: Record<PremiumFeature, FeatureGateConfig> = {
  voice_diagnosis: {
    icon:         "🎤",
    iconBg:       "linear-gradient(145deg, #1C0A00 0%, #3D1106 60%, #1C0A00 100%)",
    iconGlow:     "rgba(249, 115, 22, 0.55)",
    accentText:   "text-orange-400",
    accentBg:     "bg-orange-500/15",
    accentBorder: "border-orange-500/40",
    title:        "Desbloqueá el Diagnóstico con IA",
    subtitle:
      "Dictá el problema del auto con tu voz y TallerTrack genera el presupuesto solo. En segundos.",
    planRequired: "professional",
    perks: [
      "Diagnóstico por voz transcripto con Whisper IA",
      "Presupuesto completo generado automáticamente",
      "Resumen en lenguaje simple para el cliente",
      "Envío directo por WhatsApp con un toque",
    ],
    ctaLabel:     "Ver Plan Profesional",
    ctaGradient:  "linear-gradient(135deg, #C2410C 0%, #F97316 50%, #FB923C 100%)",
    ctaGlow:      "rgba(249, 115, 22, 0.6)",
  },

  ai_quote: {
    icon:         "✨",
    iconBg:       "linear-gradient(145deg, #13052E 0%, #2E0B6A 60%, #13052E 100%)",
    iconGlow:     "rgba(139, 92, 246, 0.55)",
    accentText:   "text-violet-400",
    accentBg:     "bg-violet-500/15",
    accentBorder: "border-violet-500/40",
    title:        "Presupuesto Inteligente con IA",
    subtitle:
      "Describí el trabajo con palabras y la IA extrae los ítems del presupuesto automáticamente.",
    planRequired: "starter",
    perks: [
      "Extracción automática de repuestos y mano de obra",
      "Precios estimados basados en historial",
      "Edición rápida antes de enviar al cliente",
    ],
    ctaLabel:     "Activar Plan Starter",
    ctaGradient:  "linear-gradient(135deg, #6D28D9 0%, #8B5CF6 50%, #A78BFA 100%)",
    ctaGlow:      "rgba(139, 92, 246, 0.6)",
  },

  brand_logo: {
    icon:         "🎨",
    iconBg:       "linear-gradient(145deg, #12051F 0%, #2D0D59 60%, #12051F 100%)",
    iconGlow:     "rgba(139, 92, 246, 0.55)",
    accentText:   "text-violet-400",
    accentBg:     "bg-violet-500/15",
    accentBorder: "border-violet-500/40",
    title:        "Personalizá tu Marca",
    subtitle:
      "Mostrá el logo de tu taller en los presupuestos que reciben tus clientes. Tu identidad, tu imagen.",
    planRequired: "professional",
    perks: [
      "Logo en todos los presupuestos digitales",
      "Primera impresión profesional para tus clientes",
      "Diferenciá tu taller de la competencia",
    ],
    ctaLabel:     "Activar Plan Taller Pro",
    ctaGradient:  "linear-gradient(135deg, #6D28D9 0%, #8B5CF6 50%, #A78BFA 100%)",
    ctaGlow:      "rgba(139, 92, 246, 0.6)",
  },

  delivery_prediction: {
    icon:         "🗓️",
    iconBg:       "linear-gradient(145deg, #041A0D 0%, #0D3320 60%, #041A0D 100%)",
    iconGlow:     "rgba(34, 197, 94, 0.5)",
    accentText:   "text-green-400",
    accentBg:     "bg-green-500/15",
    accentBorder: "border-green-500/40",
    title:        "Predicción de Entrega con IA",
    subtitle:
      "Decile a tu cliente cuándo estará listo su auto antes de empezar la reparación.",
    planRequired: "professional",
    perks: [
      "Estimación basada en historial real de tu taller",
      "Aumenta la confianza y reduce llamados",
      "Fecha de entrega sugerida al crear la orden",
    ],
    ctaLabel:     "Ver Plan Profesional",
    ctaGradient:  "linear-gradient(135deg, #15803D 0%, #22C55E 50%, #4ADE80 100%)",
    ctaGlow:      "rgba(34, 197, 94, 0.55)",
  },
};

// ── Plan check helpers ──────────────────────────────────────────────────────

/**
 * Resolves the *effective* plan for access checks.
 *
 * Business rule: trial users get professional-level access.
 * If sub_status === "trialing" we treat the plan as "professional"
 * regardless of what the plan field says.
 */
export function effectivePlan(
  userPlan:  SubscriptionPlan | undefined,
  subStatus: string | undefined,
): SubscriptionPlan {
  if (subStatus === "trialing") return "professional";
  return userPlan ?? "free";
}

/**
 * Returns true when the user can access the given feature.
 *
 * Pass `subStatus` so that trialing users are treated as professional.
 */
export function isFeatureAvailable(
  userPlan:  SubscriptionPlan | undefined,
  feature:   PremiumFeature,
  subStatus?: string,
): boolean {
  const cfg     = FEATURE_GATES[feature];
  const current = effectivePlan(userPlan, subStatus);
  return PLAN_RANK[current] >= PLAN_RANK[cfg.planRequired];
}

// ── useSubscription hook ────────────────────────────────────────────────────

/**
 * Central hook for subscription state.
 * Use this everywhere instead of reading plan/sub_status directly.
 *
 * Business rule baked in: trialing === professional benefits.
 */
export function useSubscription() {
  const plan      = useAuthStore(s => s.user?.plan);
  const subStatus = useAuthStore(s => s.user?.sub_status);

  const resolved  = effectivePlan(plan, subStatus);
  const isTrialing = subStatus === "trialing";

  return {
    plan,
    subStatus,
    /** Plan after applying trial promotion ("trialing" → "professional") */
    effectivePlan:          resolved,
    isTrialing,
    isProOrHigher:          PLAN_RANK[resolved] >= PLAN_RANK["professional"],
    isEnterpriseOrHigher:   PLAN_RANK[resolved] >= PLAN_RANK["enterprise"],
    /** Convenience: check a single feature gate */
    canAccess: (feature: PremiumFeature) =>
      isFeatureAvailable(plan, feature, subStatus),
  };
}

// ── usePremiumGate hook ─────────────────────────────────────────────────────

/**
 * Returns a `gate()` function that:
 *   - returns true  → user has access, proceed normally
 *   - returns false → user does NOT have access, paywall modal shown automatically
 *
 * Trialing users are treated as professional (no paywall shown).
 *
 * Usage:
 *   const { gate, modal } = usePremiumGate("voice_diagnosis");
 *   onClick={() => gate() && startRecording()}
 */
export function usePremiumGate(feature: PremiumFeature) {
  const plan      = useAuthStore(s => s.user?.plan);
  const subStatus = useAuthStore(s => s.user?.sub_status);
  const [open, setOpen] = useState(false);

  const gate = useCallback((): boolean => {
    if (isFeatureAvailable(plan, feature, subStatus)) return true;
    setOpen(true);
    return false;
  }, [plan, subStatus, feature]);

  return { gate, paywallOpen: open, setPaywallOpen: setOpen };
}
