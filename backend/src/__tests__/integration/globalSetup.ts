/**
 * globalSetup — corre UNA VEZ antes de todos los tests de integración.
 * Aplica el schema SQL completo y crea el tenant + usuario de prueba.
 *
 * Requiere: DATABASE_URL apuntando a una base de datos PostgreSQL vacía o existente.
 */

import { Client } from "pg";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL es requerida para los tests de integración");

export async function setup(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  // ── 1. Aplicar todas las migraciones SQL en orden ─────────────────────────
  const migrationsDir = path.resolve(process.cwd(), "../database/migrations");
  const sqlFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of sqlFiles) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await client.query(sql);
  }

  // ── 2. Migraciones inline no cubiertas por archivos SQL ───────────────────
  // 007 — whatsapp_number en tenants
  await client.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_number TEXT`);
  // 010 — onboarding completion flag
  await client.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarded BOOLEAN NOT NULL DEFAULT FALSE`);

  // ── 3. Seed: tenant + usuario de prueba (idempotente) ─────────────────────
  const { rows } = await client.query(
    `SELECT id FROM tenants WHERE slug = 'mi-taller'`
  );

  if (rows.length === 0) {
    const passwordHash = await bcrypt.hash("TallerTrack2024!", 12);

    const { rows: [tenant] } = await client.query<{ id: string }>(
      `INSERT INTO tenants (slug, name, country, plan, sub_status, onboarded, settings)
       VALUES ('mi-taller', 'Mi Taller', 'AR', 'starter', 'trialing', true,
               '{"timezone":"America/Argentina/Buenos_Aires","currency":"ARS","logo_url":null}')
       RETURNING id`
    );

    await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, full_name, role, status)
       VALUES ($1, 'admin@tallertrack.com', $2, 'Administrador', 'owner', 'active')`,
      [tenant.id, passwordHash]
    );
  }

  await client.end();
}
