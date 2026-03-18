import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { publicController } from "./public.controller";

const router = Router();

// Moderate rate limit — public endpoint, but protect against scraping
const publicLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  message: { error: "Demasiadas solicitudes. Intenta en unos minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for approval actions (legal events)
const actionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Límite de acciones alcanzado. Intenta en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route  GET /api/v1/public/orders/:tenantSlug/:orderNumber
 * @desc   Returns public order data (status, vehicle, quotes) — no auth required
 * @access Public (QR code URL)
 */
router.get(
  "/orders/:tenantSlug/:orderNumber",
  publicLimiter,
  publicController.getOrder
);

/**
 * @route  POST /api/v1/public/orders/:tenantSlug/:orderNumber/quotes/:quoteId/respond
 * @desc   Client approves or rejects a quote — logs legal timestamp + IP
 * @access Public (QR code URL)
 * @body   { action: "approve" | "reject", reason?: string }
 */
router.post(
  "/orders/:tenantSlug/:orderNumber/quotes/:quoteId/respond",
  actionLimiter,
  publicController.respondToQuote
);

export default router;
