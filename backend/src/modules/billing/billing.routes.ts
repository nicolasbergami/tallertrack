import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { billingController } from "./billing.controller";

const router = Router();

type AsyncHandler = (req: Request, res: Response) => Promise<void>;
const wrap = (fn: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

// ── Public — no auth required ─────────────────────────────────────────────

// GET  /api/v1/billing/plans       — returns plan configs (prices, features)
router.get("/plans", billingController.getPlans.bind(billingController));

// POST /api/v1/billing/webhook     — Mercado Pago notification endpoint
// IMPORTANT: must be before the authenticate middleware
router.post("/webhook", wrap(billingController.webhook.bind(billingController)));

// ── Protected — JWT required ──────────────────────────────────────────────
router.use(authenticate);

// GET  /api/v1/billing/status      — current plan / subscription status
router.get("/status", wrap(billingController.getStatus.bind(billingController)));

// POST /api/v1/billing/subscribe   — create MP preapproval and get init_point
router.post("/subscribe", wrap(billingController.createSubscription.bind(billingController)));

export default router;
