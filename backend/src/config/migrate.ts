import { adminPool } from "./database";

/**
 * Runs idempotent schema migrations on startup using the adminPool (BYPASSRLS role).
 * Safe to run on every deploy — all statements use IF NOT EXISTS / IF EXISTS guards.
 */
export async function runMigrations(): Promise<void> {
  const client = await adminPool.connect();
  try {
    // 006 — SuperAdmin flag
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN NOT NULL DEFAULT FALSE
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_is_system_admin
        ON users (is_system_admin)
        WHERE is_system_admin = TRUE
    `);

    console.log("✅ Migrations applied.");
  } catch (err) {
    // Non-fatal in dev if adminPool lacks DDL rights — warn and continue
    console.warn("⚠️  Migration warning (non-fatal in dev):", (err as Error).message);
  } finally {
    client.release();
  }
}
