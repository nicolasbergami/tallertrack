import crypto from "crypto";
import { pool } from "../../config/database";
import { env } from "../../config/env";
import { createHttpError } from "../../middleware/error.middleware";
import {
  BillingPlan,
  BillingStatusResponse,
  CreateSubscriptionResponse,
  MpPayment,
  MpPreapproval,
  MpWebhookBody,
  PLANS,
} from "./billing.types";

const MP_API = "https://api.mercadopago.com";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function requireMpToken(): string {
  if (!env.MP_ACCESS_TOKEN) {
    throw createHttpError(503, "Facturación no configurada. Contacta al soporte.");
  }
  return env.MP_ACCESS_TOKEN;
}

async function mpGet<T>(path: string): Promise<T> {
  const token = requireMpToken();
  const res = await fetch(`${MP_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MP API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

async function mpPost<T>(path: string, body: object): Promise<T> {
  const token = requireMpToken();
  const res = await fetch(`${MP_API}${path}`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`MP API ${res.status}: ${errBody}`);
  }
  return res.json() as Promise<T>;
}

/** Fetch preapproval details from MP */
async function fetchPreapproval(id: string): Promise<MpPreapproval> {
  return mpGet<MpPreapproval>(`/preapproval/${id}`);
}

/** Fetch payment details from MP */
async function fetchPayment(id: string): Promise<MpPayment> {
  return mpGet<MpPayment>(`/v1/payments/${id}`);
}

/**
 * Validates the Mercado Pago webhook signature (x-signature header).
 * Format: ts=<timestamp>;v1=<hmac-sha256-hex>
 * Message signed: "id:{notifId};request-id:{xRequestId};ts:{ts}"
 * If no secret configured, validation is skipped (dev mode).
 */
function validateWebhookSignature(
  signature:  string | undefined,
  requestId:  string | undefined,
  notifId:    string | number
): void {
  if (!env.MP_WEBHOOK_SECRET) return; // skip in dev
  if (!signature) throw createHttpError(401, "Missing x-signature header.");

  const parts = Object.fromEntries(
    signature.split(";").map((p) => p.split("=") as [string, string])
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) throw createHttpError(401, "Invalid x-signature format.");

  // Build the signed message
  const message = requestId
    ? `id:${notifId};request-id:${requestId};ts:${ts}`
    : `id:${notifId};ts:${ts}`;

  const expected = crypto
    .createHmac("sha256", env.MP_WEBHOOK_SECRET)
    .update(message)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"))) {
    throw createHttpError(401, "Invalid webhook signature.");
  }
}

/** Maps a BillingPlan to its reason string for MP */
function planReason(plan: BillingPlan): string {
  return `Plan ${PLANS[plan].displayName} - TallerTrack`;
}

/** Derives the plan from the stored plan column */
function derivePlan(dbPlan: string): BillingPlan {
  if (dbPlan === "starter" || dbPlan === "professional" || dbPlan === "enterprise") {
    return dbPlan;
  }
  return "starter";
}

// ---------------------------------------------------------------------------
// Billing Service
// ---------------------------------------------------------------------------
export const billingService = {

  // ── GET /billing/status ─────────────────────────────────────────────────
  async getStatus(tenantId: string): Promise<BillingStatusResponse> {
    const { rows } = await pool.query<{
      sub_status:             string;
      plan:                   string;
      trial_ends_at:          string | null;
      sub_current_period_end: string | null;
    }>(
      `SELECT sub_status, plan, trial_ends_at, sub_current_period_end
         FROM tenants WHERE id = $1`,
      [tenantId]
    );

    if (!rows[0]) throw createHttpError(404, "Tenant no encontrado.");
    const t = rows[0];
    const now = new Date();

    const inTrial  = t.sub_status === "trialing" && !!t.trial_ends_at && new Date(t.trial_ends_at) > now;
    const isActive = t.sub_status === "active"   && !!t.sub_current_period_end && new Date(t.sub_current_period_end) > now;
    const isAccessible = inTrial || isActive;

    let daysRemaining: number | null = null;
    if (inTrial && t.trial_ends_at) {
      daysRemaining = Math.ceil((new Date(t.trial_ends_at).getTime() - now.getTime()) / 86_400_000);
    } else if (isActive && t.sub_current_period_end) {
      daysRemaining = Math.ceil((new Date(t.sub_current_period_end).getTime() - now.getTime()) / 86_400_000);
    }

    return {
      sub_status:             t.sub_status,
      plan:                   derivePlan(t.plan),
      trial_ends_at:          t.trial_ends_at,
      sub_current_period_end: t.sub_current_period_end,
      is_active:              isAccessible,
      days_remaining:         daysRemaining,
    };
  },

  // ── POST /billing/subscribe ─────────────────────────────────────────────
  async createSubscription(
    tenantId:   string,
    payerEmail: string,
    plan:       BillingPlan
  ): Promise<CreateSubscriptionResponse> {
    const backUrl = `${env.BASE_URL}/billing?success=1`;

    const { rows: priceRows } = await pool.query(
      `SELECT price_ars FROM subscription_plans WHERE slug = $1 AND is_active = TRUE`,
      [plan]
    );
    if (!priceRows[0]) throw createHttpError(404, "Plan no disponible.");
    const price = Number(priceRows[0].price_ars);

    const preapproval = await mpPost<MpPreapproval>("/preapproval", {
      reason:             planReason(plan),
      external_reference: tenantId,
      payer_email:        payerEmail,
      auto_recurring: {
        frequency:          1,
        frequency_type:     "months",
        transaction_amount: price,
        currency_id:        "ARS",
      },
      back_url: backUrl,
      status:   "pending",
    });

    // Persist preapproval ID and payer email on the tenant (optimistic)
    await pool.query(
      `UPDATE tenants
          SET mp_preapproval_id = $2,
              mp_payer_email    = $3,
              plan              = $4,
              updated_at        = NOW()
        WHERE id = $1`,
      [tenantId, preapproval.id, payerEmail, plan]
    );

    return {
      init_point:     preapproval.init_point,
      preapproval_id: preapproval.id,
      plan,
    };
  },

  // ── POST /billing/webhook (called by MP) ────────────────────────────────
  async processWebhook(
    body:      MpWebhookBody,
    signature: string | undefined,
    requestId: string | undefined
  ): Promise<void> {
    // 1. Validate signature
    validateWebhookSignature(signature, requestId, body.id);

    // 2. Route to handler by type
    if (body.type === "subscription_preapproval") {
      await this._handlePreapprovalEvent(body.data.id, body);
    } else if (body.type === "payment") {
      await this._handlePaymentEvent(body.data.id, body);
    }
    // Ignore other event types (test_notification, etc.)
  },

  // ── Internal: handle preapproval status change ──────────────────────────
  async _handlePreapprovalEvent(
    preapprovalId: string,
    rawBody:       MpWebhookBody
  ): Promise<void> {
    // Fetch current state from MP
    const prea = await fetchPreapproval(preapprovalId);

    // Find the tenant that owns this preapproval
    const { rows } = await pool.query<{ id: string; plan: string }>(
      `SELECT id, plan FROM tenants WHERE mp_preapproval_id = $1`,
      [preapprovalId]
    );

    // Also try by external_reference (in case preapproval_id wasn't saved yet)
    let tenantId = rows[0]?.id;
    if (!tenantId && prea.external_reference) {
      const { rows: r2 } = await pool.query<{ id: string }>(
        `SELECT id FROM tenants WHERE id = $1`,
        [prea.external_reference]
      );
      tenantId = r2[0]?.id;
      if (tenantId) {
        // Save the preapproval_id we didn't have yet
        await pool.query(
          `UPDATE tenants SET mp_preapproval_id = $2, updated_at = NOW() WHERE id = $1`,
          [tenantId, preapprovalId]
        );
      }
    }

    if (!tenantId) {
      console.warn(`[Billing] No tenant found for preapproval ${preapprovalId}`);
      return;
    }

    // Derive plan from reason or existing plan column
    const tenantRow = rows[0] ?? { plan: "starter" };
    const plan = derivePlan(tenantRow.plan);

    // Log the event
    await pool.query(
      `INSERT INTO billing_events (tenant_id, mp_id, event_type, plan, amount, status, raw)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        tenantId,
        preapprovalId,
        `subscription.${prea.status}`,
        plan,
        prea.auto_recurring.transaction_amount,
        prea.status,
        JSON.stringify(rawBody),
      ]
    );

    // Update tenant subscription state
    if (prea.status === "authorized") {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);

      await pool.query(
        `UPDATE tenants
            SET sub_status                = 'active',
                plan                      = $2,
                sub_current_period_start  = NOW(),
                sub_current_period_end    = $3,
                mp_payer_email            = $4,
                updated_at                = NOW()
          WHERE id = $1`,
        [tenantId, plan, periodEnd.toISOString(), prea.payer_email]
      );
      console.log(`[Billing] Tenant ${tenantId} activated — plan: ${plan}`);

    } else if (prea.status === "cancelled") {
      await pool.query(
        `UPDATE tenants SET sub_status = 'canceled', updated_at = NOW() WHERE id = $1`,
        [tenantId]
      );
      console.log(`[Billing] Tenant ${tenantId} subscription cancelled.`);

    } else if (prea.status === "paused") {
      await pool.query(
        `UPDATE tenants SET sub_status = 'paused', updated_at = NOW() WHERE id = $1`,
        [tenantId]
      );
    }
  },

  // ── Internal: handle individual payment confirmation ────────────────────
  async _handlePaymentEvent(
    paymentId: string,
    rawBody:   MpWebhookBody
  ): Promise<void> {
    const payment = await fetchPayment(paymentId);

    // Only process approved payments
    if (payment.status !== "approved") return;

    // Find tenant by external_reference (set when creating the preapproval)
    const tenantId = payment.external_reference;
    if (!tenantId) return;

    const { rows } = await pool.query<{ id: string; plan: string }>(
      `SELECT id, plan FROM tenants WHERE id = $1`,
      [tenantId]
    );
    if (!rows[0]) return;

    const plan = derivePlan(rows[0].plan);

    // Log
    await pool.query(
      `INSERT INTO billing_events (tenant_id, mp_id, event_type, plan, amount, currency, status, raw)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        tenantId,
        String(payment.id),
        "payment.approved",
        plan,
        payment.transaction_amount,
        payment.currency_id ?? "ARS",
        payment.status,
        JSON.stringify(rawBody),
      ]
    );

    // Extend the subscription period by 30 days from the current end
    // (or from now if somehow the period has already lapsed)
    await pool.query(
      `UPDATE tenants
          SET sub_status             = 'active',
              sub_current_period_end = GREATEST(sub_current_period_end, NOW()) + INTERVAL '30 days',
              updated_at             = NOW()
        WHERE id = $1`,
      [tenantId]
    );

    console.log(`[Billing] Tenant ${tenantId} — payment approved, period extended.`);
  },
};
