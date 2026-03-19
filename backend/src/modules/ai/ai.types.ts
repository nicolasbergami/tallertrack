// ---------------------------------------------------------------------------
// AI module — shared types for quote extraction and delivery prediction
// ---------------------------------------------------------------------------

export type QuoteItemType = "labor" | "part" | "consumable" | "external_service";

export interface AiQuoteItem {
  type: QuoteItemType;
  description: string;
  quantity: number;
  unit_price_estimate: number; // CLP; 0 if unknown
}

export interface AiQuoteDraft {
  summary: string;
  items: AiQuoteItem[];
  notes: string;
}

export interface DeliveryPrediction {
  estimated_days: number;
  estimated_date: string;          // YYYY-MM-DD
  confidence: "low" | "medium" | "high";
  reasoning: string;               // Spanish explanation
  similar_orders_analyzed: number;
}
