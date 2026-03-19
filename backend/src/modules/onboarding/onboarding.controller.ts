import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { onboardingService } from "./onboarding.service";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------
const registerSchema = z.object({
  workshop_name: z.string().min(2, "Nombre del taller requerido (mín. 2 caracteres)"),
  email:         z.string().email("Email inválido"),
  password:      z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  whatsapp:      z.string().min(8, "Número de WhatsApp requerido"),
  cuit:          z.string().min(10, "CUIT/CUIL requerido"),
});

const verifySchema = z.object({
  registration_id: z.string().uuid("ID de registro inválido"),
  otp_code:        z.string().length(6, "El código debe tener 6 dígitos").regex(/^\d+$/, "Solo dígitos"),
});

const resendSchema = z.object({
  registration_id: z.string().uuid("ID de registro inválido"),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------
export const onboardingController = {

  // POST /onboarding/register
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto    = registerSchema.parse(req.body);
      const result = await onboardingService.register(dto);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  // POST /onboarding/verify
  async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto    = verifySchema.parse(req.body);
      const result = await onboardingService.verify(dto);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // POST /onboarding/resend-otp
  async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto    = resendSchema.parse(req.body);
      const result = await onboardingService.resendOtp(dto);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
