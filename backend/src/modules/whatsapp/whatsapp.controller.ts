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

    // SSE headers
    res.setHeader("Content-Type",  "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection",    "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering
    res.flushHeaders();

    // Helper to send an SSE event
    const send = (payload: object) =>
      res.write(`data: ${JSON.stringify(payload)}\n\n`);

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
      qrEmitter.off("qr",           onQR);
      qrEmitter.off("connected",    onConnected);
      qrEmitter.off("disconnected", onDisconnected);
      qrEmitter.off("error",        onError);
    }

    qrEmitter.on("qr",           onQR);
    qrEmitter.on("connected",    onConnected);
    qrEmitter.on("disconnected", onDisconnected);
    qrEmitter.on("error",        onError);

    // 5-minute timeout (WhatsApp QR codes expire after ~2 min, allow two scans)
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
