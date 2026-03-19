import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { aiService } from "./ai.service";

const extractQuoteSchema = z.object({
  transcript: z.string().min(5, "La transcripción es demasiado corta"),
  complaint:  z.string().default("Sin detalle"),
});

const predictDeliverySchema = z.object({
  complaint:     z.string().min(3),
  vehicle_brand: z.string().default(""),
  vehicle_model: z.string().default(""),
});

export const aiController = {

  async extractQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const body  = extractQuoteSchema.parse(req.body);
      const draft = await aiService.extractQuoteFromTranscript(body.transcript, body.complaint);
      res.json(draft);
    } catch (err) {
      next(err);
    }
  },

  async predictDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const raw  = predictDeliverySchema.parse(req.body);
      const body = {
        complaint:     raw.complaint     as string,
        vehicle_brand: raw.vehicle_brand as string,
        vehicle_model: raw.vehicle_model as string,
      };
      const prediction = await aiService.predictDelivery(req.user!.tenant_id, body);
      res.json(prediction);
    } catch (err) {
      next(err);
    }
  },
};
