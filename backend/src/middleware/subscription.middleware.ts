import { Request, Response, NextFunction } from "express";
import { pool } from "../config/database";

interface TenantRow {
  sub_status:             string;
  trial_ends_at:          string | null;
  sub_current_period_end: string | null;
}

/**
 * Blocks access when a tenant's trial AND paid subscription have both expired.
 *
 * Access is granted if ANY of these is true:
 *   • sub_status = 'trialing'  AND trial_ends_at > NOW()
 *   • sub_status = 'active'    AND sub_current_period_end > NOW()
 *
 * Returns HTTP 402 Payment Required otherwise, with a JSON body the frontend
 * can use to redirect the user to /billing.
 */
export async function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { rows } = await pool.query<TenantRow>(
      `SELECT sub_status, trial_ends_at, sub_current_period_end
         FROM tenants WHERE id = $1`,
      [req.user.tenant_id]
    );

    if (!rows[0]) {
      res.status(401).json({ error: "Tenant no encontrado." });
      return;
    }

    const t   = rows[0];
    const now = new Date();

    const inTrial = t.sub_status === "trialing"
      && !!t.trial_ends_at
      && new Date(t.trial_ends_at) > now;

    // 'canceling': tenant cancelled but already paid — access until period_end
    const isActive = (t.sub_status === "active" || t.sub_status === "canceling")
      && !!t.sub_current_period_end
      && new Date(t.sub_current_period_end) > now;

    if (inTrial || isActive) {
      next();
      return;
    }

    // Calculate how long ago it expired (useful for error messages)
    const expiredSince = t.sub_current_period_end
      ? Math.floor((now.getTime() - new Date(t.sub_current_period_end).getTime()) / 86_400_000)
      : null;

    res.status(402).json({
      error:       "subscription_required",
      message:     t.sub_status === "trialing"
        ? "Tu período de prueba gratuita ha expirado. Activá tu suscripción para continuar."
        : `Tu suscripción venció hace ${expiredSince ?? "varios"} días.`,
      upgrade_url: "/billing",
      sub_status:  t.sub_status,
    });
  } catch (err) {
    next(err);
  }
}
