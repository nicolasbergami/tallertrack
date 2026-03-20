import EventEmitter from "events";
import { Boom } from "@hapi/boom";
import { pool } from "../../config/database";
import { usePostgresAuthState } from "./db-auth-state";
import { loadBaileys, getBaileysVersion } from "./baileys-loader";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type SessionStatus = "connecting" | "qr" | "connected" | "disconnected";

interface ManagedSession {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket:    any;
  qrEmitter: EventEmitter;
  status:    SessionStatus;
  phone?:    string;
}

const sessions = new Map<string, ManagedSession>();

// ---------------------------------------------------------------------------
// Session Manager
// ---------------------------------------------------------------------------
export const sessionManager = {

  getStatus(tenantId: string): { status: SessionStatus | "not_started"; phone: string | null } {
    const session = sessions.get(tenantId);
    if (!session) return { status: "not_started", phone: null };
    return { status: session.status, phone: session.phone ?? null };
  },

  isConnected(tenantId: string): boolean {
    return sessions.get(tenantId)?.status === "connected";
  },

  async sendMessage(tenantId: string, phone: string, text: string): Promise<void> {
    const session = sessions.get(tenantId);
    if (!session || session.status !== "connected") {
      throw new Error(`No active WhatsApp session for tenant ${tenantId}`);
    }
    const jid = `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
    await session.socket.sendMessage(jid, { text });
  },

  // ── Start (or return existing) session ────────────────────────────────────
  startSession(tenantId: string): EventEmitter {
    const existing = sessions.get(tenantId);
    if (existing && existing.status !== "disconnected") {
      return existing.qrEmitter;
    }

    const qrEmitter = new EventEmitter();
    let settled = false;

    const settle = () => {
      if (!settled) { settled = true; clearTimeout(masterTimeout); }
    };

    // Master timeout: covers hangs in the pre-socket phase (loader, DB query).
    // The inner 30-second timeout only starts after the socket is created.
    const masterTimeout = setTimeout(() => {
      if (!settled) {
        console.error(`[WhatsApp] master timeout for tenant ${tenantId}`);
        sessions.delete(tenantId);
        qrEmitter.emit("error", new Error("La conexión tardó demasiado. Revisá los logs del servidor."));
      }
    }, 60_000);

    qrEmitter.once("qr",           settle);
    qrEmitter.once("connected",    settle);
    qrEmitter.once("disconnected", settle);
    qrEmitter.once("error",        settle);

    this._connect(tenantId, qrEmitter).catch((err: Error) => {
      settle();
      console.error(`[WhatsApp] Session start error for tenant ${tenantId}:`, err);
      qrEmitter.emit("error", err);
    });

    return qrEmitter;
  },

  // ── Disconnect ─────────────────────────────────────────────────────────────
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
    await pool.query(`DELETE FROM whatsapp_session_keys WHERE tenant_id = $1`, [tenantId]);
  },

  // ── Restore sessions on startup ───────────────────────────────────────────
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
      console.warn("[WhatsApp] restoreAll skipped:", (err as Error).message);
    }
  },

  // ── Internal: create and wire a WASocket ──────────────────────────────────
  async _connect(tenantId: string, qrEmitter: EventEmitter): Promise<void> {
    console.log(`[WhatsApp] [1/4] Loading Baileys for tenant ${tenantId}`);
    const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion } = await loadBaileys();
    console.log(`[WhatsApp] [2/4] Baileys loaded for tenant ${tenantId}`);

    const { state, saveCreds } = await usePostgresAuthState(tenantId);
    console.log(`[WhatsApp] [3/4] Auth state loaded for tenant ${tenantId}`);

    // Fetch latest WA version with a 10s timeout; fall back to bundled version.
    let version: [number, number, number];
    try {
      const result = await Promise.race([
        fetchLatestBaileysVersion(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timed out after 10s")), 10_000)
        ),
      ]);
      version = result.version;
    } catch (versionErr) {
      version = await getBaileysVersion();
      console.warn(`[WhatsApp] Version fetch failed (${(versionErr as Error).message}), using bundled ${version}`);
    }
    console.log(`[WhatsApp] [4/4] Socket creating with version ${version} for tenant ${tenantId}`);

    const socket = makeWASocket({
      version,
      auth:              state,
      printQRInTerminal: false,
      browser:           ["TallerTrack", "Chrome", "1.0.0"],
      logger: {
        level:  "silent",
        child:  () => ({} as never),
        trace:  () => {}, debug: () => {}, info:  () => {},
        warn:   () => {}, error: () => {}, fatal: () => {},
      } as never,
    });

    console.log(`[WhatsApp] Socket created, waiting for QR for tenant ${tenantId}`);

    const session: ManagedSession = { socket, qrEmitter, status: "connecting" };
    sessions.set(tenantId, session);

    let qrEverEmitted = false;

    // Safety timeout: if WA server never responds within 30s after socket creation
    const noResponseTimeout = setTimeout(() => {
      if (!qrEverEmitted && session.status !== "connected") {
        console.warn(`[WhatsApp] No response from WA server for tenant ${tenantId} after 30s`);
        session.status = "disconnected";
        sessions.delete(tenantId);
        try { socket.end(undefined); } catch { /* ignore */ }
        qrEmitter.emit("error", new Error("WhatsApp no respondió en 30 segundos. El servidor puede no tener acceso a internet."));
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
            console.warn(`[WhatsApp] Tenant ${tenantId} closed before QR (code ${statusCode})`);
            qrEmitter.emit("error", new Error(`WhatsApp rechazó la conexión (código ${statusCode ?? "desconocido"}). Reintentá en unos segundos.`));
          } else {
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
