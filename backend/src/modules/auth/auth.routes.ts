import { Router } from "express";
import { authController } from "./auth.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { rateLimit } from "express-rate-limit";

const router = Router();

// Strict rate-limit on login to slow brute-force attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos de login. Intenta en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate-limit on forgot-password to prevent email flooding
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Demasiadas solicitudes. Esperá 15 minutos antes de reintentar." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route  POST /api/v1/auth/login
 * @desc   Authenticate with email + password + tenant_slug → JWT
 * @access Public
 * @body   { email, password, tenant_slug }
 */
router.post("/login", loginLimiter, authController.login);

/**
 * @route  GET /api/v1/auth/me
 * @desc   Return the authenticated user's full profile
 * @access Private (JWT required)
 */
router.get("/me", authenticate, authController.me);

/**
 * @route  POST /api/v1/auth/forgot-password
 * @desc   Envía email con link de recuperación (siempre responde 200)
 * @access Public
 * @body   { email }
 */
router.post("/forgot-password", forgotPasswordLimiter, authController.forgotPassword);

/**
 * @route  POST /api/v1/auth/reset-password
 * @desc   Valida token y actualiza contraseña
 * @access Public
 * @body   { token, password }
 */
router.post("/reset-password", authController.resetPassword);

export default router;
