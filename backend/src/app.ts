import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { errorHandler } from "./middleware/error.middleware";
import authRoutes       from "./modules/auth/auth.routes";
import workOrderRoutes from "./modules/work-orders/work-order.routes";

const app = express();

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
app.use("/api/v1/work-orders", workOrderRoutes);

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada." });
});

// ---------------------------------------------------------------------------
// Global error handler (must be last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

export default app;
