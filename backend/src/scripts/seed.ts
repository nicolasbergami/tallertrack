/**
 * Seed script — crea el primer tenant y usuario administrador.
 *
 * Variables de entorno (opcionales, tienen valores por defecto):
 *   SEED_TENANT_SLUG     slug del taller    (default: mi-taller)
 *   SEED_TENANT_NAME     nombre del taller  (default: Mi Taller)
 *   SEED_ADMIN_EMAIL     email del admin    (default: admin@tallertrack.com)
 *   SEED_ADMIN_PASSWORD  contraseña         (default: TallerTrack2024!)
 *   SEED_ADMIN_NAME      nombre del admin   (default: Administrador)
 *
 * Uso:
 *   npm run seed
 *   SEED_TENANT_SLUG=gomez SEED_TENANT_NAME="Taller Gómez" npm run seed
 *
 * ⚠️  Si el tenant ya existe, el script termina sin hacer nada (es idempotente).
 */

import { Client } from "pg";
import bcrypt from "bcrypt";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL no está definida");
  process.exit(1);
}

const ssl =
  process.env.NODE_ENV === "production" || DATABASE_URL.includes("railway")
    ? { rejectUnauthorized: false }
    : false;

const TENANT_SLUG    = process.env.SEED_TENANT_SLUG     ?? "mi-taller";
const TENANT_NAME    = process.env.SEED_TENANT_NAME     ?? "Mi Taller";
const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL     ?? "admin@tallertrack.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD  ?? "TallerTrack2024!";
const ADMIN_NAME     = process.env.SEED_ADMIN_NAME      ?? "Administrador";

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL, ssl });
  await client.connect();
  console.log("🔌 Conectado a la base de datos\n");

  // Verificar si el tenant ya existe
  const { rows: existing } = await client.query(
    "SELECT id FROM tenants WHERE slug = $1",
    [TENANT_SLUG]
  );

  if (existing.length > 0) {
    console.log(`⚠️  El tenant "${TENANT_SLUG}" ya existe. Nada que hacer.`);
    await client.end();
    return;
  }

  console.log(`Creando tenant "${TENANT_NAME}" (${TENANT_SLUG})...`);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await client.query("BEGIN");
  try {
    const { rows: [tenant] } = await client.query<{ id: string }>(
      `INSERT INTO tenants (slug, name, country, plan, sub_status, settings)
       VALUES ($1, $2, 'CL', 'starter', 'trialing',
               '{"timezone":"America/Santiago","currency":"CLP","logo_url":null}')
       RETURNING id`,
      [TENANT_SLUG, TENANT_NAME]
    );

    await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, full_name, role, status)
       VALUES ($1, $2, $3, $4, 'owner', 'active')`,
      [tenant.id, ADMIN_EMAIL.toLowerCase(), passwordHash, ADMIN_NAME]
    );

    await client.query("COMMIT");

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  ✅ Seed completado exitosamente");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  Tenant slug : ${TENANT_SLUG}`);
    console.log(`  Email       : ${ADMIN_EMAIL}`);
    console.log(`  Contraseña  : ${ADMIN_PASSWORD}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n  ⚠️  Cambia la contraseña después del primer login!\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed falló:", err instanceof Error ? err.message : err);
    await client.end();
    process.exit(1);
  }

  await client.end();
}

seed().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
