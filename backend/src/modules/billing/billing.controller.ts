import { Request, Response } from "express";
import { z } from "zod";
import { billingService } from "./billing.service";
import { BillingPlan, PLANS, MpWebhookBody } from "./billing.types";

const subscribeDtoSchema = z.object({
  plan: z.enum(["starter", "professional", "enterprise"]),
});

export const billingController = {
  // ── GET /api/v1/billing/status ─────────────────────────────────────────
  async getStatus(req: Request, res: Response): Promise<void> {
    const status = await billingService.getStatus(req.user.tenant_id);
    res.json(status);
  },

  // ── GET /api/v1/billing/plans ──────────────────────────────────────────
  getPlans(_req: Request, res: Response): void {
    res.json(Object.values(PLANS));
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
