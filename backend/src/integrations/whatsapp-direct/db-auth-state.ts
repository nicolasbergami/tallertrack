// `import type` generates ZERO runtime code — safe in CJS modules
import type { AuthenticationState } from "@whiskeysockets/baileys";
import { pool } from "../../config/database";
import { loadBaileys } from "./baileys-loader";

// Minimal silent logger compatible with Baileys / pino interface
const silentLogger = {
  level:  "silent",
  child:  () => silentLogger,
  trace:  () => {},
  debug:  () => {},
  info:   () => {},
  warn:   (..._args: unknown[]) => {},
  error:  (..._args: unknown[]) => {},
  fatal:  (..._args: unknown[]) => {},
} as unknown as import("pino").Logger;

// ---------------------------------------------------------------------------
// PostgreSQL-backed Baileys AuthenticationState
// ---------------------------------------------------------------------------
export async function usePostgresAuthState(tenantId: string): Promise<{
  state:     AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const {
    initAuthCreds,
    BufferJSON,
    makeCacheableSignalKeyStore,
  } = await loadBaileys();

  // ── Load existing credentials ──────────────────────────────────────────────
  const { rows } = await pool.query<{ creds: unknown }>(
    `SELECT creds FROM whatsapp_sessions WHERE tenant_id = $1`,
    [tenantId]
  );

  const creds = rows[0]
    ? JSON.parse(JSON.stringify(rows[0].creds), BufferJSON.reviver)
    : initAuthCreds();

  // ── SignalKeyStore backed by whatsapp_session_keys table ──────────────────
  const rawKeyStore = {
    async get(type: string, ids: string[]) {
      if (ids.length === 0) return {};
      const { rows: keyRows } = await pool.query<{ key_id: string; key_data: unknown }>(
        `SELECT key_id, key_data
           FROM whatsapp_session_keys
          WHERE tenant_id = $1
            AND key_type  = $2
            AND key_id    = ANY($3)`,
        [tenantId, type, ids]
      );

      const result: Record<string, unknown> = {};
      for (const row of keyRows) {
        result[row.key_id] = JSON.parse(
          JSON.stringify(row.key_data),
          BufferJSON.reviver
        );
      }
      return result;
    },

    async set(data: Record<string, Record<string, unknown> | null>) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const [type, typeData] of Object.entries(data)) {
          if (!typeData) continue;
          for (const [id, value] of Object.entries(typeData)) {
            if (value == null) {
              await client.query(
                `DELETE FROM whatsapp_session_keys
                  WHERE tenant_id = $1 AND key_type = $2 AND key_id = $3`,
                [tenantId, type, id]
              );
            } else {
              const serialized = JSON.stringify(value, BufferJSON.replacer);
              await client.query(
                `INSERT INTO whatsapp_session_keys (tenant_id, key_type, key_id, key_data)
                 VALUES ($1, $2, $3, $4::jsonb)
                 ON CONFLICT (tenant_id, key_type, key_id)
                 DO UPDATE SET key_data = EXCLUDED.key_data`,
                [tenantId, type, id, serialized]
              );
            }
          }
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async clear() {
      await pool.query(
        `DELETE FROM whatsapp_session_keys WHERE tenant_id = $1`,
        [tenantId]
      );
    },
  };

  return {
    state: {
      creds,
      keys: makeCacheableSignalKeyStore(rawKeyStore as never, silentLogger),
    },
    saveCreds: async () => {
      const serialized = JSON.stringify(creds, BufferJSON.replacer);
      await pool.query(
        `INSERT INTO whatsapp_sessions (tenant_id, creds, status)
         VALUES ($1, $2::jsonb, 'pending')
         ON CONFLICT (tenant_id)
         DO UPDATE SET creds = EXCLUDED.creds, updated_at = NOW()`,
        [tenantId, serialized]
      );
    },
  };
}
