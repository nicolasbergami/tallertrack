import { anthropic } from "../../integrations/ai/claude.client";
import { withTenantContext }   from "../../config/database";
import { AiQuoteDraft, DeliveryPrediction } from "./ai.types";

// ---------------------------------------------------------------------------
// Tool input schemas (mirrored here for TypeScript casting)
// ---------------------------------------------------------------------------

interface QuoteDraftInput {
  summary: string;
  items: { type: string; description: string; quantity: number; unit_price_estimate: number }[];
  notes: string;
}

interface PredictionInput {
  estimated_days: number;
  confidence: "low" | "medium" | "high";
  reasoning: string;
  similar_orders_analyzed: number;
}

// ---------------------------------------------------------------------------
// AI Service
// ---------------------------------------------------------------------------

export const aiService = {

  /**
   * Receives a plain-text transcript dictated by the mechanic and uses Claude
   * to extract a structured quote draft with labor/parts/consumable items.
   */
  async extractQuoteFromTranscript(
    transcript: string,
    complaint: string,
  ): Promise<AiQuoteDraft> {

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: `Eres un asistente de presupuesto para talleres mecánicos en Chile.
Analiza la transcripción del mecánico y extrae los ítems de trabajo.
Los precios son en pesos chilenos (CLP). Si no sabes el precio exacto, estima según el mercado chileno actual.
Categorías disponibles: labor (mano de obra), part (repuesto), consumable (consumible), external_service (servicio externo).
Sé específico en las descripciones. Si el mecánico menciona un repuesto, inclúyelo como "part".
Si menciona una tarea (revisar, cambiar, ajustar), inclúyela como "labor".`,
      tools: [
        {
          name: "save_quote_draft",
          description: "Guarda el borrador de presupuesto estructurado extraído de la transcripción",
          input_schema: {
            type: "object",
            properties: {
              summary: {
                type: "string",
                description: "Resumen breve en español del trabajo a realizar",
              },
              items: {
                type: "array",
                description: "Lista de ítems del presupuesto",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["labor", "part", "consumable", "external_service"],
                    },
                    description: {
                      type: "string",
                      description: "Descripción clara del ítem",
                    },
                    quantity: {
                      type: "number",
                      description: "Cantidad (unidades, horas, etc.)",
                    },
                    unit_price_estimate: {
                      type: "number",
                      description: "Precio unitario estimado en CLP. Usa 0 si no puedes estimar.",
                    },
                  },
                  required: ["type", "description", "quantity", "unit_price_estimate"],
                  additionalProperties: false,
                },
              },
              notes: {
                type: "string",
                description: "Notas adicionales o advertencias para el cliente",
              },
            },
            required: ["summary", "items", "notes"],
            additionalProperties: false,
          },
        },
      ],
      tool_choice: { type: "tool", name: "save_quote_draft" },
      messages: [
        {
          role: "user",
          content:
            `Falla reportada por el cliente: ${complaint}\n\n` +
            `Transcripción del mecánico:\n"${transcript}"`,
        },
      ],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("El servicio de IA no pudo procesar la transcripción");
    }

    const input = toolUse.input as QuoteDraftInput;
    return {
      summary: input.summary,
      notes:   input.notes,
      items:   input.items.map((i) => ({
        type:               i.type as AiQuoteDraft["items"][0]["type"],
        description:        i.description,
        quantity:           i.quantity,
        unit_price_estimate: i.unit_price_estimate,
      })),
    };
  },

  /**
   * Queries historical completed work orders for the tenant and asks Claude
   * to predict how long the new order will take, returning an estimated date.
   */
  async predictDelivery(
    tenantId: string,
    context: { complaint: string; vehicle_brand: string; vehicle_model: string },
  ): Promise<DeliveryPrediction> {

    // ── Pull last 40 completed orders for this tenant ──────────────────────
    const historicalRows = await withTenantContext(tenantId, async (client) => {
      const result = await client.query<{
        hours_to_complete: number;
        complaint:         string | null;
        diagnosis:         string | null;
      }>(
        `SELECT
           ROUND(EXTRACT(EPOCH FROM (delivered_at - received_at)) / 3600)::int AS hours_to_complete,
           complaint,
           diagnosis
         FROM work_orders
         WHERE tenant_id = $1
           AND status = 'delivered'
           AND delivered_at IS NOT NULL
           AND deleted_at  IS NULL
         ORDER BY delivered_at DESC
         LIMIT 40`,
        [tenantId],
      );
      return result.rows;
    });

    const historicalSummary = historicalRows.length > 0
      ? historicalRows
          .map((r) => `${r.hours_to_complete}h | ${(r.complaint ?? "").slice(0, 80)}`)
          .join("\n")
      : "Sin historial previo disponible en este taller.";

    // ── Ask Claude to predict delivery ─────────────────────────────────────
    const response = await anthropic.messages.create({
      model:    "claude-opus-4-6",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: `Eres un asistente de predicción de tiempos para talleres mecánicos chilenos.
Analiza el historial de órdenes completadas (tiempo real en horas) y la nueva orden
para predecir cuántos días hábiles tardará en completarse.
Considera que el taller trabaja ~8 horas por día. Sé realista y conservador.`,
      tools: [
        {
          name: "predict_delivery",
          description: "Entrega la predicción de tiempo de entrega para la nueva orden",
          input_schema: {
            type: "object",
            properties: {
              estimated_days: {
                type: "number",
                description: "Días hábiles estimados hasta la entrega",
              },
              confidence: {
                type: "string",
                enum: ["low", "medium", "high"],
                description: "Confianza en la predicción según datos disponibles",
              },
              reasoning: {
                type: "string",
                description: "Explicación breve en español del criterio usado",
              },
              similar_orders_analyzed: {
                type: "number",
                description: "Cuántas órdenes históricas similares se consideraron",
              },
            },
            required: ["estimated_days", "confidence", "reasoning", "similar_orders_analyzed"],
            additionalProperties: false,
          },
        },
      ],
      tool_choice: { type: "tool", name: "predict_delivery" },
      messages: [
        {
          role: "user",
          content:
            `Nueva orden:\n` +
            `Vehículo: ${context.vehicle_brand} ${context.vehicle_model}\n` +
            `Falla: ${context.complaint}\n\n` +
            `Historial de órdenes completadas en este taller (horas reales | falla):\n` +
            historicalSummary,
        },
      ],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("El servicio de IA no pudo predecir la fecha de entrega");
    }

    const result = toolUse.input as PredictionInput;

    // ── Compute calendar date skipping weekends ─────────────────────────────
    const estimatedDate = new Date();
    let daysAdded = 0;
    while (daysAdded < result.estimated_days) {
      estimatedDate.setDate(estimatedDate.getDate() + 1);
      const dow = estimatedDate.getDay();
      if (dow !== 0 && dow !== 6) daysAdded++; // skip Sun/Sat
    }

    return {
      estimated_days:           result.estimated_days,
      estimated_date:           estimatedDate.toISOString().split("T")[0],
      confidence:               result.confidence,
      reasoning:                result.reasoning,
      similar_orders_analyzed:  result.similar_orders_analyzed,
    };
  },
};
