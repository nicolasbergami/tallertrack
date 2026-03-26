import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { backofficeService } from "./backoffice.service";

const UpdatePlanPriceSchema = z.object({
  price_ars: z.number().int().min(1),
});

const UpdatePlanSchema = z.object({
  plan:                   z.enum(["free", "starter", "professional", "enterprise"]),
  sub_status:             z.enum(["active", "trialing", "inactive", "cancelled", "past_due"]),
  trial_ends_at:          z.string().nullable().optional(),
  sub_current_period_end: z.string().nullable().optional(),
});

export const backofficeController = {

  // GET /api/v1/backoffice/dashboard
  async getDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await backofficeService.getDashboard();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/backoffice/tenants?page=1&limit=20&search=&plan=&status=
  async getTenants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page   = Math.max(1, Number(req.query.page)  || 1);
      const limit  = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      const search = String(req.query.search ?? "").trim();
      const plan   = String(req.query.plan   ?? "").trim();
      const status = String(req.query.status ?? "").trim();

      const data = await backofficeService.getTenants(page, limit, search, plan, status);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/backoffice/activity?days=30
  async getActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
      const data = await backofficeService.getRecentActivity(days);
      res.json({ activity: data });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /api/v1/backoffice/plans/:slug
  async updatePlanPrice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;
      const { price_ars } = UpdatePlanPriceSchema.parse(req.body);
      await backofficeService.updatePlanPrice(slug, price_ars);
      res.json({ success: true, slug, price_ars });
    } catch (err) { next(err); }
  },

  // PATCH /api/v1/backoffice/tenants/:id/plan
  async updateTenantPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { plan, sub_status, trial_ends_at, sub_current_period_end } = UpdatePlanSchema.parse(req.body);
      await backofficeService.updateTenantPlan(id, plan, sub_status, trial_ends_at, sub_current_period_end);
      res.json({ success: true, id, plan, sub_status });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/backoffice/tenants/:id/impersonate
  async impersonate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await backofficeService.impersonate(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
