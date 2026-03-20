// ---------------------------------------------------------------------------
// Work Order — Canonical types aligned with DB schema
// ---------------------------------------------------------------------------

export const WORK_ORDER_STATUSES = [
  "received",
  "diagnosing",
  "awaiting_approval",   // ← client must approve quote before repair starts
  "awaiting_parts",
  "in_progress",
  "quality_control",
  "ready",
  "delivered",
  "cancelled",
] as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  received:          "Recibido",
  diagnosing:        "En diagnóstico",
  awaiting_approval: "Esperando aprobación del cliente",
  awaiting_parts:    "Esperando repuestos",
  in_progress:       "En reparación",
  quality_control:   "Control de calidad",
  ready:             "Listo para retirar",
  delivered:         "Entregado",
  cancelled:         "Cancelado",
};

export interface WorkOrder {
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
  received_by: string | null;
  received_at: Date;
  estimated_delivery: Date | null;
  delivered_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  // Payment fields (added in migration 004)
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  paid_amount:    number | null;
  paid_at:        Date | null;
  payment_notes:  string | null;
}

// Joined view with client & vehicle info (for responses)
export interface WorkOrderDetail extends WorkOrder {
  client_name: string;
  client_phone: string | null;
  vehicle_plate: string;
  vehicle_brand: string;
  vehicle_model: string;
  assigned_user_name: string | null;
}

export interface VehicleInlineData {
  license_plate: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
}

export interface ClientInlineData {
  full_name: string;
  phone: string;
  email?: string;
}

export interface CreateWorkOrderDTO {
  // Existing vehicle/client by ID — OR inline data to create them on the fly
  vehicle_id?: string;
  vehicle_data?: VehicleInlineData;
  client_id?: string;
  client_data?: ClientInlineData;
  complaint: string;
  mileage_in?: number;
  estimated_delivery?: string;
  assigned_to?: string;
  internal_notes?: string;
}

export interface TransitionWorkOrderDTO {
  status: WorkOrderStatus;
  diagnosis?: string;
  internal_notes?: string;
  mileage_out?: number;
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export type PaymentStatus = "pending" | "partial" | "paid";
export type PaymentMethod = "cash" | "transfer" | "card" | "mercadopago" | "other";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash:        "Efectivo",
  transfer:    "Transferencia",
  card:        "Tarjeta",
  mercadopago: "Mercado Pago",
  other:       "Otro",
};

export interface RecordPaymentDTO {
  payment_method: PaymentMethod;
  paid_amount:    number;
  payment_notes?: string;
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

export type QuoteItemType = "labor" | "part" | "consumable" | "external_service";

export interface CreateQuoteItemDTO {
  type:        QuoteItemType;
  description: string;
  quantity:    number;
  unit_price:  number;
}

export interface CreateQuoteDTO {
  items: CreateQuoteItemDTO[];
  notes?: string;
  /** AI-generated client summary (from voice diagnosis). Included in the WhatsApp approval message. */
  resumen_cliente?: string;
}

export interface QuoteItem {
  id:          string;
  quote_id:    string;
  type:        QuoteItemType;
  description: string;
  quantity:    number;
  unit_price:  number;
}

export interface QuoteWithItems {
  id:            string;
  tenant_id:     string;
  work_order_id: string;
  status:        "draft" | "sent" | "approved" | "rejected" | "expired";
  subtotal:      number;
  tax:           number;
  total:         number;
  notes:         string | null;
  sent_at:       string | null;
  responded_at:  string | null;
  created_at:    string;
  items:         QuoteItem[];
}
