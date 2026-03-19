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
    let settled = false;

    const settle = () => { settled = true; clearTimeout(masterTimeout); };

    // Master timeout covers the pre-socket phase (Baileys ESM import, DB query,
    // version fetch). If _connect hangs before creating the socket, the inner
    // 30-second timeout never runs — this one catches that case.
    const masterTimeout = setTimeout(() => {
      if (!settled) {
        console.error(`[WhatsApp] _connect master timeout for tenant ${tenantId} — hung before socket creation`);
        sessions.delete(tenantId);
        qrEmitter.emit("error", new Error("La conexión tardó demasiado. Revisá los logs del servidor."));
      }
    }, 60_000);

    // Wire up settle() to fire as soon as the emitter emits anything meaningful
    qrEmitter.once("qr",          settle);
    qrEmitter.once("connected",   settle);
    qrEmitter.once("disconnected", settle);
    qrEmitter.once("error",       settle);

    this._connect(tenantId, qrEmitter).catch((err) => {
      settle();
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
    console.log(`[WhatsApp] [1/4] Starting connection for tenant ${tenantId}`);

    // new Function() prevents TypeScript from compiling import() → require()
    // when module target is CommonJS.  Node.js evaluates the native import()
    // at runtime, which correctly handles ESM-only packages like Baileys.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const baileysModule = await (new Function('return import("@whiskeysockets/baileys")')() as Promise<typeof import("@whiskeysockets/baileys") & { Defaults?: { VERSION?: [number, number, number] } }>);
    const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion } = baileysModule;
    console.log(`[WhatsApp] [2/4] Baileys imported for tenant ${tenantId}`);

    const { state, saveCreds } = await usePostgresAuthState(tenantId);
    console.log(`[WhatsApp] [3/4] Auth state loaded for tenant ${tenantId}`);

    // fetchLatestBaileysVersion makes an external HTTP request (GitHub/WA servers).
    // In production it can hang indefinitely → apply a 10s timeout and fall back
    // to the version bundled with the installed Baileys package.
    let version: [number, number, number];
    try {
      const result = await Promise.race([
        fetchLatestBaileysVersion(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timed out after 10s")), 10_000)
        ),
      ]);
      version = result.version;
      console.log(`[WhatsApp] [4/4] WA version ${version} fetched for tenant ${tenantId}`);
    } catch (versionErr) {
      version = baileysModule.Defaults?.VERSION ?? [2, 3000, 1015920];
      console.warn(`[WhatsApp] [4/4] Version fetch failed (${(versionErr as Error).message}), using bundled ${version} for tenant ${tenantId}`);
    }

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

    console.log(`[WhatsApp] Socket created, waiting for QR/connection for tenant ${tenantId}`);

    const session: ManagedSession = { socket, qrEmitter, status: "connecting" };
    sessions.set(tenantId, session);

    let qrEverEmitted = false;

    // Safety timeout: if WhatsApp never sends a QR or open/close event within
    // 30 s, notify the frontend so the user can retry instead of waiting forever.
    const noResponseTimeout = setTimeout(() => {
      if (!qrEverEmitted && session.status !== "connected") {
        console.warn(`[WhatsApp] No response from WA server for tenant ${tenantId} after 30s — aborting`);
        session.status = "disconnected";
        sessions.delete(tenantId);
        try { socket.end(undefined); } catch { /* ignore */ }
        qrEmitter.emit("error", new Error("WhatsApp no respondió en 30 segundos. El servidor puede no tener acceso a internet o la IP puede estar bloqueada."));
      }
    }, 30_000);

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", async (update: {
      connection?: string;
      lastDisconnect?: { error?: Error };
      qr?: string;
    }) => {
      const { connection, lastDisconnect, qr } = update;
      console.log(`[WhatsApp] connection.update for tenant ${tenantId}:`, { connection, hasQr: !!qr });

      if (qr) {
        clearTimeout(noResponseTimeout);
        session.status = "qr";
        qrEverEmitted  = true;
        qrEmitter.emit("qr", qr);
      }

      if (connection === "open") {
        clearTimeout(noResponseTimeout);
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
        clearTimeout(noResponseTimeout);
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const loggedOut  = statusCode === DisconnectReason.loggedOut;

        session.status = "disconnected";
        sessions.delete(tenantId);

        if (!loggedOut) {
          if (!qrEverEmitted) {
            // Connection failed before the QR was ever shown — tell the frontend
            // so the user can retry. Do NOT reconnect silently with a new emitter
            // (the SSE is bound to this qrEmitter and would never see those events).
            console.warn(`[WhatsApp] Tenant ${tenantId} closed before QR (code ${statusCode})`);
            qrEmitter.emit("error", new Error(`WhatsApp rechazó la conexión (código ${statusCode ?? "desconocido"}). Reintentá en unos segundos.`));
          } else {
            // Had an active session — reconnect in background
            console.log(`[WhatsApp] Tenant ${tenantId} disconnected (code ${statusCode}), reconnecting…`);
            await new Promise((r) => setTimeout(r, 5_000));
            const newEmitter = new EventEmitter();
            this._connect(tenantId, newEmitter).catch((err) =>
              console.error(`[WhatsApp] Reconnect error for tenant ${tenantId}:`, err)
            );
          }
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
