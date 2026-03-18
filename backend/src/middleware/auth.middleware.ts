import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
  sub: string;        // user UUID
  tenant_id: string;  // tenant UUID — injected into RLS session variable
  role: string;
  email: string;
  iat: number;
  exp: number;
}

// Extend Express Request to carry the decoded token
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token de autenticación requerido." });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado." });
  }
}

/**
 * Role-based authorization middleware factory.
 * Usage: authorize("owner", "admin")
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los roles: ${allowedRoles.join(", ")}.`,
      });
      return;
    }
    next();
  };
}
