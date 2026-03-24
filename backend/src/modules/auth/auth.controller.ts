import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authService } from "./auth.service";
import { loginSchema } from "./auth.types";

export const authController = {
  // POST /api/v1/auth/login
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = loginSchema.parse(req.body);
      const result = await authService.login(dto);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/auth/me  (requires authenticate middleware)
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await authService.getProfile(req.user.sub, req.user.tenant_id);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/forgot-password
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      await authService.forgotPassword(email);
      // Siempre 200 — no revelar si el email existe o no
      res.json({ message: "Si el email está registrado, recibirás un enlace para restablecer tu contraseña." });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/reset-password
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = z.object({
        token:    z.string().min(64).max(64),
        password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
      }).parse(req.body);
      await authService.resetPassword(token, password);
      res.json({ message: "Contraseña actualizada correctamente. Ya podés iniciar sesión." });
    } catch (err) {
      next(err);
    }
  },
};
