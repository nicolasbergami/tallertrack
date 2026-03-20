// Mirrors backend types

export const WORK_ORDER_STATUSES = [
  "received",
  "diagnosing",
  "awaiting_approval",
  "awaiting_parts",
  "in_progress",
  "quality_control",
  "ready",
  "delivered",
  "cancelled",
] as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export type PaymentStatus = "pending" | "partial" | "paid";
export type PaymentMethod = "cash" | "transfer" | "card" | "mercadopago" | "other";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash:        "Efectivo",
  transfer:    "Transferencia",
  card:        "Tarjeta",
  mercadopago: "Mercado Pago",
  other:       "Otro",
};

export interface WorkOrderDetail {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  client_id: string;
  order_number: string;
  status: WorkOrderStatus;
  mileage_in: number | null;
  mileage_out: number | null;
  complaint: string;
  diagnosis: string | null;
  internal_notes: string | null;
  assigned_to: string | null;
  assigned_user_name: string | null;
  received_by: string | null;
  received_at: string;
  estimated_delivery: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  // Payment fields
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  paid_amount:    number | null;
  paid_at:        string | null;
  payment_notes:  string | null;
  // Joined fields
  client_name: string;
  client_phone: string | null;
  vehicle_plate: string;
  vehicle_brand: string;
  vehicle_model: string;
}

// ---------------------------------------------------------------------------
// Quote summary (returned by GET /work-orders/:id/summary)
// ---------------------------------------------------------------------------
export type QuoteItemType = "labor" | "part" | "consumable" | "external_service";

export const QUOTE_ITEM_TYPE_LABELS: Record<QuoteItemType, string> = {
  labor:            "Mano de obra",
  part:             "Repuesto",
  consumable:       "Consumible",
  external_service: "Servicio externo",
};

export interface QuoteItem {
  id:          string;
  quote_id:    string;
  item_type:   QuoteItemType;
  description: string;
  quantity:    number;
  unit_price:  number;
  line_total:  number;
}

export interface QuoteSummary {
  id:           string;
  quote_number: string;
  status:       "draft" | "sent" | "approved" | "rejected" | "expired";
  subtotal:     number;
  tax_amount:   number;
  total:        number;
  notes:        string | null;
  approved_at:  string | null;
  items:        QuoteItem[];
}

export interface OrderSummary extends WorkOrderDetail {
  quote: QuoteSummary | null;
}

export interface CreateWorkOrderDTO {
  vehicle_id?: string;
  vehicle_data?: { license_plate: string; brand: string; model: string; year?: number; color?: string };
  client_id?: string;
  client_data?: { full_name: string; phone: string; email?: string };
  complaint: string;
  mileage_in?: number;
  estimated_delivery?: string;
  assigned_to?: string;
  internal_notes?: string;
}

export interface TransitionDTO {
  status: WorkOrderStatus;
  diagnosis?: string;
  internal_notes?: string;
  mileage_out?: number;
}

// Wizard form state (spans 3 steps)
export interface NewOrderFormState {
  // Step 1 — Vehicle
  license_plate: string;
  vehicle_id: string | null;
  brand: string;
  model: string;
  year: string;
  color: string;
  mileage_in: string;
  // Step 2 — Client
  client_id: string | null;
  client_name: string;
  client_phone: string;
  client_email: string;
  // Step 3 — Problem
  complaint: string;
  urgency: "normal" | "urgent" | "critical";
  assigned_to: string;
  internal_notes: string;
}

export const EMPTY_FORM: NewOrderFormState = {
  license_plate: "",
  vehicle_id: null,
  brand: "",
  model: "",
  year: "",
  color: "",
  mileage_in: "",
  client_id: null,
  client_name: "",
  client_phone: "",
  client_email: "",
  complaint: "",
  urgency: "normal",
  assigned_to: "",
  internal_notes: "",
};
