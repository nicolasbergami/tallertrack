import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // Backend base URL — used for API links (approve/reject) sent via WhatsApp
  // Note: z.string().url() rejects localhost (no TLD), so we use min(1) here
  BASE_URL: z.string().min(1).default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("8h"),

  // Frontend base URL — used for tracking links sent via WhatsApp and QR codes
  TRACKING_BASE_URL: z.string().min(1).default("https://tallertrack.com.ar"),

  WHATSAPP_PROVIDER: z.enum(["mock", "meta", "twilio"]).default("mock"),
  WHATSAPP_API_URL: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_TEMPLATE_NAMESPACE: z.string().optional(),

  // Image storage — Cloudinary (logo uploads for Pro+ tenants)
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY:    z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),

  // AI features (Anthropic Claude)
  ANTHROPIC_API_KEY: z.string().optional().default(""),

  // AI features (OpenAI — Whisper transcription)
  OPENAI_API_KEY: z.string().optional().default(""),

  // Billing — Mercado Pago
  MP_ACCESS_TOKEN:   z.string().optional().default(""),
  MP_WEBHOOK_SECRET: z.string().optional().default(""),

  // Email — Resend (recuperación de contraseña, etc.)
  RESEND_API_KEY:    z.string().optional().default(""),
  RESEND_FROM_EMAIL: z.string().optional().default("TallerTrack <noreply@tallertrack.com.ar>"),

  // Seed on startup — si está en "true", ejecuta el seed al arrancar el servidor.
  // Útil en entornos efímeros (QA, staging). NUNCA activar en producción.
  SEED_ON_START: z.enum(["true", "false"]).optional(),

  // CORS — comma-separated list of allowed origins
  // e.g. "https://tallertrack.com.ar,https://tallertrack-app.vercel.app"
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:5173"),

  // Backoffice / SuperAdmin
  // SUPERADMIN_EMAILS: comma-separated emails that bypass DB flag check.
  //   e.g. SUPERADMIN_EMAILS="admin@tallertrack.com,dev@tallertrack.com"
  SUPERADMIN_EMAILS: z.string().optional().default(""),
  // ADMIN_DATABASE_URL: connection string for a BYPASSRLS role (tallertrack_migrator).
  //   Defaults to DATABASE_URL. Works in dev when using the postgres superuser.
  //   In production, set this to the tallertrack_migrator credentials.
  ADMIN_DATABASE_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
