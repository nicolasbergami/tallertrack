import { PoolClient } from "pg";
import { WorkOrder, WorkOrderDetail, CreateWorkOrderDTO, WorkOrderStatus } from "./work-order.types";
import { createHttpError } from "../../middleware/error.middleware";

// ---------------------------------------------------------------------------
// Utility: generate a padded order number like "OT-2024-00042"
// ---------------------------------------------------------------------------
async function generateOrderNumber(client: PoolClient, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const { rows } = await client.query<{ count: string }>(
    `SELECT COUNT(*) FROM work_orders
      WHERE tenant_id = $1
        AND EXTRACT(YEAR FROM created_at) = $2
        AND deleted_at IS NULL`,
    [tenantId, year]
  );
  const seq = parseInt(rows[0].count, 10) + 1;
  return `OT-${year}-${String(seq).padStart(5, "0")}`;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------
export const workOrderRepository = {
  async findById(
    client: PoolClient,
    id: string,
    tenantId: string
  ): Promise<WorkOrderDetail> {
    const { rows } = await client.query<WorkOrderDetail>(
      `SELECT
         wo.*,
         c.full_name        AS client_name,
         c.phone            AS client_phone,
         v.license_plate    AS vehicle_plate,
         v.brand            AS vehicle_brand,
         v.model            AS vehicle_model,
         u.full_name        AS assigned_user_name
       FROM work_orders wo
       JOIN clients  c ON c.id = wo.client_id
       JOIN vehicles v ON v.id = wo.vehicle_id
       LEFT JOIN users u ON u.id = wo.assigned_to
       WHERE wo.id = $1
         AND wo.tenant_id = $2
         AND wo.deleted_at IS NULL`,
      [id, tenantId]
    );

    if (!rows[0]) throw createHttpError(404, `Orden de trabajo ${id} no encontrada.`);
    return rows[0];
  },

  async findAll(
    client: PoolClient,
    tenantId: string,
    filters: { status?: WorkOrderStatus; limit?: number; offset?: number }
  ): Promise<{ data: WorkOrderDetail[]; total: number }> {
    const conditions: string[] = ["wo.tenant_id = $1", "wo.deleted_at IS NULL"];
    const params: unknown[] = [tenantId];

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`wo.status = $${params.length}`);
    }

    const where = conditions.join(" AND ");
    const limit  = filters.limit  ?? 20;
    const offset = filters.offset ?? 0;

    const countResult = await client.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM work_orders wo WHERE ${where}`,
      params
    );

    const { rows } = await client.query<WorkOrderDetail>(
      `SELECT
         wo.*,
         c.full_name     AS client_name,
         c.phone         AS client_phone,
         v.license_plate AS vehicle_plate,
         v.brand         AS vehicle_brand,
         v.model         AS vehicle_model,
         u.full_name     AS assigned_user_name
       FROM work_orders wo
       JOIN clients  c ON c.id = wo.client_id
       JOIN vehicles v ON v.id = wo.vehicle_id
       LEFT JOIN users u ON u.id = wo.assigned_to
       WHERE ${where}
       ORDER BY wo.received_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return { data: rows, total: parseInt(countResult.rows[0].total, 10) };
  },

  async create(
    client: PoolClient,
    tenantId: string,
    userId: string,
    dto: CreateWorkOrderDTO
  ): Promise<WorkOrder> {
    const orderNumber = await generateOrderNumber(client, tenantId);

    const { rows } = await client.query<WorkOrder>(
      `INSERT INTO work_orders
         (tenant_id, vehicle_id, client_id, order_number, status,
          mileage_in, complaint, estimated_delivery, assigned_to,
          internal_notes, received_by)
       VALUES ($1,$2,$3,$4,'received',$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        tenantId,
        dto.vehicle_id,
        dto.client_id,
        orderNumber,
        dto.mileage_in ?? null,
        dto.complaint,
        dto.estimated_delivery ?? null,
        dto.assigned_to ?? null,
        dto.internal_notes ?? null,
        userId,
      ]
    );

    return rows[0];
  },

  async updateStatus(
    client: PoolClient,
    id: string,
    tenantId: string,
    newStatus: WorkOrderStatus,
    extras: { diagnosis?: string; internal_notes?: string; mileage_out?: number }
  ): Promise<WorkOrder> {
    const setParts: string[] = ["status = $3", "updated_at = NOW()"];
    const params: unknown[] = [id, tenantId, newStatus];

    if (extras.diagnosis !== undefined) {
      params.push(extras.diagnosis);
      setParts.push(`diagnosis = $${params.length}`);
    }
    if (extras.internal_notes !== undefined) {
      params.push(extras.internal_notes);
      setParts.push(`internal_notes = $${params.length}`);
    }
    if (extras.mileage_out !== undefined) {
      params.push(extras.mileage_out);
      setParts.push(`mileage_out = $${params.length}`);
    }
    if (newStatus === "delivered") {
      setParts.push("delivered_at = NOW()");
    }

    const { rows } = await client.query<WorkOrder>(
      `UPDATE work_orders
          SET ${setParts.join(", ")}
        WHERE id = $1
          AND tenant_id = $2
          AND deleted_at IS NULL
       RETURNING *`,
      params
    );

    if (!rows[0]) throw createHttpError(404, `Orden de trabajo ${id} no encontrada.`);
    return rows[0];
  },
};
