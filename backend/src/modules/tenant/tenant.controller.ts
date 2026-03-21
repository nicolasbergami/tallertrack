import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { pool } from "../../config/database";
import { createHttpError } from "../../middleware/error.middleware";

// Plans that allow brand customization
const LOGO_ALLOWED_PLANS = new Set(["professional", "enterprise"]);

const UpdateLogoSchema = z.object({
  logo_url: z
    .string()
    .url("La URL del logo no es válida.")
    .max(2048, "La URL es demasiado larga.")
    .nullable(),
});

export const tenantController = {

  // GET /api/v1/tenant/settings
  async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { rows } = await pool.query<{ settings: Record<string, unknown> }>(
        `SELECT settings FROM tenants WHERE id = $1`,
        [req.user.tenant_id]
      );
      if (!rows[0]) throw createHttpError(404, "Tenant no encontrado.");
      res.json({ settings: rows[0].settings });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /api/v1/tenant/settings/logo
  async updateLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { logo_url } = UpdateLogoSchema.parse(req.body);

      // ── Plan guard ─────────────────────────────────────────────────────────
      const { rows } = await pool.query<{
        plan: string;
        sub_status: string;
        trial_ends_at: string | null;
      }>(
        `SELECT plan, sub_status, trial_ends_at FROM tenants WHERE id = $1`,
        [req.user.tenant_id]
      );
      if (!rows[0]) throw createHttpError(404, "Tenant no encontrado.");

      const { plan, sub_status, trial_ends_at } = rows[0];

      const isActiveTrial =
        sub_status === "trialing" &&
        trial_ends_at != null &&
        new Date(trial_ends_at) > new Date();

      if (!LOGO_ALLOWED_PLANS.has(plan) && !isActiveTrial) {
        throw createHttpError(
          403,
          "La personalización de marca requiere el plan Taller Pro o superior."
        );
      }

      // ── Persist ────────────────────────────────────────────────────────────
      await pool.query(
        `UPDATE tenants
            SET settings   = jsonb_set(settings, '{logo_url}', $1::jsonb, true),
                updated_at = NOW()
          WHERE id = $2`,
        [JSON.stringify(logo_url), req.user.tenant_id]
      );

      res.json({ logo_url });
    } catch (err) {
      next(err);
    }
  },
};
