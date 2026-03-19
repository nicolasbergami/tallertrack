import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { onboardingController } from "./onboarding.controller";

const router = Router();

// Rate limiting estricto para onboarding (anti-spam / anti-bot)
const onboardingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,                   // 10 intentos por IP por hora
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos de registro. Espera 1 hora antes de reintentar." },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,                   // 20 intentos por IP (cubre varios OTP incorrectos)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos de verificación. Espera 15 minutos." },
});

router.post("/register",   onboardingLimiter, onboardingController.register);
router.post("/verify",     verifyLimiter,     onboardingController.verify);
router.post("/resend-otp", verifyLimiter,     onboardingController.resendOtp);

export default router;
