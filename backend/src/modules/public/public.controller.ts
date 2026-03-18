import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { publicService } from "./public.service";

const quoteResponseSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional(),
});

export const publicController = {
  // GET /api/v1/public/orders/:tenantSlug/:orderNumber
  async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantSlug, orderNumber } = req.params;
      const data = await publicService.getOrderByNumber(tenantSlug, orderNumber);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/public/orders/:tenantSlug/:orderNumber/quotes/:quoteId/respond
  async respondToQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantSlug, orderNumber, quoteId } = req.params;
      const dto = quoteResponseSchema.parse(req.body);

      const result = await publicService.respondToQuote(
        tenantSlug,
        orderNumber,
        quoteId,
        dto,
        {
          ip:        req.ip,
          userAgent: req.headers["user-agent"],
        }
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
