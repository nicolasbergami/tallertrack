/**
 * Migration runner — ejecuta los archivos SQL de database/migrations/ en orden.
 *
 * Uso:
 *   npm run migrate                          (desde backend/)
 *   railway run -s <servicio> npm run migrate (desde Railway CLI)
 *
 * Para agregar una migración nueva:
 *   1. Crea database/migrations/002_descripcion.sql
 *   2. Escribe el SQL (puede incluir BEGIN/COMMIT o no)
 *   3. Despliega → la migración se aplica automáticamente
 */

import { Client } from "pg";
import fs from "fs";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL no está definida");
  process.exit(1);
}

// Soporta SSL requerido por Railway / Heroku / Render (rejectUnauthorized=false para certs self-signed)
const ssl =
  process.env.NODE_ENV === "production" || DATABASE_URL.includes("railway")
    ? { rejectUnauthorized: false }
    : false;

const MIGRATIONS_DIR = path.resolve(__dirname, "../../../database/migrations");

async function run() {
  const client = new Client({ connectionString: DATABASE_URL, ssl });
  await client.connect();
  console.log("🔌 Conectado a la base de datos\n");

  // Tabla de control (no tiene tenant_id → no afectada por RLS)
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         SERIAL PRIMARY KEY,
      filename   TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Leer archivos .sql en orden alfabético (000_, 001_, 002_, …)
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("⚠️  No se encontraron archivos de migración en", MIGRATIONS_DIR);
    await client.end();
    return;
  }

  // Migraciones ya aplicadas
  const { rows } = await client.query<{ filename: string }>(
    "SELECT filename FROM schema_migrations ORDER BY filename"
  );
  const applied = new Set(rows.map((r) => r.filename));

  let ran = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  ⏭  skip   ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    // Si el archivo ya incluye BEGIN/COMMIT, no lo envolvemos (ej: 001_update_enum.sql)
    const hasOwnTx = /^\s*BEGIN\s*;/im.test(sql);

    try {
      if (!hasOwnTx) await client.query("BEGIN");

      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [file]
      );

      if (!hasOwnTx) await client.query("COMMIT");

      console.log(`  ✅ ran    ${file}`);
      ran++;
    } catch (err) {
      if (!hasOwnTx) {
        try { await client.query("ROLLBACK"); } catch (_) { /* ya en error */ }
      }
      console.error(`\n  ❌ FALLÓ  ${file}`);
      console.error(err instanceof Error ? err.message : err);
      await client.end();
      process.exit(1);
    }
  }

  console.log(
    ran === 0
      ? "\n✅ Base de datos actualizada — nada que migrar."
      : `\n✅ ${ran} migración(es) aplicadas correctamente.`
  );

  await client.end();
}

run().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
