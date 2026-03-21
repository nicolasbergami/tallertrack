import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  BASE_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("8h"),

  TRACKING_BASE_URL: z.string().url().default("https://tallertrack-production.up.railway.app"),

  WHATSAPP_PROVIDER: z.enum(["mock", "meta", "twilio"]).default("mock"),
  WHATSAPP_API_URL: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_TEMPLATE_NAMESPACE: z.string().optional(),

  // AI features (Anthropic Claude)
  ANTHROPIC_API_KEY: z.string().optional().default(""),

  // AI features (OpenAI — Whisper transcription)
  OPENAI_API_KEY: z.string().optional().default(""),

  // Billing — Mercado Pago
  MP_ACCESS_TOKEN:   z.string().optional().default(""),
  MP_WEBHOOK_SECRET: z.string().optional().default(""),

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
