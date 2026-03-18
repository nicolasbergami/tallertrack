import { Pool, PoolClient } from "pg";
import { env } from "./env";

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
