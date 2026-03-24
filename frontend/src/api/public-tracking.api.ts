// Public tracking API — no auth token required
function resolvePublicBase(): string {
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h.includes("-qa")) return "https://tallertrack-qa.up.railway.app/api/v1/public";
  }
  const configured = import.meta.env.VITE_API_URL as string | undefined;
  if (configured) return `${configured.replace(/\/+$/, "")}/api/v1/public`;
  return "/api/v1/public";
}
const BASE_URL = resolvePublicBase();

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
  from_status: string | null;
  to_status: string | null;
  performed_at: string;
}

export interface PublicOrderData {
  order_number: string;
  status: string;
  received_at: string;
  estimated_delivery: string | null;
  delivered_at: string | null;
  complaint: string;
  diagnosis: string | null;
  workshop: { name: string; phone: string | null; logo_url: string | null };
  vehicle: { plate: string; brand: string; model: string; year: number | null; color: string | null };
  quotes: PublicQuote[];
  history: PublicHistoryEntry[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body as T;
}

async function post<T>(path: string, data: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body as T;
}

export const publicTrackingApi = {
  getOrder: (tenantSlug: string, orderNumber: string) =>
    get<PublicOrderData>(`/orders/${tenantSlug}/${orderNumber}`),

  respondToQuote: (
    tenantSlug: string,
    orderNumber: string,
    quoteId: string,
    action: "approve" | "reject",
    reason?: string
  ) =>
    post<{ message: string; approved_at: string }>(
      `/orders/${tenantSlug}/${orderNumber}/quotes/${quoteId}/respond`,
      { action, reason }
    ),
};
