import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { workOrderService } from "./work-order.service";
import { WORK_ORDER_STATUSES, WorkOrderStatus } from "./work-order.types";

// ---------------------------------------------------------------------------
// Input validation schemas (Zod)
// ---------------------------------------------------------------------------
const createSchema = z.object({
  vehicle_id:          z.string().uuid(),
  client_id:           z.string().uuid(),
  complaint:           z.string().min(5, "Describa la falla con al menos 5 caracteres."),
  mileage_in:          z.number().int().positive().optional(),
  estimated_delivery:  z.string().datetime({ offset: true }).optional(),
  assigned_to:         z.string().uuid().optional(),
  internal_notes:      z.string().optional(),
});

const transitionSchema = z.object({
  status:         z.enum(WORK_ORDER_STATUSES as [WorkOrderStatus, ...WorkOrderStatus[]]),
  diagnosis:      z.string().optional(),
  internal_notes: z.string().optional(),
  mileage_out:    z.number().int().positive().optional(),
});

const listQuerySchema = z.object({
  status: z
    .enum(WORK_ORDER_STATUSES as [WorkOrderStatus, ...WorkOrderStatus[]])
    .optional(),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------
export const workOrderController = {
  // GET /work-orders
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listQuerySchema.parse(req.query);
      const result = await workOrderService.list(req.user.tenant_id, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // GET /work-orders/:id
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workOrder = await workOrderService.getById(req.user.tenant_id, req.params.id);
      res.json(workOrder);
    } catch (err) {
      next(err);
    }
  },

  // POST /work-orders
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = createSchema.parse(req.body);
      const workOrder = await workOrderService.create(
        req.user.tenant_id,
        req.user.sub,
        dto,
        { ip: req.ip, userAgent: req.headers["user-agent"] }
      );
      res.status(201).json(workOrder);
    } catch (err) {
      next(err);
    }
  },

  // PATCH /work-orders/:id/transition
  async transition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = transitionSchema.parse(req.body);
      const workOrder = await workOrderService.transition(
        req.user.tenant_id,
        req.params.id,
        req.user.sub,
        dto,
        { ip: req.ip, userAgent: req.headers["user-agent"] }
      );
      res.json(workOrder);
    } catch (err) {
      next(err);
    }
  },

  // GET /work-orders/:id/transitions — returns valid next states
  async getAvailableTransitions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const transitions = await workOrderService.getAvailableTransitions(
        req.user.tenant_id,
        req.params.id
      );
      res.json(transitions);
    } catch (err) {
      next(err);
    }
  },

  // GET /work-orders/:id/qr — returns QR code as PNG image
  async getQrPng(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pngBuffer, url } = await workOrderService.getQrCode(
        req.user.tenant_id,
        req.params.id
      );
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400"); // QR is stable; cache 1 day
      res.setHeader("X-Tracking-URL", url);
      res.send(pngBuffer);
    } catch (err) {
      next(err);
    }
  },

  // GET /work-orders/:id/qr.json — returns QR as base64 JSON (for mobile apps)
  async getQrJson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { url, base64 } = await workOrderService.getQrCode(
        req.user.tenant_id,
        req.params.id
      );
      res.json({ tracking_url: url, qr_base64: base64 });
    } catch (err) {
      next(err);
    }
  },
};
