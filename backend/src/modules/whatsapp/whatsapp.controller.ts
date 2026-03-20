import { Request, Response } from "express";
import QRCode from "qrcode";
import { sessionManager } from "../../integrations/whatsapp-direct/session-manager";

export const whatsappController = {
  // ── GET /api/v1/whatsapp/status ─────────────────────────────────────────
  getStatus(req: Request, res: Response): void {
    const { tenant_id } = req.user;
    res.json(sessionManager.getStatus(tenant_id));
  },

  // ── GET /api/v1/whatsapp/connect  (SSE — streams QR + connection events) ─
  connectSSE(req: Request, res: Response): void {
    const { tenant_id } = req.user;

    // Disable Nagle's algorithm so small SSE packets aren't held waiting
    // for more data — critical for proxies (Railway, Nginx) that buffer TCP
    res.socket?.setNoDelay(true);

    // SSE headers
    res.setHeader("Content-Type",      "text/event-stream");
    res.setHeader("Cache-Control",     "no-cache");
    res.setHeader("Connection",        "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx / Railway buffering
    res.flushHeaders();

    // Send an initial comment — forces proxy buffers to flush and confirms
    // to the browser that the stream is alive before the QR is ready
    res.write(": stream-open\n\n");

    // Helper to send an SSE event + force-flush so Railway doesn't buffer it
    const send = (payload: object): void => {
      if (res.writableEnded) return;
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      // res.flush() is available when compression middleware is active;
      // otherwise the write above goes directly to the socket (no-op guard)
      (res as unknown as { flush?: () => void }).flush?.();
    };

    // If already connected, respond immediately
    const current = sessionManager.getStatus(tenant_id);
    if (current.status === "connected") {
      send({ type: "connected", phone: current.phone });
      res.end();
      return;
    }

    const qrEmitter = sessionManager.startSession(tenant_id);

    // ── Event handlers ──────────────────────────────────────────────────
    const onQR = async (rawQr: string) => {
      try {
        const dataUrl = await QRCode.toDataURL(rawQr, { width: 300, margin: 2 });
        send({ type: "qr", qr: dataUrl });
      } catch (err) {
        console.error("[WhatsApp] QR render error:", err);
      }
    };

    const onConnected = (data: { phone?: string }) => {
      send({ type: "connected", phone: data.phone ?? null });
      cleanup();
      res.end();
    };

    const onDisconnected = (data: { reason: string }) => {
      send({ type: "disconnected", reason: data.reason });
      cleanup();
      res.end();
    };

    const onError = (err: Error) => {
      send({ type: "error", message: err.message });
      cleanup();
      res.end();
    };

    function cleanup() {
      clearTimeout(timeout);
      clearInterval(heartbeat);
      qrEmitter.off("qr",           onQR);
      qrEmitter.off("connected",    onConnected);
      qrEmitter.off("disconnected", onDisconnected);
      qrEmitter.off("error",        onError);
    }

    qrEmitter.on("qr",           onQR);
    qrEmitter.on("connected",    onConnected);
    qrEmitter.on("disconnected", onDisconnected);
    qrEmitter.on("error",        onError);

    // Heartbeat every 10 s: keeps the connection alive through Railway's
    // idle-connection timeout and forces proxy buffers to flush
    const heartbeat = setInterval(() => {
      if (!res.writableEnded) res.write(": heartbeat\n\n");
    }, 10_000);

    // 5-minute timeout (WA QR codes expire after ~2 min; allow two scans)
    const timeout = setTimeout(() => {
      send({ type: "timeout" });
      cleanup();
      res.end();
    }, 5 * 60 * 1_000);

    req.on("close", cleanup);
  },

  // ── POST /api/v1/whatsapp/disconnect ────────────────────────────────────
  async disconnect(req: Request, res: Response): Promise<void> {
    const { tenant_id } = req.user;
    await sessionManager.disconnectSession(tenant_id);
    res.json({ success: true });
  },
};
