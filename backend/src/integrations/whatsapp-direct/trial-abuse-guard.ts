import { withAdminContext } from "../../config/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface AbuseCheckResult {
  /** The phone number is already burned to a DIFFERENT tenant */
  phoneAlreadyUsed: boolean;
  /** The tenant currently trying to connect is on a free trial */
  currentTenantIsTrialing: boolean;
  /** ID of the tenant that already owns the number (only set when phoneAlreadyUsed = true) */
  conflictingTenantId?: string;
}

// ---------------------------------------------------------------------------
// Check
// ---------------------------------------------------------------------------

/**
 * Cross-tenant abuse detection — runs via adminPool (BYPASSRLS) so it can
 * inspect ALL tenants regardless of RLS context.
 *
 * Single DB round-trip: fetches both the conflicting tenant (if any) and
 * the current tenant's subscription status.
 */
export async function checkTrialAbuse(
  tenantId: string,
  phone: string
): Promise<AbuseCheckResult> {
  return withAdminContext(async (client) => {
    const { rows } = await client.query<{
      conflicting_tenant_id: string | null;
      current_sub_status: string | null;
    }>(
      `SELECT
         (SELECT id FROM tenants WHERE whatsapp_number = $1 AND id != $2 LIMIT 1)
           AS conflicting_tenant_id,
         (SELECT sub_status FROM tenants WHERE id = $2)
           AS current_sub_status`,
      [phone, tenantId]
    );

    const row = rows[0];
    return {
      phoneAlreadyUsed:        row?.conflicting_tenant_id != null,
      currentTenantIsTrialing: row?.current_sub_status === "trialing",
      conflictingTenantId:     row?.conflicting_tenant_id ?? undefined,
    };
  });
}

// ---------------------------------------------------------------------------
// Burn
// ---------------------------------------------------------------------------

/**
 * Records `phone` as belonging to `tenantId`.
 * Subsequent calls from OTHER trialing tenants with the same number will be
 * blocked by checkTrialAbuse().
 *
 * Safe to call for paid tenants — the UNIQUE index on tenants.whatsapp_number
 * prevents double-registration.
 */
export async function burnPhoneToTenant(
  tenantId: string,
  phone: string
): Promise<void> {
  await withAdminContext(async (client) => {
    await client.query(
      `UPDATE tenants
          SET whatsapp_number = $1,
              updated_at      = NOW()
        WHERE id = $2`,
      [phone, tenantId]
    );
  });
}

// ---------------------------------------------------------------------------
// Revoke
// ---------------------------------------------------------------------------

/**
 * Downgrades a trialing tenant caught in abuse to 'canceled'.
 * This immediately disables their access to paid features.
 */
export async function revokeTrialForAbuse(tenantId: string): Promise<void> {
  await withAdminContext(async (client) => {
    await client.query(
      `UPDATE tenants
          SET sub_status = 'canceled',
              updated_at = NOW()
        WHERE id = $1`,
      [tenantId]
    );
  });
}
