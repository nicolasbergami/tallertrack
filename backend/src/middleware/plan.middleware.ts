import { Request, Response, NextFunction } from "express";
import { pool } from "../config/database";

// Plans ordered by tier (mirrors frontend PLAN_RANK)
const PLAN_RANK: Record<string, number> = {
  free:         0,
  starter:      1,
  professional: 2,
  enterprise:   3,
};

/**
 * Middleware factory that blocks access when the tenant's effective plan
 * is below the required minimum.
 *
 * Business rule: trial users get professional-level access.
 * "trialing" → effective plan = "professional"
 *
 * Usage:
 *   router.patch("/settings/logo", authenticate, requirePlan("professional"), handler)
 *
 * Returns HTTP 403 with a structured JSON body when access is denied.
 */
export function requirePlan(minimumPlan: string) {
  return async (
    req:  Request,
    res:  Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { rows } = await pool.query<{
        plan:            string;
        sub_status:      string;
        trial_ends_at:   string | null;
      }>(
        `SELECT plan, sub_status, trial_ends_at FROM tenants WHERE id = $1`,
        [req.user.tenant_id],
      );

      if (!rows[0]) {
        res.status(404).json({ error: "Tenant no encontrado." });
        return;
      }

      const { plan, sub_status, trial_ends_at } = rows[0];

      // Trialing users get professional-level benefits (business rule)
      const isActiveTrial =
        sub_status === "trialing" &&
        trial_ends_at != null &&
        new Date(trial_ends_at) > new Date();

      const effectivePlan = isActiveTrial ? "professional" : plan;
      const requiredRank  = PLAN_RANK[minimumPlan] ?? 0;
      const currentRank   = PLAN_RANK[effectivePlan] ?? 0;

      if (currentRank >= requiredRank) {
        next();
        return;
      }

      res.status(403).json({
        error:         "plan_required",
        message:       `Esta función requiere el plan "${minimumPlan}" o superior.`,
        required_plan: minimumPlan,
        current_plan:  plan,
        sub_status,
        upgrade_url:   "/billing",
      });
    } catch (err) {
      next(err);
    }
  };
}
