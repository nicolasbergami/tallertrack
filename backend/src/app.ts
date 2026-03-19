import express from "express";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { rateLimit } from "express-rate-limit";
import { errorHandler } from "./middleware/error.middleware";
import { authenticate } from "./middleware/auth.middleware";
import { requireActiveSubscription } from "./middleware/subscription.middleware";
import authRoutes       from "./modules/auth/auth.routes";
import workOrderRoutes  from "./modules/work-orders/work-order.routes";
import publicRoutes     from "./modules/public/public.routes";
import aiRoutes         from "./modules/ai/ai.routes";
import onboardingRoutes from "./modules/onboarding/onboarding.routes";
import whatsappRoutes   from "./modules/whatsapp/whatsapp.routes";
import vehicleRoutes    from "./modules/vehicles/vehicle.routes";
import billingRoutes    from "./modules/billing/billing.routes";
import { sessionManager } from "./integrations/whatsapp-direct/session-manager";
import { env } from "./config/env";

const app = express();

// Trust Railway / Render / Heroku reverse proxy (needed for rate-limit + req.ip)
app.set("trust proxy", 1);

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
app.use(helmet());

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Rate limiting (per IP — adjust per tier in production)
// ---------------------------------------------------------------------------
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Demasiadas solicitudes. Por favor espera antes de reintentar." },
  })
);

// ---------------------------------------------------------------------------
// Health check (no auth required — used by load balancers)
// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "tallertrack-api", timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use("/api/v1/auth",        authRoutes);
app.use("/api/v1/public",      publicRoutes);       // public — tracking
app.use("/api/v1/onboarding",  onboardingRoutes);   // public — registration
app.use("/api/v1/billing",     billingRoutes);       // mixed — webhook public, rest protected

// Subscription-gated routes (blocked after trial/paid period expires)
app.use("/api/v1/work-orders", authenticate, requireActiveSubscription, workOrderRoutes);
app.use("/api/v1/ai",          authenticate, requireActiveSubscription, aiRoutes);

app.use("/api/v1/vehicles",    authenticate, vehicleRoutes);   // protected — JWT required
app.use("/api/v1/whatsapp",    whatsappRoutes);     // protected — JWT required

// Restore previously-connected WhatsApp sessions after DB is ready
sessionManager.restoreAll().catch((err) =>
  console.error("[WhatsApp] Failed to restore sessions:", err)
);

// ---------------------------------------------------------------------------
// Serve frontend static files in production
// In development, Vite dev server handles the frontend separately.
// ---------------------------------------------------------------------------
if (env.NODE_ENV === "production") {
  // backend/dist/ → ../../frontend/dist/ in the monorepo layout
  const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
  const indexHtml    = path.join(frontendDist, "index.html");

  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));

    // SPA fallback — serve index.html for any non-API route
    app.get("*", (_req, res) => {
      res.sendFile(indexHtml);
    });
  }
} else {
  // ---------------------------------------------------------------------------
  // 404 handler (dev only — in prod the SPA catch-all handles unknown routes)
  // ---------------------------------------------------------------------------
  app.use((_req, res) => {
    res.status(404).json({ error: "Ruta no encontrada." });
  });
}

// ---------------------------------------------------------------------------
// Global error handler (must be last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

export default app;
