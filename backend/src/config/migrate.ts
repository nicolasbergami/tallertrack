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

    // 007 — Trial Abuse Guard: burned WhatsApp number registry
    await client.query(`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS whatsapp_number TEXT
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_whatsapp_number
        ON tenants (whatsapp_number)
        WHERE whatsapp_number IS NOT NULL
    `);

    // 008 — Subscription plans table with dynamic pricing
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        slug       TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        price_ars  NUMERIC(12,2) NOT NULL,
        is_active  BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      INSERT INTO subscription_plans (slug, name, price_ars) VALUES
        ('starter',      'Básico',      18000),
        ('professional', 'Profesional', 35000),
        ('enterprise',   'Red',         80000)
      ON CONFLICT (slug) DO NOTHING
    `);

    // 009 — Cancellation tracking columns on tenants
    await client.query(`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS cancellation_reason TEXT
    `);
    await client.query(`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ
    `);

    // 010 — Onboarding completion flag
    await client.query(`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS onboarded BOOLEAN NOT NULL DEFAULT FALSE
    `);
    // Mark all pre-existing tenants as onboarded so they don't see the modal
    await client.query(`
      UPDATE tenants SET onboarded = TRUE WHERE deleted_at IS NULL AND onboarded = FALSE
    `);

    // 011 — Password reset tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT        NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens(user_id)
    `);

    console.log("✅ Migrations applied.");
  } catch (err) {
    // Non-fatal in dev if adminPool lacks DDL rights — warn and continue
    console.warn("⚠️  Migration warning (non-fatal in dev):", (err as Error).message);
  } finally {
    client.release();
  }
}
