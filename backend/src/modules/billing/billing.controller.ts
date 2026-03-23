import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../../config/database";
import { billingService } from "./billing.service";
import { BillingPlan, MpWebhookBody } from "./billing.types";

const subscribeDtoSchema = z.object({
  plan: z.enum(["starter", "professional", "enterprise"]),
});

const cancelDtoSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const billingController = {
  // ── GET /api/v1/billing/status ─────────────────────────────────────────
  async getStatus(req: Request, res: Response): Promise<void> {
    const status = await billingService.getStatus(req.user.tenant_id);
    res.json(status);
  },

  // ── GET /api/v1/billing/plans ──────────────────────────────────────────
  async getPlans(_req: Request, res: Response): Promise<void> {
    const { rows } = await pool.query(
      `SELECT slug AS id, price_ars AS price FROM subscription_plans WHERE is_active = TRUE ORDER BY price_ars`
    );
    res.json(rows.map(r => ({ id: r.id, price: Number(r.price) })));
  },

  // ── POST /api/v1/billing/subscribe ────────────────────────────────────
  async createSubscription(req: Request, res: Response): Promise<void> {
    const parsed = subscribeDtoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Plan inválido.", details: parsed.error.flatten() });
      return;
    }

    const result = await billingService.createSubscription(
      req.user.tenant_id,
      req.user.email,
      parsed.data.plan as BillingPlan
    );

    res.status(201).json(result);
  },

  // ── POST /api/v1/billing/cancel ───────────────────────────────────────
  async cancelSubscription(req: Request, res: Response): Promise<void> {
    const { reason } = cancelDtoSchema.parse(req.body);
    await billingService.cancelSubscription(req.user.tenant_id, reason);
    res.json({ success: true });
  },

  // ── POST /api/v1/billing/webhook (public — called by MP) ──────────────
  async webhook(req: Request, res: Response): Promise<void> {
    // Respond 200 immediately — MP retries if we don't answer quickly
    res.sendStatus(200);

    const body      = req.body as MpWebhookBody;
    const signature = req.headers["x-signature"] as string | undefined;
    const requestId = req.headers["x-request-id"] as string | undefined;

    // Process asynchronously so the 200 is already sent
    billingService
      .processWebhook(body, signature, requestId)
      .catch((err) => console.error("[Billing] Webhook processing error:", err));
  },
};
