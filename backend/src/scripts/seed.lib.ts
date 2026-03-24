/**
 * Lógica de seed exportada como función reutilizable.
 * Usada tanto por el script standalone (seed.ts) como por server.ts
 * cuando SEED_ON_START=true.
 */

import { Client } from "pg";
import bcrypt from "bcrypt";

interface SeedOptions {
  tenantSlug?:    string;
  tenantName?:    string;
  adminEmail?:    string;
  adminPassword?: string;
  adminName?:     string;
}

export async function runSeed(
  databaseUrl: string,
  ssl: false | { rejectUnauthorized: boolean },
  opts: SeedOptions = {}
): Promise<void> {
  const TENANT_SLUG    = opts.tenantSlug    ?? process.env.SEED_TENANT_SLUG    ?? "mi-taller";
  const TENANT_NAME    = opts.tenantName    ?? process.env.SEED_TENANT_NAME    ?? "Mi Taller";
  const ADMIN_EMAIL    = opts.adminEmail    ?? process.env.SEED_ADMIN_EMAIL    ?? "admin@tallertrack.com";
  const ADMIN_PASSWORD = opts.adminPassword ?? process.env.SEED_ADMIN_PASSWORD ?? "TallerTrack2024!";
  const ADMIN_NAME     = opts.adminName     ?? process.env.SEED_ADMIN_NAME     ?? "Administrador";

  const client = new Client({ connectionString: databaseUrl, ssl });
  await client.connect();

  const { rows: existing } = await client.query(
    "SELECT id FROM tenants WHERE slug = $1",
    [TENANT_SLUG]
  );

  if (existing.length > 0) {
    console.log(`⚠️  Seed: tenant "${TENANT_SLUG}" ya existe — nada que hacer.`);
    await client.end();
    return;
  }

  console.log(`🌱 Seed: creando tenant "${TENANT_NAME}" (${TENANT_SLUG})…`);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await client.query("BEGIN");
  try {
    const { rows: [tenant] } = await client.query<{ id: string }>(
      `INSERT INTO tenants (slug, name, country, plan, sub_status, trial_ends_at, onboarded, settings)
       VALUES ($1, $2, 'AR', 'starter', 'trialing',
               NOW() + INTERVAL '30 days', true,
               '{"timezone":"America/Argentina/Buenos_Aires","currency":"ARS","logo_url":null}')
       RETURNING id`,
      [TENANT_SLUG, TENANT_NAME]
    );

    await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, full_name, role, status)
       VALUES ($1, $2, $3, $4, 'owner', 'active')`,
      [tenant.id, ADMIN_EMAIL.toLowerCase(), passwordHash, ADMIN_NAME]
    );

    await client.query("COMMIT");
    console.log("✅ Seed completado.");
    console.log(`   Email      : ${ADMIN_EMAIL}`);
    console.log(`   Contraseña : ${ADMIN_PASSWORD}`);
    console.log(`   Tenant slug: ${TENANT_SLUG}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}
