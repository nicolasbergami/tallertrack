import { withTenantContext, withTenantTransaction } from "../../config/database";
import { workOrderRepository } from "./work-order.repository";
import { historyLogRepository } from "../../shared/history-log.repository";
import { WorkOrderStateMachine } from "./state-machine/transitions";
import { buildMessage } from "../../integrations/whatsapp/templates";
import { whatsappService } from "../../integrations/whatsapp/whatsapp.service";
import { sessionManager } from "../../integrations/whatsapp-direct/session-manager";
import { qrService } from "../../integrations/qr/qr.service";
import {
  WorkOrder,
  WorkOrderDetail,
  WorkOrderStatus,
  CreateWorkOrderDTO,
  TransitionWorkOrderDTO,
  CreateQuoteDTO,
  QuoteWithItems,
  RecordPaymentDTO,
} from "./work-order.types";
import { generateRemitoPdf } from "./remito.generator";
import { env } from "../../config/env";
import { createHttpError } from "../../middleware/error.middleware";

// ---------------------------------------------------------------------------
// Helper: normalize an Argentine phone number to WhatsApp format (549XXXXXXXXXX)
// Examples:
//   3535632678     → 5493535632678
//   03535632678    → 5493535632678  (strips leading 0)
//   543535632678   → 5493535632678  (inserts mobile 9)
//   5493535632678  → 5493535632678  (already correct)
// ---------------------------------------------------------------------------
function normalizeArgentinePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.startsWith("549")) return digits;
  if (digits.startsWith("54")) return "549" + digits.slice(2);
  return "549" + digits;
}

// ---------------------------------------------------------------------------
// Helper: fetch tenant slug + name for QR / tracking URL / notifications
// ---------------------------------------------------------------------------
async function getTenantInfo(tenantId: string): Promise<{ slug: string; name: string; phone: string | null }> {
  return withTenantContext(tenantId, async (client) => {
    const { rows } = await client.query<{ slug: string; name: string; phone: string | null }>(
      `SELECT slug, name, phone FROM tenants WHERE id = $1`,
      [tenantId]
    );
    if (!rows[0]) throw createHttpError(404, "Tenant not found.");
    return rows[0];
  });
}

// Keep backward-compat alias used in getQrCode
async function getTenantSlug(tenantId: string): Promise<string> {
  return (await getTenantInfo(tenantId)).slug;
}

// ---------------------------------------------------------------------------
// Work Order Service
// ---------------------------------------------------------------------------
export const workOrderService = {
  async list(
    tenantId: string,
    filters: { status?: WorkOrderStatus; limit?: number; offset?: number }
  ) {
    return withTenantContext(tenantId, (client) =>
      workOrderRepository.findAll(client, tenantId, filters)
    );
  },

  async getById(tenantId: string, id: string): Promise<WorkOrderDetail> {
    return withTenantContext(tenantId, (client) =>
      workOrderRepository.findById(client, id, tenantId)
    );
  },

  // -------------------------------------------------------------------------
  // Create a new work order (always starts at 'received')
  // -------------------------------------------------------------------------
  async create(
    tenantId: string,
    userId: string,
    dto: CreateWorkOrderDTO,
    requestMeta: { ip?: string; userAgent?: string }
  ): Promise<WorkOrder> {
    return withTenantTransaction(tenantId, async (client) => {

      // ── 1. Resolve (or create) client ──────────────────────────────────────
      let clientId = dto.client_id;
      if (!clientId) {
        const cd = dto.client_data!;
        const { rows: clientRows } = await client.query<{ id: string }>(
          `INSERT INTO clients (tenant_id, full_name, phone, email, created_by)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [tenantId, cd.full_name, cd.phone, cd.email ?? null, userId]
        );
        clientId = clientRows[0].id;
      }

      // ── 2. Resolve (or upsert) vehicle ─────────────────────────────────────
      let vehicleId = dto.vehicle_id;
      if (!vehicleId) {
        const vd = dto.vehicle_data!;
        const plate = vd.license_plate.toUpperCase().replace(/\s/g, "");
        const { rows: vehicleRows } = await client.query<{ id: string }>(
          `INSERT INTO vehicles (tenant_id, client_id, license_plate, brand, model, year, color)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (tenant_id, license_plate) DO UPDATE
             SET brand      = EXCLUDED.brand,
                 model      = EXCLUDED.model,
                 year       = COALESCE(EXCLUDED.year,  vehicles.year),
                 color      = COALESCE(EXCLUDED.color, vehicles.color),
                 updated_at = NOW()
           RETURNING id`,
          [tenantId, clientId, plate, vd.brand, vd.model, vd.year ?? null, vd.color ?? null]
        );
        vehicleId = vehicleRows[0].id;
      }

      const workOrder = await workOrderRepository.create(client, tenantId, userId, {
        ...dto,
        vehicle_id: vehicleId!,
        client_id:  clientId!,
      });

      await historyLogRepository.create(client, {
        tenant_id:    tenantId,
        entity_type:  "work_order",
        entity_id:    workOrder.id,
        action:       "created",
        new_values:   { status: "received", order_number: workOrder.order_number },
        performed_by: userId,
        ip_address:   requestMeta.ip,
        user_agent:   requestMeta.userAgent,
      });

      return workOrder;
    });
  },

  // -------------------------------------------------------------------------
  // Transition to a new status — the main business operation
  // -------------------------------------------------------------------------
  async transition(
    tenantId: string,
    workOrderId: string,
    userId: string,
    dto: TransitionWorkOrderDTO,
    requestMeta: { ip?: string; userAgent?: string }
  ): Promise<WorkOrderDetail> {
    return withTenantTransaction(tenantId, async (client) => {
      // 1. Fetch current state
      const current = await workOrderRepository.findById(client, workOrderId, tenantId);

      // 2a. Guard: transitions OUT of awaiting_approval to in_progress or awaiting_parts
      //     are normally reserved for the client via the public /approve and /reject endpoints.
      //     Exception: if the quote was already approved by the client (e.g. bugged state),
      //     allow the internal user to advance manually.
      if (
        current.status === "awaiting_approval" &&
        (dto.status === "in_progress" || dto.status === "awaiting_parts")
      ) {
        const { rows: approvedQuotes } = await client.query<{ id: string }>(
          `SELECT id FROM quotes
            WHERE work_order_id = $1 AND tenant_id = $2
              AND approved_by_client = true
            LIMIT 1`,
          [workOrderId, tenantId],
        );
        if (!approvedQuotes[0]) {
          throw createHttpError(
            403,
            "La orden espera aprobación del cliente. La reparación comenzará automáticamente cuando el cliente apruebe el presupuesto."
          );
        }
      }

      // 2b. Validate transition — throws TransitionError if invalid
      WorkOrderStateMachine.assertTransition(current.status, dto.status);

      // 3. Persist new state
      await workOrderRepository.updateStatus(client, workOrderId, tenantId, dto.status, {
        diagnosis:     dto.diagnosis,
        internal_notes: dto.internal_notes,
        mileage_out:   dto.mileage_out,
      });

      // 4. Immutable audit log
      await historyLogRepository.logStatusChange(client, {
        tenant_id:    tenantId,
        work_order_id: workOrderId,
        from_status:  current.status,
        to_status:    dto.status,
        performed_by: userId,
        ip_address:   requestMeta.ip,
        user_agent:   requestMeta.userAgent,
      });

      // 5. Fetch updated detail (with joined fields) BEFORE releasing the transaction
      const updated = await workOrderRepository.findById(client, workOrderId, tenantId);

      return updated;
    }).then(async (updated) => {
      // 6. Fire-and-forget WhatsApp notification — OUTSIDE the transaction
      //    A WhatsApp failure must never rollback the DB change.
      this._notifyClient(tenantId, updated, dto.status).catch((err) =>
        console.error("[WorkOrderService] WhatsApp notification failed:", err)
      );

      return updated;
    });
  },

  // -------------------------------------------------------------------------
  // QR Code generation
  // -------------------------------------------------------------------------
  async getQrCode(
    tenantId: string,
    workOrderId: string
  ): Promise<{ url: string; pngBuffer: Buffer; base64: string }> {
    const [workOrder, tenantSlug] = await Promise.all([
      this.getById(tenantId, workOrderId),
      getTenantSlug(tenantId),
    ]);

    return qrService.generateForWorkOrder(tenantSlug, workOrder.order_number);
  },

  // -------------------------------------------------------------------------
  // Returns available transitions for a given order (useful for frontend)
  // -------------------------------------------------------------------------
  async getAvailableTransitions(tenantId: string, workOrderId: string) {
    const workOrder = await this.getById(tenantId, workOrderId);
    const transitions = WorkOrderStateMachine.getAvailableTransitions(workOrder.status);
    return { current: workOrder.status, available: transitions };
  },

  // -------------------------------------------------------------------------
  // Create a quote for a work order.
  // If the order is in 'diagnosing' state, the system:
  //   1. Marks the quote as 'sent'
  //   2. Auto-transitions the work order to 'awaiting_approval'
  //   3. Logs the transition
  //   4. Fires a WhatsApp message to the client with the AI summary + approval links
  // -------------------------------------------------------------------------
  async createQuote(
    tenantId: string,
    workOrderId: string,
    dto: CreateQuoteDTO,
    userId: string,
    requestMeta: { ip?: string; userAgent?: string },
  ): Promise<QuoteWithItems> {
    // Verify work order exists and load current status + client_phone
    const workOrder = await this.getById(tenantId, workOrderId);
    const isDiagnosing = workOrder.status === "diagnosing";

    const result = await withTenantTransaction(tenantId, async (client) => {
      const quote = await workOrderRepository.createQuote(client, tenantId, workOrderId, dto);

      if (isDiagnosing) {
        // 1. Promote quote to 'sent'
        await client.query(
          `UPDATE quotes SET status = 'sent', updated_at = NOW() WHERE id = $1`,
          [quote.id],
        );

        // 2. Auto-transition work order → awaiting_approval
        await workOrderRepository.updateStatus(
          client, workOrderId, tenantId, "awaiting_approval", {},
        );

        // 3. Immutable status-change log
        await historyLogRepository.logStatusChange(client, {
          tenant_id:    tenantId,
          work_order_id: workOrderId,
          from_status:  "diagnosing",
          to_status:    "awaiting_approval",
          performed_by: userId,
          ip_address:   requestMeta.ip,
          user_agent:   requestMeta.userAgent,
        });

        // 4. Additional log entry: quote was sent to client
        await historyLogRepository.create(client, {
          tenant_id:     tenantId,
          entity_type:   "work_order",
          entity_id:     workOrderId,
          action:        "quote_sent_to_client",
          new_values:    { quote_id: quote.id, quote_status: "sent" },
          performed_by:  userId,
          ip_address:    requestMeta.ip,
          user_agent:    requestMeta.userAgent,
          metadata:      { quote_total: quote.total },
        });

        return { ...quote, status: "sent" as const };
      }

      return quote;
    });

    // Fire-and-forget WhatsApp AFTER the transaction (never blocks the DB write)
    if (isDiagnosing) {
      this._notifyClientQuoteSent(tenantId, workOrder, dto.resumen_cliente).catch((err) =>
        console.error("[WorkOrderService] WhatsApp quote notification failed:", err)
      );
    }

    return result;
  },

  // -------------------------------------------------------------------------
  // Record a payment for a work order
  // -------------------------------------------------------------------------
  async recordPayment(
    tenantId: string,
    workOrderId: string,
    dto: RecordPaymentDTO
  ): Promise<WorkOrderDetail> {
    return withTenantTransaction(tenantId, async (client) => {
      await workOrderRepository.recordPayment(client, workOrderId, tenantId, dto);
      return workOrderRepository.findById(client, workOrderId, tenantId);
    });
  },

  // -------------------------------------------------------------------------
  // Generate remito PDF for a work order
  // -------------------------------------------------------------------------
  async getRemitoPdf(tenantId: string, workOrderId: string): Promise<Buffer> {
    const [order, tenantInfo] = await Promise.all([
      this.getById(tenantId, workOrderId),
      withTenantContext(tenantId, async (client) => {
        const { rows } = await client.query<{
          name: string; tax_id: string | null; phone: string | null;
          email: string | null; address: string | null; city: string | null;
        }>(
          `SELECT name, tax_id, phone, email, address, city FROM tenants WHERE id = $1`,
          [tenantId]
        );
        return rows[0];
      }),
    ]);

    const quote = await withTenantContext(tenantId, (client) =>
      workOrderRepository.getLatestQuote(client, workOrderId, tenantId)
    );

    return generateRemitoPdf(order, quote, tenantInfo);
  },

  // -------------------------------------------------------------------------
  // Client approves the quote → in_progress + WhatsApp + immutable audit log
  // Called by the public /approve endpoint (no JWT, identified by work order UUID)
  // -------------------------------------------------------------------------
  async approveByClient(
    tenantId: string,
    workOrderId: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<void> {
    const updated = await withTenantTransaction(tenantId, async (client) => {
      const workOrder = await workOrderRepository.findById(client, workOrderId, tenantId);

      if (workOrder.status !== "awaiting_approval") {
        throw createHttpError(
          409,
          "Esta orden no está esperando aprobación del cliente."
        );
      }

      // Find latest sent quote
      const { rows: quoteRows } = await client.query<{
        id: string; total: number; quote_number: string;
      }>(
        `SELECT id, total, quote_number FROM quotes
          WHERE work_order_id = $1 AND tenant_id = $2 AND status = 'sent'
          ORDER BY created_at DESC LIMIT 1`,
        [workOrderId, tenantId],
      );
      if (!quoteRows[0]) {
        throw createHttpError(422, "No hay presupuesto pendiente de aprobación.");
      }
      const quote = quoteRows[0];
      const approvedAt = new Date().toISOString();

      // Approve quote
      await client.query(
        `UPDATE quotes
            SET status = 'approved', approved_by_client = true,
                approved_at = $1, updated_at = NOW()
          WHERE id = $2`,
        [approvedAt, quote.id],
      );

      // Transition work order
      await workOrderRepository.updateStatus(client, workOrderId, tenantId, "in_progress", {});

      // Immutable legal record (IP + UA + human-readable fingerprint)
      await historyLogRepository.create(client, {
        tenant_id:     tenantId,
        entity_type:   "work_order",
        entity_id:     workOrderId,
        action:        "quote_approved_by_client",
        old_values:    { status: "awaiting_approval", quote_status: "sent" },
        new_values:    { status: "in_progress", quote_status: "approved" },
        changed_fields: ["status", "quote_status"],
        performed_by:  null as unknown as string, // client action — no internal user
        ip_address:    meta.ip,
        user_agent:    meta.userAgent,
        metadata: {
          quote_id:     quote.id,
          quote_number: quote.quote_number,
          quote_total:  quote.total,
          legal_summary: `Cliente aprobó presupuesto ${quote.quote_number} por $${quote.total} el ${new Date(approvedAt).toLocaleString("es-CL")} desde IP ${meta.ip ?? "desconocida"}`,
        },
      });

      // Status-change log (shows in timeline)
      await historyLogRepository.logStatusChange(client, {
        tenant_id:     tenantId,
        work_order_id: workOrderId,
        from_status:   "awaiting_approval",
        to_status:     "in_progress",
        performed_by:  null as unknown as string,
        ip_address:    meta.ip,
        user_agent:    meta.userAgent,
      });

      return workOrderRepository.findById(client, workOrderId, tenantId);
    });

    // Fire-and-forget: notify client (in_progress) + notify workshop (approved)
    this._notifyClient(tenantId, updated, "in_progress").catch((err) =>
      console.error("[WorkOrderService] WhatsApp approve notification failed:", err)
    );
    this._notifyWorkshop(tenantId, updated, "approved").catch((err) =>
      console.error("[WorkOrderService] WhatsApp workshop approval notification failed:", err)
    );
  },

  // -------------------------------------------------------------------------
  // Client rejects the quote → cancelled + WhatsApp + immutable audit log
  // -------------------------------------------------------------------------
  async rejectByClient(
    tenantId: string,
    workOrderId: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<void> {
    const updated = await withTenantTransaction(tenantId, async (client) => {
      const workOrder = await workOrderRepository.findById(client, workOrderId, tenantId);

      if (workOrder.status !== "awaiting_approval") {
        throw createHttpError(
          409,
          "Esta orden no está esperando aprobación del cliente."
        );
      }

      const { rows: quoteRows } = await client.query<{
        id: string; total: number; quote_number: string;
      }>(
        `SELECT id, total, quote_number FROM quotes
          WHERE work_order_id = $1 AND tenant_id = $2 AND status = 'sent'
          ORDER BY created_at DESC LIMIT 1`,
        [workOrderId, tenantId],
      );
      if (!quoteRows[0]) {
        throw createHttpError(422, "No hay presupuesto activo para rechazar.");
      }
      const quote = quoteRows[0];
      const rejectedAt = new Date().toISOString();

      // Reject quote
      await client.query(
        `UPDATE quotes
            SET status = 'rejected', approved_by_client = false,
                approved_at = $1, updated_at = NOW()
          WHERE id = $2`,
        [rejectedAt, quote.id],
      );

      // Transition work order to cancelled
      await workOrderRepository.updateStatus(client, workOrderId, tenantId, "cancelled", {});

      // Immutable legal record
      await historyLogRepository.create(client, {
        tenant_id:     tenantId,
        entity_type:   "work_order",
        entity_id:     workOrderId,
        action:        "quote_rejected_by_client",
        old_values:    { status: "awaiting_approval", quote_status: "sent" },
        new_values:    { status: "cancelled", quote_status: "rejected" },
        changed_fields: ["status", "quote_status"],
        performed_by:  null as unknown as string,
        ip_address:    meta.ip,
        user_agent:    meta.userAgent,
        metadata: {
          quote_id:     quote.id,
          quote_number: quote.quote_number,
          quote_total:  quote.total,
          legal_summary: `Cliente rechazó presupuesto ${quote.quote_number} por $${quote.total} el ${new Date(rejectedAt).toLocaleString("es-CL")} desde IP ${meta.ip ?? "desconocida"}`,
        },
      });

      await historyLogRepository.logStatusChange(client, {
        tenant_id:     tenantId,
        work_order_id: workOrderId,
        from_status:   "awaiting_approval",
        to_status:     "cancelled",
        performed_by:  null as unknown as string,
        ip_address:    meta.ip,
        user_agent:    meta.userAgent,
      });

      return workOrderRepository.findById(client, workOrderId, tenantId);
    });

    // Fire-and-forget: notify client (cancelled) + notify workshop (rejected)
    this._notifyClient(tenantId, updated, "cancelled").catch((err) =>
      console.error("[WorkOrderService] WhatsApp reject notification failed:", err)
    );
    this._notifyWorkshop(tenantId, updated, "rejected").catch((err) =>
      console.error("[WorkOrderService] WhatsApp workshop rejection notification failed:", err)
    );
  },

  // -------------------------------------------------------------------------
  // Internal: notify the workshop phone when a client approves or rejects
  // -------------------------------------------------------------------------
  async _notifyWorkshop(
    tenantId: string,
    workOrder: WorkOrderDetail,
    event: "approved" | "rejected",
  ): Promise<void> {
    const { phone: workshopPhone, name: workshopName } = await getTenantInfo(tenantId);

    if (!workshopPhone) {
      console.log(`[WA] Workshop notification skipped — no phone for tenant ${tenantId}`);
      return;
    }

    const phone = normalizeArgentinePhone(workshopPhone);
    const plate = [workOrder.vehicle_brand, workOrder.vehicle_model, workOrder.vehicle_plate]
      .filter(Boolean)
      .join(" ");

    const body =
      event === "approved"
        ? `✅ *Presupuesto APROBADO* — Orden #${workOrder.order_number}\nEl cliente ${workOrder.client_name} aprobó el presupuesto del vehículo ${plate}.\n¡Ya podés comenzar la reparación!`
        : `❌ *Presupuesto RECHAZADO* — Orden #${workOrder.order_number}\nEl cliente ${workOrder.client_name} rechazó el presupuesto del vehículo ${plate}.`;

    console.log(`[WA] Notifying workshop (${workshopName}) at ${phone} — event: ${event}`);

    const useBaileys = sessionManager.isConnected(tenantId);
    if (useBaileys) {
      await sessionManager.sendMessage(tenantId, phone, body);
    } else {
      await whatsappService.sendMessage({ to: phone, body });
    }
  },

  // -------------------------------------------------------------------------
  // Internal: build context and dispatch WhatsApp message
  // -------------------------------------------------------------------------
  async _notifyClient(
    tenantId: string,
    workOrder: WorkOrderDetail,
    newStatus: WorkOrderStatus
  ): Promise<void> {
    if (!workOrder.client_phone) {
      console.log(`[WA] Skipped — order ${workOrder.order_number} has no client phone.`);
      return;
    }

    // Normalize to Argentine WhatsApp format: 549XXXXXXXXXX (13 digits, no +)
    const phone = normalizeArgentinePhone(workOrder.client_phone);

    const { slug: tenantSlug, name: workshopName } = await getTenantInfo(tenantId);
    const trackingUrl = `${env.TRACKING_BASE_URL}/track/${tenantSlug}/${encodeURIComponent(workOrder.order_number)}`;

    const message = buildMessage(newStatus, phone, {
      clientName:   workOrder.client_name,
      orderNumber:  workOrder.order_number,
      vehiclePlate: workOrder.vehicle_plate,
      vehicleBrand: workOrder.vehicle_brand,
      vehicleModel: workOrder.vehicle_model,
      trackingUrl,
      workshopName,
    });

    if (!message) {
      console.log(`[WA] No template for status "${newStatus}" — message not sent.`);
      return;
    }

    // Prefer the tenant's own WhatsApp number (Baileys) when connected;
    // fall back to the configured provider (mock / Meta Cloud API).
    const useBaileys = sessionManager.isConnected(tenantId);
    console.log(`[WA] Sending to ${phone} via ${useBaileys ? "Baileys" : "provider:" + env.WHATSAPP_PROVIDER}`);

    if (useBaileys) {
      await sessionManager.sendMessage(tenantId, phone, message.body);
    } else {
      await whatsappService.sendMessage(message);
    }

    console.log(`[WA] Delivered — order ${workOrder.order_number}, status ${newStatus}`);
  },

  // -------------------------------------------------------------------------
  // Internal: send WhatsApp with presupuesto + approve/reject links
  // Called fire-and-forget after createQuote auto-transitions to awaiting_approval
  // -------------------------------------------------------------------------
  async _notifyClientQuoteSent(
    tenantId: string,
    workOrder: WorkOrderDetail,
    resumenCliente?: string,
  ): Promise<void> {
    if (!workOrder.client_phone) {
      console.log(`[WA] Skipped quote notification — order ${workOrder.order_number} has no client phone.`);
      return;
    }

    const phone = normalizeArgentinePhone(workOrder.client_phone);
    const { slug: tenantSlug, name: workshopName } = await getTenantInfo(tenantId);

    const orderEnc    = encodeURIComponent(workOrder.order_number);
    const approveUrl  = `${env.BASE_URL}/api/orders/${tenantSlug}/${orderEnc}/approve`;
    const rejectUrl   = `${env.BASE_URL}/api/orders/${tenantSlug}/${orderEnc}/reject`;
    const trackingUrl = `${env.TRACKING_BASE_URL}/track/${tenantSlug}/${orderEnc}`;

    const message = buildMessage("awaiting_approval", phone, {
      clientName:    workOrder.client_name,
      orderNumber:   workOrder.order_number,
      vehiclePlate:  workOrder.vehicle_plate,
      vehicleBrand:  workOrder.vehicle_brand,
      vehicleModel:  workOrder.vehicle_model,
      trackingUrl,
      workshopName,
      resumenCliente,
      approveUrl,
      rejectUrl,
    });

    if (!message) return;

    const useBaileys = sessionManager.isConnected(tenantId);
    console.log(`[WA] Sending quote notification to ${phone} via ${useBaileys ? "Baileys" : "provider:" + env.WHATSAPP_PROVIDER}`);

    if (useBaileys) {
      await sessionManager.sendMessage(tenantId, phone, message.body);
    } else {
      await whatsappService.sendMessage(message);
    }

    console.log(`[WA] Quote notification delivered — order ${workOrder.order_number}`);
  },

  // -------------------------------------------------------------------------
  // Summary: order detail + latest quote with items (for delivered/cancelled view)
  // -------------------------------------------------------------------------
  async getSummary(
    tenantId: string,
    workOrderId: string,
  ): Promise<WorkOrderDetail & { quote: QuoteWithItems | null }> {
    return withTenantContext(tenantId, async (client) => {
      const order = await workOrderRepository.findById(client, workOrderId, tenantId);
      const quote = await workOrderRepository.getLatestQuote(client, workOrderId, tenantId);
      return { ...order, quote };
    });
  },
};
