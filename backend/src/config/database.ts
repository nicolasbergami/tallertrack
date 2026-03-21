import { Pool, PoolClient } from "pg";
import { env } from "./env";

// ---------------------------------------------------------------------------
// Admin pool — connects as a BYPASSRLS role (tallertrack_migrator in prod).
// Used exclusively for cross-tenant backoffice queries.
// Set ADMIN_DATABASE_URL to the tallertrack_migrator credentials in production.
// Falls back to DATABASE_URL for development (works if connected user is postgres
// superuser or has BYPASSRLS).
// ---------------------------------------------------------------------------
export const adminPool = new Pool({
  connectionString: env.ADMIN_DATABASE_URL ?? env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

adminPool.on("error", (err) => {
  console.error("Unexpected admin DB pool error:", err);
});

/**
 * Executes a callback with an admin-level database connection (BYPASSRLS).
 * Use ONLY for backoffice / super-admin operations that need to see all tenants.
 */
// NULL UUID — matches no real tenant so RLS policies evaluate without errors
// on connections where app.current_tenant_id was never set.
// BYPASSRLS roles (tallertrack_migrator) ignore this entirely.
const NULL_TENANT_ID = "00000000-0000-0000-0000-000000000000";

export async function withAdminContext<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await adminPool.connect();
  try {
    // Ensure the GUC exists on this connection. Without this, RLS policies that call
    // current_setting('app.current_tenant_id') (without missing_ok) throw
    // "unrecognized configuration parameter" on fresh connections.
    await client.query(
      `SELECT set_config('app.current_tenant_id', $1, false)`,
      [NULL_TENANT_ID]
    );
    return await callback(client);
  } finally {
    client.release();
  }
}

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("Unexpected DB pool error:", err);
});

/**
 * Executes a callback with a dedicated connection scoped to a specific tenant.
 * Sets `app.current_tenant_id` so PostgreSQL RLS policies filter rows correctly.
 * The variable is unset when the client is released back to the pool.
 */
export async function withTenantContext<T>(
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    // set_config() is the parameterized way to set session variables in PostgreSQL.
    // 3rd arg = false → session-scoped (not transaction-local), resets on release below.
    await client.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantId]);
    const result = await callback(client);
    return result;
  } finally {
    // Clear the variable before returning the connection to the pool.
    await client.query(`SELECT set_config('app.current_tenant_id', '', false)`).catch(() => {});
    client.release();
  }
}

/**
 * Wraps a tenant-scoped callback in an explicit transaction.
 * Automatically rolls back on error.
 */
export async function withTenantTransaction<T>(
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  return withTenantContext(tenantId, async (client) => {
    await client.query("BEGIN");
    try {
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  });
}
