// ---------------------------------------------------------------------------
// Work Order — Canonical types aligned with DB schema
// ---------------------------------------------------------------------------

export const WORK_ORDER_STATUSES = [
  "received",
  "diagnosing",
  "awaiting_parts",
  "in_progress",
  "quality_control",
  "ready",
  "delivered",
  "cancelled",
] as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  received:        "Recibido",
  diagnosing:      "En diagnóstico",
  awaiting_parts:  "Esperando repuestos",
  in_progress:     "En reparación",
  quality_control: "Control de calidad",
  ready:           "Listo para retirar",
  delivered:       "Entregado",
  cancelled:       "Cancelado",
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

export interface CreateWorkOrderDTO {
  vehicle_id: string;
  client_id: string;
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
