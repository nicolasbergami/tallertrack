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
} from "./work-order.types";
import { env } from "../../config/env";
import { createHttpError } from "../../middleware/error.middleware";

// ---------------------------------------------------------------------------
// Helper: fetch tenant slug for QR / tracking URL
// ---------------------------------------------------------------------------
async function getTenantSlug(tenantId: string): Promise<string> {
  return withTenantContext(tenantId, async (client) => {
    const { rows } = await client.query<{ slug: string }>(
      `SELECT slug FROM tenants WHERE id = $1`,
      [tenantId]
    );
    if (!rows[0]) throw createHttpError(404, "Tenant not found.");
    return rows[0].slug;
  });
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

      // 2. Validate transition — throws TransitionError if invalid
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
  // Create a quote (draft) for a work order from AI-generated items
  // -------------------------------------------------------------------------
  async createQuote(
    tenantId: string,
    workOrderId: string,
    dto: CreateQuoteDTO,
  ): Promise<QuoteWithItems> {
    // Verify the work order exists and belongs to this tenant
    await this.getById(tenantId, workOrderId);

    return withTenantTransaction(tenantId, (client) =>
      workOrderRepository.createQuote(client, tenantId, workOrderId, dto),
    );
  },

  // -------------------------------------------------------------------------
  // Internal: build context and dispatch WhatsApp message
  // -------------------------------------------------------------------------
  async _notifyClient(
    tenantId: string,
    workOrder: WorkOrderDetail,
    newStatus: WorkOrderStatus
  ): Promise<void> {
    if (!workOrder.client_phone) return; // No phone on record

    const tenantSlug = await getTenantSlug(tenantId);

    const trackingUrl = `${env.TRACKING_BASE_URL}/${tenantSlug}/${encodeURIComponent(workOrder.order_number)}`;

    const message = buildMessage(newStatus, workOrder.client_phone, {
      clientName:   workOrder.client_name,
      orderNumber:  workOrder.order_number,
      vehiclePlate: workOrder.vehicle_plate,
      vehicleBrand: workOrder.vehicle_brand,
      vehicleModel: workOrder.vehicle_model,
      trackingUrl,
      workshopName: tenantSlug, // Ideally fetch from tenants table
    });

    if (!message) return; // No template for this status

    // Prefer the tenant's own WhatsApp number (Baileys) when connected;
    // fall back to the configured provider (mock / Meta Cloud API).
    if (sessionManager.isConnected(tenantId)) {
      await sessionManager.sendMessage(tenantId, workOrder.client_phone, message.body);
    } else {
      await whatsappService.sendMessage(message);
    }
  },
};
