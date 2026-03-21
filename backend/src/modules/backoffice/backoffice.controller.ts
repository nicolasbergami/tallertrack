import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { backofficeService } from "./backoffice.service";

const UpdatePlanSchema = z.object({
  plan:       z.enum(["free", "starter", "professional", "enterprise"]),
  sub_status: z.enum(["active", "trialing", "inactive", "cancelled", "past_due"]),
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

  // PATCH /api/v1/backoffice/tenants/:id/plan
  async updateTenantPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id }             = req.params;
      const { plan, sub_status } = UpdatePlanSchema.parse(req.body);
      await backofficeService.updateTenantPlan(id, plan, sub_status);
      res.json({ success: true, id, plan, sub_status });
    } catch (err) {
      next(err);
    }
  },
};
