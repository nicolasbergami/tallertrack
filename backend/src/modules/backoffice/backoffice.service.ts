import jwt from "jsonwebtoken";
import { withAdminContext } from "../../config/database";
import { env } from "../../config/env";
import { createHttpError } from "../../middleware/error.middleware";
import type {
  BackofficeDashboard,
  BackofficeTenant,
  TenantListResponse,
  RecentActivity,
  ImpersonateResponse,
} from "./backoffice.types";


export const backofficeService = {

  // ── Dashboard metrics (cross-tenant) ─────────────────────────────────────

  async getDashboard(): Promise<BackofficeDashboard> {
    return withAdminContext(async (client) => {

      // Tenant counts + MRR in a single scan
      const { rows: tenantRows } = await client.query<{
        total_tenants:  string;
        active_tenants: string;
        trial_tenants:  string;
        free_tenants:   string;
        new_this_month: string;
        new_last_month: string;
      }>(`
        SELECT
          COUNT(*)                                                                AS total_tenants,
          COUNT(*) FILTER (WHERE sub_status = 'active')                          AS active_tenants,
          COUNT(*) FILTER (WHERE sub_status = 'trialing')                        AS trial_tenants,
          COUNT(*) FILTER (WHERE sub_status NOT IN ('active', 'trialing'))        AS free_tenants,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))        AS new_this_month,
          COUNT(*) FILTER (
            WHERE created_at >= date_trunc('month', NOW() - INTERVAL '1 month')
              AND created_at <  date_trunc('month', NOW())
          )                                                                       AS new_last_month
        FROM tenants
        WHERE deleted_at IS NULL
      `);

      // Total non-deleted users across all tenants
      const { rows: userRows } = await client.query<{ total_users: string }>(`
        SELECT COUNT(*) AS total_users
        FROM   users
        WHERE  deleted_at IS NULL
      `);

      // MRR: active (non-trial) subscriptions — price from subscription_plans table
      const { rows: mrrRows } = await client.query<{ price_ars: string; cnt: string }>(`
        SELECT sp.price_ars, COUNT(t.id) AS cnt
        FROM   tenants t
        JOIN   subscription_plans sp ON sp.slug = t.plan::text
        WHERE  t.sub_status = 'active'
          AND  t.deleted_at IS NULL
        GROUP  BY sp.price_ars
      `);

      const mrr = mrrRows.reduce(
        (sum, row) => sum + Number(row.price_ars) * Number(row.cnt),
        0,
      );

      const t = tenantRows[0];
      return {
        mrr,
        total_tenants:          Number(t.total_tenants),
        active_tenants:         Number(t.active_tenants),
        trialing_tenants:       Number(t.trial_tenants),
        free_tenants:           Number(t.free_tenants),
        new_tenants_this_month: Number(t.new_this_month),
        new_tenants_last_month: Number(t.new_last_month),
        total_users:            Number(userRows[0].total_users),
      };
    });
  },

  // ── Tenant list with pagination, search, and filters ─────────────────────

  async getTenants(
    page:         number,
    limit:        number,
    search:       string,
    planFilter:   string,
    statusFilter: string,
  ): Promise<TenantListResponse> {
    return withAdminContext(async (client) => {
      const offset      = (page - 1) * limit;
      const searchParam = search ? `%${search}%` : null;

      const { rows } = await client.query<BackofficeTenant & { total_count: string }>(`
        SELECT
          t.id,
          t.name,
          t.slug,
          t.plan,
          t.sub_status,
          t.trial_ends_at,
          t.sub_current_period_end,
          t.created_at,
          t.cancellation_reason,
          COUNT(DISTINCT u.id)  FILTER (WHERE u.deleted_at IS NULL)                    AS user_count,
          COUNT(DISTINCT wo.id) FILTER (WHERE wo.status NOT IN ('delivered','cancelled')) AS active_work_orders,
          COUNT(*) OVER ()                                                               AS total_count
        FROM  tenants t
        LEFT  JOIN users       u  ON u.tenant_id  = t.id
        LEFT  JOIN work_orders wo ON wo.tenant_id = t.id
        WHERE t.deleted_at IS NULL
          AND ($1::text IS NULL OR t.name ILIKE $1 OR t.slug ILIKE $1)
          AND ($2::text IS NULL OR t.plan::text       = $2)
          AND ($3::text IS NULL OR t.sub_status::text = $3)
        GROUP  BY t.id
        ORDER  BY t.created_at DESC
        LIMIT  $4 OFFSET $5
      `, [searchParam, planFilter || null, statusFilter || null, limit, offset]);

      const total = rows[0] ? Number(rows[0].total_count) : 0;

      return {
        tenants: rows.map(({ total_count: _tc, ...rest }) => ({
          ...rest,
          user_count:         Number(rest.user_count),
          active_work_orders: Number(rest.active_work_orders),
        })),
        total,
        page,
        total_pages: Math.ceil(total / limit),
      };
    });
  },

  // ── Recent sign-ups timeline ──────────────────────────────────────────────

  async getRecentActivity(days: number): Promise<RecentActivity[]> {
    return withAdminContext(async (client) => {
      const { rows } = await client.query<RecentActivity>(`
        SELECT id, name, slug, plan, sub_status, created_at
        FROM   tenants
        WHERE  deleted_at IS NULL
          AND  created_at >= NOW() - ($1 || ' days')::INTERVAL
        ORDER  BY created_at DESC
        LIMIT  100
      `, [days]);
      return rows;
    });
  },

  // ── Plan / status override ────────────────────────────────────────────────

  // ── Subscription plan price update ───────────────────────────────────────

  async updatePlanPrice(slug: string, priceArs: number): Promise<void> {
    await withAdminContext(async (client) => {
      const { rowCount } = await client.query(
        `UPDATE subscription_plans SET price_ars = $1, updated_at = NOW() WHERE slug = $2`,
        [priceArs, slug]
      );
      if (!rowCount) throw createHttpError(404, "Plan no encontrado.");
    });
  },

  // ── Impersonate a tenant (superadmin only) ───────────────────────────────

  async impersonate(tenantId: string): Promise<ImpersonateResponse> {
    return withAdminContext(async (client) => {
      const { rows: tenantRows } = await client.query<{
        id: string; name: string; slug: string; plan: string; sub_status: string;
      }>(
        `SELECT id, name, slug, plan, sub_status
           FROM tenants
          WHERE id = $1 AND deleted_at IS NULL`,
        [tenantId],
      );
      const tenant = tenantRows[0];
      if (!tenant) throw createHttpError(404, "Tenant no encontrado.");

      const { rows: userRows } = await client.query<{
        id: string; email: string; full_name: string; role: string;
      }>(
        `SELECT id, email, full_name, role
           FROM users
          WHERE tenant_id = $1
            AND deleted_at IS NULL
            AND status = 'active'
          ORDER BY
            CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
            created_at ASC
          LIMIT 1`,
        [tenantId],
      );
      const user = userRows[0];
      if (!user) throw createHttpError(404, "El taller no tiene usuarios activos.");

      const payload = {
        sub:             user.id,
        tenant_id:       tenant.id,
        role:            user.role,
        email:           user.email,
        is_system_admin: false,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: "8h" as any });

      return {
        token,
        user: {
          id:           user.id,
          full_name:    user.full_name,
          email:        user.email,
          role:         user.role,
          tenant_id:    tenant.id,
          tenant_name:  tenant.name,
          tenant_slug:  tenant.slug,
          plan:         tenant.plan,
          sub_status:   tenant.sub_status,
        },
      };
    });
  },

  // ── Plan / status override ────────────────────────────────────────────────

  async updateTenantPlan(
    tenantId:             string,
    plan:                 string,
    subStatus:            string,
    trialEndsAt?:          string | null,
    subCurrentPeriodEnd?: string | null,
  ): Promise<void> {
    await withAdminContext(async (client) => {
      await client.query(`
        UPDATE tenants
           SET plan                   = $1,
               sub_status             = $2,
               trial_ends_at          = $3,
               sub_current_period_end = $4,
               updated_at             = NOW()
         WHERE id = $5
           AND deleted_at IS NULL
      `, [plan, subStatus, trialEndsAt ?? null, subCurrentPeriodEnd ?? null, tenantId]);
    });
  },
};
