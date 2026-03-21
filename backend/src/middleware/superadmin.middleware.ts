import { Request, Response, NextFunction } from "express";
import { withTenantContext } from "../config/database";
import { env } from "../config/env";

/**
 * Middleware that restricts access to TallerTrack system administrators.
 *
 * Checks in order:
 *  1. SUPERADMIN_EMAILS env var (comma-separated list) — no DB query, instant.
 *  2. is_system_admin column in the users table (DB lookup within tenant context).
 *
 * Must be used AFTER the `authenticate` middleware.
 *
 * Usage:
 *   router.get("/backoffice/dashboard", authenticate, requireSuperAdmin, handler)
 */
export async function requireSuperAdmin(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Fast path — check the env allow-list (no DB round-trip needed).
    const allowedEmails = env.SUPERADMIN_EMAILS
      ? env.SUPERADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
      : [];

    if (allowedEmails.length > 0 && allowedEmails.includes(req.user.email.toLowerCase())) {
      next();
      return;
    }

    // JWT fast path — if the token already carries the flag (new tokens post-migration).
    if (req.user.is_system_admin === true) {
      next();
      return;
    }

    // DB fallback — verifies the flag in the database for tokens issued before the migration.
    // Uses withTenantContext so the RLS session variable is set correctly.
    let isAdmin = false;
    await withTenantContext(req.user.tenant_id, async (client) => {
      const { rows } = await client.query<{ is_system_admin: boolean }>(
        `SELECT is_system_admin FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [req.user.sub],
      );
      isAdmin = rows[0]?.is_system_admin === true;
    });

    if (isAdmin) {
      next();
      return;
    }

    res.status(403).json({
      error:   "superadmin_required",
      message: "Acceso denegado. Se requieren privilegios de super administrador.",
    });
  } catch (err) {
    next(err);
  }
}
