import { pool, withTenantContext, withTenantTransaction } from "../../config/database";
import { createHttpError } from "../../middleware/error.middleware";
import { historyLogRepository } from "../../shared/history-log.repository";
import {
  PublicOrderData, PublicQuote, PublicQuoteItem,
  PublicHistoryEntry, QuoteResponseDTO,
} from "./public.types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
async function findTenantId(tenantSlug: string): Promise<{ id: string; name: string; phone: string | null }> {
  const { rows } = await pool.query<{ id: string; name: string; phone: string | null }>(
    `SELECT id, name, phone FROM tenants
      WHERE slug = $1 AND deleted_at IS NULL`,
    [tenantSlug]
  );
  if (!rows[0]) throw createHttpError(404, "Taller no encontrado.");
  return rows[0];
}

// ---------------------------------------------------------------------------
// Public Service
// ---------------------------------------------------------------------------
export const publicService = {

  // ── GET order data (no auth) ────────────────────────────────────────────
  async getOrderByNumber(tenantSlug: string, orderNumber: string): Promise<PublicOrderData> {
    const tenant = await findTenantId(tenantSlug);

    return withTenantContext(tenant.id, async (client) => {

      // 1. Work order + vehicle (no client PII)
      const { rows: orders } = await client.query<{
        id: string; order_number: string; status: string;
        received_at: string; estimated_delivery: string | null; delivered_at: string | null;
        complaint: string; diagnosis: string | null;
        plate: string; brand: string; model: string;
        year: number | null; color: string | null;
      }>(
        `SELECT
            wo.id, wo.order_number, wo.status,
            wo.received_at, wo.estimated_delivery, wo.delivered_at,
            wo.complaint, wo.diagnosis,
            v.license_plate AS plate, v.brand, v.model, v.year, v.color
          FROM work_orders wo
          JOIN vehicles v ON v.id = wo.vehicle_id
         WHERE wo.order_number = $1
           AND wo.tenant_id    = $2
           AND wo.deleted_at   IS NULL`,
        [orderNumber, tenant.id]
      );

      if (!orders[0]) throw createHttpError(404, "Orden de trabajo no encontrada.");
      const wo = orders[0];

      // 2. Quotes visible to client (only 'sent', 'approved', 'rejected')
      const { rows: quotes } = await client.query<{
        id: string; quote_number: string; status: string;
        subtotal: number; tax_rate: number; tax_amount: number; total: number;
        notes: string | null; valid_until: string | null;
        approved_by_client: boolean; approved_at: string | null;
      }>(
        `SELECT id, quote_number, status,
                subtotal, tax_rate, tax_amount, total,
                notes, valid_until, approved_by_client, approved_at
           FROM quotes
          WHERE work_order_id = $1
            AND tenant_id     = $2
            AND status IN ('sent', 'approved', 'rejected')
          ORDER BY created_at DESC`,
        [wo.id, tenant.id]
      );

      // 3. Items per quote
      const publicQuotes: PublicQuote[] = [];
      for (const q of quotes) {
        const { rows: items } = await client.query<PublicQuoteItem>(
          `SELECT id, item_type, description, part_number,
                  quantity, unit_price, discount_pct, line_total, sort_order
             FROM quote_items
            WHERE quote_id  = $1
              AND tenant_id = $2
            ORDER BY sort_order, created_at`,
          [q.id, tenant.id]
        );
        publicQuotes.push({ ...q, items });
      }

      // 4. Status-change history (only status_changed events, no internal details)
      const { rows: history } = await client.query<{
        action: string; old_values: { status?: string } | null;
        new_values: { status?: string } | null; performed_at: string;
      }>(
        `SELECT action, old_values, new_values, performed_at
           FROM history_logs
          WHERE entity_id   = $1
            AND tenant_id   = $2
            AND action      IN ('status_changed', 'created',
                                'quote_approved_by_client', 'quote_rejected_by_client')
          ORDER BY performed_at ASC`,
        [wo.id, tenant.id]
      );

      const publicHistory: PublicHistoryEntry[] = history.map((h) => ({
        action:      h.action,
        from_status: (h.old_values?.status as PublicHistoryEntry["from_status"]) ?? null,
        to_status:   (h.new_values?.status as PublicHistoryEntry["to_status"])   ?? null,
        performed_at: h.performed_at,
      }));

      return {
        order_number:      wo.order_number,
        status:            wo.status as PublicOrderData["status"],
        received_at:       wo.received_at,
        estimated_delivery: wo.estimated_delivery,
        delivered_at:      wo.delivered_at,
        complaint:         wo.complaint,
        diagnosis:         wo.diagnosis,
        workshop: { name: tenant.name, phone: tenant.phone },
        vehicle: {
          plate: wo.plate, brand: wo.brand, model: wo.model,
          year: wo.year,   color: wo.color,
        },
        quotes:  publicQuotes,
        history: publicHistory,
      };
    });
  },

  // ── POST client quote response ──────────────────────────────────────────
  async respondToQuote(
    tenantSlug: string,
    orderNumber: string,
    quoteId: string,
    dto: QuoteResponseDTO,
    meta: { ip?: string; userAgent?: string }
  ): Promise<{ message: string; approved_at: string }> {

    const tenant = await findTenantId(tenantSlug);

    return withTenantTransaction(tenant.id, async (client) => {

      // 1. Validate the order exists and belongs to this tenant
      const { rows: orders } = await client.query<{ id: string }>(
        `SELECT wo.id FROM work_orders wo
          WHERE wo.order_number = $1 AND wo.tenant_id = $2 AND wo.deleted_at IS NULL`,
        [orderNumber, tenant.id]
      );
      if (!orders[0]) throw createHttpError(404, "Orden de trabajo no encontrada.");
      const workOrderId = orders[0].id;

      // 2. Validate the quote — must be in 'sent' status to be actionable
      const { rows: quotes } = await client.query<{
        id: string; quote_number: string; total: number; status: string;
      }>(
        `SELECT id, quote_number, total, status
           FROM quotes
          WHERE id = $1 AND work_order_id = $2 AND tenant_id = $3`,
        [quoteId, workOrderId, tenant.id]
      );

      if (!quotes[0]) throw createHttpError(404, "Presupuesto no encontrado.");

      const quote = quotes[0];
      if (quote.status === "approved") {
        throw createHttpError(409, "Este presupuesto ya fue aprobado previamente.");
      }
      if (quote.status === "rejected") {
        throw createHttpError(409, "Este presupuesto ya fue rechazado previamente.");
      }
      if (quote.status !== "sent") {
        throw createHttpError(422, "Este presupuesto no está disponible para aprobación.");
      }

      const newStatus = dto.action === "approve" ? "approved" : "rejected";
      const approvedAt = new Date().toISOString();

      // 3. Update quote status
      await client.query(
        `UPDATE quotes
            SET status = $1,
                approved_by_client = $2,
                approved_at = $3,
                updated_at = NOW()
          WHERE id = $4`,
        [newStatus, dto.action === "approve", approvedAt, quoteId]
      );

      // 4. Write IMMUTABLE legal log — this is the evidence record
      await historyLogRepository.create(client, {
        tenant_id:    tenant.id,
        entity_type:  "quote",
        entity_id:    quoteId,
        action:       dto.action === "approve"
          ? "quote_approved_by_client"
          : "quote_rejected_by_client",
        old_values:   { status: "sent" },
        new_values:   { status: newStatus, approved_by_client: dto.action === "approve" },
        changed_fields: ["status", "approved_by_client", "approved_at"],
        performed_by: null as unknown as string, // client action — no system user
        // ↑ sentinel UUID for "client action" — real users have a real UUID
        ip_address:   meta.ip,
        user_agent:   meta.userAgent,
        metadata: {
          quote_number:      quote.quote_number,
          quote_total:       quote.total,
          order_number:      orderNumber,
          tenant_slug:       tenantSlug,
          approval_action:   dto.action,
          rejection_reason:  dto.reason ?? null,
          legal_timestamp:   approvedAt,
          // Human-readable fingerprint for the approval certificate
          legal_summary: dto.action === "approve"
            ? `Cliente aprobó presupuesto ${quote.quote_number} por $${quote.total} el ${new Date(approvedAt).toLocaleString("es-CL")} desde IP ${meta.ip ?? "desconocida"}`
            : `Cliente rechazó presupuesto ${quote.quote_number} el ${new Date(approvedAt).toLocaleString("es-CL")} desde IP ${meta.ip ?? "desconocida"}. Motivo: ${dto.reason ?? "No especificado"}`,
        },
      });

      // 5. Also log the event against the work order for the timeline
      await historyLogRepository.create(client, {
        tenant_id:    tenant.id,
        entity_type:  "work_order",
        entity_id:    workOrderId,
        action:       dto.action === "approve"
          ? "quote_approved_by_client"
          : "quote_rejected_by_client",
        new_values:   { quote_id: quoteId, quote_number: quote.quote_number },
        performed_by: null as unknown as string, // client action — no system user
        ip_address:   meta.ip,
        user_agent:   meta.userAgent,
        metadata:     { quote_id: quoteId, quote_total: quote.total },
      });

      return {
        message: dto.action === "approve"
          ? "Presupuesto aprobado exitosamente. El taller ha sido notificado."
          : "Presupuesto rechazado. El taller ha sido notificado.",
        approved_at: approvedAt,
      };
    });
  },
};
