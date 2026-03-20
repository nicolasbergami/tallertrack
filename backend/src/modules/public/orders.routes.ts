// ---------------------------------------------------------------------------
// Public order approval routes — no authentication required
// These endpoints are called by clients via WhatsApp one-click links.
//
// URL structure: /api/orders/:tenantSlug/:orderNumber/approve|reject
// ---------------------------------------------------------------------------

import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { publicController } from "./public.controller";

const router = Router();

// Strict rate limit — these are legal events (1 approve/reject per order per 15 min per IP)
const approvalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/orders/:tenantSlug/:orderNumber/approve
 * @desc    Client approves the latest sent quote → work order transitions to in_progress
 * @access  Public (one-click WhatsApp link)
 * @logs    IP address + User-Agent in history_logs (immutable legal record)
 */
router.post(
  "/:tenantSlug/:orderNumber/approve",
  approvalLimiter,
  publicController.approveOrder,
);

/**
 * @route   POST /api/orders/:tenantSlug/:orderNumber/reject
 * @desc    Client rejects the latest sent quote → work order transitions to cancelled
 * @access  Public (one-click WhatsApp link)
 * @logs    IP address + User-Agent in history_logs (immutable legal record)
 */
router.post(
  "/:tenantSlug/:orderNumber/reject",
  approvalLimiter,
  publicController.rejectOrder,
);

export default router;
