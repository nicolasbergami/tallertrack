// ---------------------------------------------------------------------------
// Public Tracking — types exposed to unauthenticated clients (via QR URL)
// Deliberately minimal: NO client PII, NO internal notes, NO user data
// ---------------------------------------------------------------------------

import { WorkOrderStatus } from "../work-orders/work-order.types";

export interface PublicWorkshop {
  name:     string;
  phone:    string | null;
  logo_url: string | null;
}

export interface PublicVehicle {
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
}

export interface PublicQuoteItem {
  id: string;
  item_type: "labor" | "part" | "consumable" | "external_service";
  description: string;
  part_number: string | null;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  line_total: number;
  sort_order: number;
}

export interface PublicQuote {
  id: string;
  quote_number: string;
  status: "draft" | "sent" | "approved" | "rejected" | "expired";
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  valid_until: string | null;
  approved_by_client: boolean;
  approved_at: string | null;
  items: PublicQuoteItem[];
}

export interface PublicHistoryEntry {
  action: string;
  from_status: WorkOrderStatus | null;
  to_status: WorkOrderStatus | null;
  performed_at: string;
}

export interface PublicOrderData {
  order_number: string;
  status: WorkOrderStatus;
  received_at: string;
  estimated_delivery: string | null;
  delivered_at: string | null;
  complaint: string;
  diagnosis: string | null;
  workshop: PublicWorkshop;
  vehicle: PublicVehicle;
  quotes: PublicQuote[];
  history: PublicHistoryEntry[];
}

// POST body for client quote response
export interface QuoteResponseDTO {
  action: "approve" | "reject";
  reason?: string; // optional rejection reason
}
