import { PoolClient } from "pg";
import { WorkOrderStatus } from "../modules/work-orders/work-order.types";

export interface CreateHistoryLogInput {
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  changed_fields?: string[];
  performed_by: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

export const historyLogRepository = {
  /**
   * Appends an immutable audit entry.
   * Must be called within a tenant-scoped connection.
   * The DB RULE prevents any UPDATE or DELETE on this table.
   */
  async create(client: PoolClient, input: CreateHistoryLogInput): Promise<void> {
    await client.query(
      `INSERT INTO history_logs
         (tenant_id, entity_type, entity_id, action,
          old_values, new_values, changed_fields,
          performed_by, ip_address, user_agent, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        input.tenant_id,
        input.entity_type,
        input.entity_id,
        input.action,
        input.old_values ? JSON.stringify(input.old_values) : null,
        input.new_values ? JSON.stringify(input.new_values) : null,
        input.changed_fields ?? [],
        input.performed_by,
        input.ip_address ?? null,
        input.user_agent ?? null,
        JSON.stringify(input.metadata ?? {}),
      ]
    );
  },

  async logStatusChange(
    client: PoolClient,
    opts: {
      tenant_id: string;
      work_order_id: string;
      from_status: WorkOrderStatus;
      to_status: WorkOrderStatus;
      performed_by: string;
      ip_address?: string;
      user_agent?: string;
    }
  ): Promise<void> {
    await this.create(client, {
      tenant_id:     opts.tenant_id,
      entity_type:   "work_order",
      entity_id:     opts.work_order_id,
      action:        "status_changed",
      old_values:    { status: opts.from_status },
      new_values:    { status: opts.to_status },
      changed_fields:["status"],
      performed_by:  opts.performed_by,
      ip_address:    opts.ip_address,
      user_agent:    opts.user_agent,
      metadata: {
        transition: `${opts.from_status} → ${opts.to_status}`,
        timestamp:  new Date().toISOString(),
      },
    });
  },
};
