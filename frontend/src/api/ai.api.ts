import { api } from "./client";

// ---------------------------------------------------------------------------
// Types (mirrored from backend)
// ---------------------------------------------------------------------------

export type QuoteItemType = "labor" | "part" | "consumable" | "external_service";

export interface AiQuoteItem {
  type:                QuoteItemType;
  description:         string;
  quantity:            number;
  unit_price_estimate: number; // CLP estimate (0 if unknown)
}

export interface AiQuoteDraft {
  summary: string;
  items:   AiQuoteItem[];
  notes:   string;
}

export interface DeliveryPrediction {
  estimated_days:          number;
  estimated_date:          string;   // YYYY-MM-DD
  confidence:              "low" | "medium" | "high";
  reasoning:               string;
  similar_orders_analyzed: number;
}

export interface SaveQuoteItem {
  type:        QuoteItemType;
  description: string;
  quantity:    number;
  unit_price:  number;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export const aiApi = {
  /** Send mechanic transcript → structured quote draft */
  extractQuote: (transcript: string, complaint: string) =>
    api.post<AiQuoteDraft>("/ai/extract-quote", { transcript, complaint }),

  /** Send order context → estimated delivery date */
  predictDelivery: (params: {
    complaint:     string;
    vehicle_brand: string;
    vehicle_model: string;
  }) => api.post<DeliveryPrediction>("/ai/predict-delivery", params),

  /** Persist an AI-generated quote on a work order */
  saveQuote: (workOrderId: string, items: SaveQuoteItem[], notes?: string, resumen_cliente?: string) =>
    api.post(`/work-orders/${workOrderId}/quotes`, { items, notes, resumen_cliente }),
};
