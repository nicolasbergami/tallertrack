import EventEmitter from "events";
import { Boom } from "@hapi/boom";
import { pool } from "../../config/database";
import { usePostgresAuthState } from "./db-auth-state";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type SessionStatus = "connecting" | "qr" | "connected" | "disconnected";

interface ManagedSession {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket:    any;          // WASocket — typed as any; loaded via dynamic import
  qrEmitter: EventEmitter;
  status:    SessionStatus;
  phone?:    string;
}

// ---------------------------------------------------------------------------
// In-memory session map  (tenantId → ManagedSession)
// ---------------------------------------------------------------------------
const sessions = new Map<string, ManagedSession>();

// ---------------------------------------------------------------------------
// Session Manager
// ---------------------------------------------------------------------------
export const sessionManager = {
  // ── Status ────────────────────────────────────────────────────────────────
  getStatus(tenantId: string): { status: SessionStatus | "not_started"; phone: string | null } {
    const session = sessions.get(tenantId);
    if (!session) return { status: "not_started", phone: null };
    return { status: session.status, phone: session.phone ?? null };
  },

  isConnected(tenantId: string): boolean {
    return sessions.get(tenantId)?.status === "connected";
  },

  // ── Send a text message via the tenant's own WhatsApp number ──────────────
  async sendMessage(tenantId: string, phone: string, text: string): Promise<void> {
    const session = sessions.get(tenantId);
    if (!session || session.status !== "connected") {
      throw new Error(`No active WhatsApp session for tenant ${tenantId}`);
    }
    const jid = `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
    await session.socket.sendMessage(jid, { text });
  },

  // ── Start (or return existing) session — returns EventEmitter for QR SSE ──
  startSession(tenantId: string): EventEmitter {
    const existing = sessions.get(tenantId);
    if (existing && existing.status !== "disconnected") {
      return existing.qrEmitter;
    }
    const qrEmitter = new EventEmitter();
    this._connect(tenantId, qrEmitter).catch((err) => {
      console.error(`[WhatsApp] Session start error for tenant ${tenantId}:`, err);
      qrEmitter.emit("error", err);
    });
    return qrEmitter;
  },

  // ── Disconnect and clean up ───────────────────────────────────────────────
  async disconnectSession(tenantId: string): Promise<void> {
    const session = sessions.get(tenantId);
    if (session) {
      try { await session.socket.logout(); } catch { /* ignore */ }
      sessions.delete(tenantId);
    }
    await pool.query(
      `UPDATE whatsapp_sessions SET status = 'disconnected', updated_at = NOW() WHERE tenant_id = $1`,
      [tenantId]
    );
    await pool.query(
      `DELETE FROM whatsapp_session_keys WHERE tenant_id = $1`,
      [tenantId]
    );
  },

  // ── Restore previously-connected sessions on server startup ───────────────
  async restoreAll(): Promise<void> {
    try {
      const { rows } = await pool.query<{ tenant_id: string }>(
        `SELECT tenant_id FROM whatsapp_sessions WHERE status = 'connected'`
      );
      for (const row of rows) {
        console.log(`[WhatsApp] Restoring session for tenant ${row.tenant_id}`);
        const qrEmitter = new EventEmitter();
        this._connect(row.tenant_id, qrEmitter).catch((err) =>
          console.error(`[WhatsApp] Restore error for tenant ${row.tenant_id}:`, err)
        );
      }
    } catch (err) {
      // Table might not exist yet (before first migration) — safe to ignore
      console.warn("[WhatsApp] restoreAll skipped:", (err as Error).message);
    }
  },

  // ── Internal: create and wire a WASocket for a tenant ────────────────────
  async _connect(tenantId: string, qrEmitter: EventEmitter): Promise<void> {
    // new Function() prevents TypeScript from compiling import() → require()
    // when module target is CommonJS.  Node.js evaluates the native import()
    // at runtime, which correctly handles ESM-only packages like Baileys.
    const {
      default: makeWASocket,
      DisconnectReason,
      fetchLatestBaileysVersion,
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    } = await (new Function('return import("@whiskeysockets/baileys")')() as Promise<typeof import("@whiskeysockets/baileys")>);

    const { state, saveCreds } = await usePostgresAuthState(tenantId);
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      auth:              state,
      printQRInTerminal: false,
      browser:           ["TallerTrack", "Chrome", "1.0.0"],
      logger: {
        level:  "silent",
        child:  () => ({} as never),
        trace:  () => {}, debug: () => {}, info: () => {},
        warn:   () => {}, error: () => {}, fatal: () => {},
      } as never,
    });

    const session: ManagedSession = { socket, qrEmitter, status: "connecting" };
    sessions.set(tenantId, session);

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", async (update: {
      connection?: string;
      lastDisconnect?: { error?: Error };
      qr?: string;
    }) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        session.status = "qr";
        qrEmitter.emit("qr", qr);
      }

      if (connection === "open") {
        session.status = "connected";
        session.phone  = socket.user?.id?.split(":")[0] ?? undefined;

        await pool.query(
          `INSERT INTO whatsapp_sessions (tenant_id, creds, status, phone)
           VALUES ($1, '{}'::jsonb, 'connected', $2)
           ON CONFLICT (tenant_id)
           DO UPDATE SET status = 'connected', phone = $2, updated_at = NOW()`,
          [tenantId, session.phone ?? null]
        );

        qrEmitter.emit("connected", { phone: session.phone });
        console.log(`[WhatsApp] Tenant ${tenantId} connected (${session.phone})`);
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const loggedOut  = statusCode === DisconnectReason.loggedOut;

        session.status = "disconnected";
        sessions.delete(tenantId);

        if (!loggedOut) {
          console.log(`[WhatsApp] Tenant ${tenantId} disconnected (code ${statusCode}), reconnecting…`);
          await new Promise((r) => setTimeout(r, 5_000));
          const newEmitter = new EventEmitter();
          this._connect(tenantId, newEmitter).catch((err) =>
            console.error(`[WhatsApp] Reconnect error for tenant ${tenantId}:`, err)
          );
        } else {
          await pool.query(
            `UPDATE whatsapp_sessions SET status = 'disconnected', updated_at = NOW() WHERE tenant_id = $1`,
            [tenantId]
          );
          qrEmitter.emit("disconnected", { reason: "logged_out" });
          console.log(`[WhatsApp] Tenant ${tenantId} logged out.`);
        }
      }
    });
  },
};
