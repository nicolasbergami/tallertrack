import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { whatsappController } from "./whatsapp.controller";

const router = Router();

// All routes require a valid JWT
router.use(authenticate);

// GET  /api/v1/whatsapp/status     — current session status + linked phone
router.get("/status", whatsappController.getStatus.bind(whatsappController));

// GET  /api/v1/whatsapp/connect    — SSE stream: emits qr / connected / disconnected / timeout
router.get("/connect", whatsappController.connectSSE.bind(whatsappController));

// POST /api/v1/whatsapp/disconnect — logout and clean up session
router.post("/disconnect", (req, res) => {
  whatsappController.disconnect(req, res).catch((err: unknown) => {
    console.error("[WhatsApp] Disconnect error:", err);
    res.status(500).json({ error: "No se pudo desconectar la sesión." });
  });
});

export default router;
