// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------
export type BillingPlan = "starter" | "professional" | "enterprise";

export interface PlanConfig {
  id:           BillingPlan;
  displayName:  string;
  price:        number;        // ARS / month
  currency:     "ARS";
  maxUsers:     number;
  maxVehicles:  number;
  features:     string[];
}

export const PLANS: Record<BillingPlan, PlanConfig> = {
  starter: {
    id:          "starter",
    displayName: "Básico",
    price:       18_000,
    currency:    "ARS",
    maxUsers:    3,
    maxVehicles: 100,
    features: [
      "3 usuarios",
      "100 vehículos activos",
      "WhatsApp directo",
      "Seguimiento QR para clientes",
    ],
  },
  professional: {
    id:          "professional",
    displayName: "Profesional",
    price:       35_000,
    currency:    "ARS",
    maxUsers:    10,
    maxVehicles: 1_000,
    features: [
      "10 usuarios",
      "1.000 vehículos activos",
      "IA: transcripción + presupuesto",
      "Analytics de taller",
    ],
  },
  enterprise: {
    id:          "enterprise",
    displayName: "Red",
    price:       80_000,
    currency:    "ARS",
    maxUsers:    999,
    maxVehicles: 99_999,
    features: [
      "Usuarios ilimitados",
      "Vehículos ilimitados",
      "Multi-sucursal",
      "Soporte prioritario",
    ],
  },
};

// ---------------------------------------------------------------------------
// DTO / Responses
// ---------------------------------------------------------------------------
export interface CreateSubscriptionDTO {
  plan: BillingPlan;
}

export interface CreateSubscriptionResponse {
  init_point:     string;
  preapproval_id: string;
  plan:           BillingPlan;
}

export interface BillingStatusResponse {
  sub_status:             string;
  plan:                   BillingPlan | "free";
  trial_ends_at:          string | null;
  sub_current_period_end: string | null;
  is_active:              boolean;
  days_remaining:         number | null;
}

// ---------------------------------------------------------------------------
// MP API shapes (minimal — only what we use)
// ---------------------------------------------------------------------------
export interface MpPreapproval {
  id:             string;
  status:         "pending" | "authorized" | "paused" | "cancelled";
  reason:         string;
  payer_email:    string;
  external_reference: string;   // tenantId
  auto_recurring: {
    frequency:          number;
    frequency_type:     string;
    transaction_amount: number;
    currency_id:        string;
    next_payment_date?: string;
    last_charged?:      string;
  };
  date_created:   string;
  last_modified:  string;
  init_point:     string;
  sandbox_init_point?: string;
}

export interface MpPayment {
  id:                 number;
  status:             string;    // 'approved' | 'rejected' | 'pending' …
  status_detail:      string;
  transaction_amount: number;
  currency_id:        string;
  external_reference: string;    // tenantId
  metadata?: {
    preapproval_id?: string;
  };
}

export interface MpWebhookBody {
  type:         string;  // 'subscription_preapproval' | 'payment' | …
  action?:      string;
  id:           number | string;   // notification ID
  data: {
    id: string;                    // entity ID
  };
  live_mode?:   boolean;
  user_id?:     string;
  date_created: string;
}
