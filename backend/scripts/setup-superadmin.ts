/**
 * One-shot script: adds is_system_admin column and promotes a user to superadmin.
 *
 * Usage: npx tsx scripts/setup-superadmin.ts
 *
 * NOTE: This script needs a DB connection with DDL + BYPASSRLS privileges.
 * In development, set ADMIN_DATABASE_URL in .env pointing to postgres superuser
 * or tallertrack_migrator. Falls back to DATABASE_URL (works if postgres superuser).
 */
import "dotenv/config";
import { Pool } from "pg";

const TARGET_EMAIL = "nicolasbergami2013@gmail.com";

async function main() {
  const connStr = process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connStr) { console.error("❌ No DATABASE_URL found"); process.exit(1); }

  const pool = new Pool({ connectionString: connStr, max: 1 });

  try {
    const client = await pool.connect();
    console.log("✅ Connected to DB");

    // 1. Add column (idempotent)
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log("✅ Column is_system_admin ensured");

    // 2. Create partial index (idempotent)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_is_system_admin
        ON users (is_system_admin) WHERE is_system_admin = TRUE
    `);
    console.log("✅ Index ensured");

    // 3. Update user — no tenant context needed when connected as superuser/migrator
    const { rowCount } = await client.query(
      `UPDATE users SET is_system_admin = TRUE WHERE email = $1`,
      [TARGET_EMAIL]
    );

    if (rowCount && rowCount > 0) {
      console.log(`✅ User '${TARGET_EMAIL}' promoted to superadmin (${rowCount} row updated)`);
    } else {
      console.warn(`⚠️  No user found with email '${TARGET_EMAIL}' — check the email and retry`);
    }

    client.release();
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
