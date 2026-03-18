import { Request, Response, NextFunction } from "express";
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
};
