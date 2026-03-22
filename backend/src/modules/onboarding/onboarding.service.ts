import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/database";
import { env } from "../../config/env";
import { createHttpError } from "../../middleware/error.middleware";
import { whatsappService } from "../../integrations/whatsapp/whatsapp.service";
import {
  RegisterDTO, VerifyOtpDTO, ResendOtpDTO,
  PendingRegistration, RegisterResponse, VerifyResponse,
} from "./onboarding.types";
import { JwtPayload } from "../../middleware/auth.middleware";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const OTP_TTL_MINUTES   = 10;
const OTP_MAX_ATTEMPTS  = 5;
const OTP_MAX_RESENDS   = 3;
const OTP_RESEND_COOLDOWN_SEC = 60;
const TRIAL_DAYS = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normaliza CUIT: elimina guiones y espacios → "20-12345678-9" → "20123456789" */
function normalizeCuit(raw: string): string {
  return raw.replace(/[-\s]/g, "");
}

/** Valida CUIT/CUIL argentino con algoritmo de dígito verificador */
function isValidCuit(cuit: string): boolean {
  if (!/^\d{11}$/.test(cuit)) return false;
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = multipliers.reduce((acc, m, i) => acc + parseInt(cuit[i]) * m, 0);
  const remainder = sum % 11;
  const check = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;
  return check === parseInt(cuit[10]);
}

/** Normaliza teléfono a E.164. Asume Argentina (+54) si no hay prefijo de país. */
function normalizeWhatsApp(raw: string): string {
  let clean = raw.replace(/[\s\-\(\)\.]/g, "");
  if (!clean.startsWith("+")) {
    // Sin prefijo → asume Argentina
    // 011XXXXXXXX → +5411XXXXXXXX | 9XXXXXXXXX → +549XXXXXXXXX
    if (clean.startsWith("0")) clean = clean.slice(1);
    clean = "+54" + clean;
  }
  return clean;
}

/** Ofusca número: "+5491155556789" → "+549****6789" */
function maskPhone(phone: string): string {
  if (phone.length <= 7) return "****";
  return phone.slice(0, 4) + "****" + phone.slice(-4);
}

/** Genera código OTP de 6 dígitos */
function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

/** Hash del OTP: SHA-256(registrationId:otpCode) — rápido, time-limited */
function hashOtp(registrationId: string, otpCode: string): string {
  return crypto
    .createHash("sha256")
    .update(`${registrationId}:${otpCode}`)
    .digest("hex");
}

/** Genera slug URL-safe a partir del nombre del taller */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

/** Busca un slug único (agrega sufijo numérico si ya existe) */
async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let counter = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { rows } = await pool.query(
      "SELECT id FROM tenants WHERE slug = $1", [slug]
    );
    if (rows.length === 0) return slug;
    slug = `${base}-${counter++}`;
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
export const onboardingService = {

  // ── POST /onboarding/register ────────────────────────────────────────────
  async register(raw: RegisterDTO): Promise<RegisterResponse> {

    // 1. Normalizar y validar datos sensibles
    const cuit     = normalizeCuit(raw.cuit);
    const whatsapp = normalizeWhatsApp(raw.whatsapp);

    if (!isValidCuit(cuit)) {
      throw createHttpError(422, "CUIT/CUIL inválido. Verifica el número ingresado.");
    }
    if (!/^\+\d{10,15}$/.test(whatsapp)) {
      throw createHttpError(422, "Número de WhatsApp inválido. Usa el formato: +5491112345678");
    }

    // 2. Verificar que CUIT/WhatsApp no estén en uso
    const { rows: existingTenants } = await pool.query(
      `SELECT id FROM tenants WHERE tax_id = $1 OR phone = $2 LIMIT 1`,
      [cuit, whatsapp]
    );
    if (existingTenants.length > 0) {
      throw createHttpError(409, "El CUIT/CUIL o el número de WhatsApp ya están registrados en otra cuenta.");
    }

    // 3. Verificar email duplicado
    const email = raw.email.toLowerCase().trim();
    const { rows: existingUsers } = await pool.query(
      `SELECT u.id FROM users u
         JOIN tenants t ON t.id = u.tenant_id
        WHERE u.email = $1 AND t.deleted_at IS NULL AND u.deleted_at IS NULL
        LIMIT 1`,
      [email]
    );
    if (existingUsers.length > 0) {
      throw createHttpError(409, "Ya existe una cuenta con ese email.");
    }

    // 4. Crear tenant + usuario propietario en una transacción
    const passwordHash = await bcrypt.hash(raw.password, 12);
    const slug         = await uniqueSlug(slugify(raw.workshop_name.trim()));

    const client = await pool.connect();
    let tenantId = "";
    let userId   = "";

    try {
      await client.query("BEGIN");

      const { rows: [tenant] } = await client.query<{ id: string }>(
        `INSERT INTO tenants
           (slug, name, tax_id, phone, country, plan, sub_status,
            trial_ends_at, max_users, max_vehicles, settings)
         VALUES ($1, $2, $3, $4, 'AR', 'free', 'trialing',
                 NOW() + INTERVAL '${TRIAL_DAYS} days',
                 5, 1000,
                 '{"timezone":"America/Argentina/Buenos_Aires","currency":"ARS"}')
         RETURNING id`,
        [slug, raw.workshop_name.trim(), cuit, whatsapp]
      );
      tenantId = tenant.id;

      // SET LOCAL para que el INSERT en users pase el RLS del tenant recién creado
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);

      const { rows: [user] } = await client.query<{ id: string }>(
        `INSERT INTO users (tenant_id, email, password_hash, full_name, role, status)
         VALUES ($1, $2, $3, $4, 'owner', 'active')
         RETURNING id`,
        [tenantId, email, passwordHash, raw.workshop_name.trim()]
      );
      userId = user.id;

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // 5. Emitir JWT → auto-login inmediato
    const payload: Omit<JwtPayload, "iat" | "exp"> = {
      sub:       userId,
      tenant_id: tenantId,
      role:      "owner",
      email,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });

    return {
      token,
      expires_in: env.JWT_EXPIRES_IN,
      user: {
        id:          userId,
        email,
        full_name:   raw.workshop_name.trim(),
        role:        "owner",
        tenant_id:   tenantId,
        tenant_name: raw.workshop_name.trim(),
        tenant_slug: slug,
      },
    };
  },

  // ── POST /onboarding/verify ──────────────────────────────────────────────
  async verify(dto: VerifyOtpDTO): Promise<VerifyResponse> {

    // 1. Buscar registro pendiente
    const { rows } = await pool.query<PendingRegistration>(
      `SELECT * FROM tenant_registrations WHERE id = $1 LIMIT 1`,
      [dto.registration_id]
    );
    const reg = rows[0];

    if (!reg) throw createHttpError(404, "Registro no encontrado.");
    if (reg.status === "verified") throw createHttpError(409, "Este registro ya fue verificado.");
    if (reg.status === "expired" || new Date(reg.otp_expires_at) < new Date()) {
      await pool.query(
        `UPDATE tenant_registrations SET status = 'expired' WHERE id = $1`,
        [reg.id]
      );
      throw createHttpError(410, "El código expiró. Inicia el registro nuevamente.");
    }
    if (reg.otp_attempts >= OTP_MAX_ATTEMPTS) {
      throw createHttpError(429, "Demasiados intentos fallidos. Solicita un nuevo código.");
    }

    // 2. Verificar OTP
    const expectedHash = hashOtp(reg.id, dto.otp_code.trim());
    if (expectedHash !== reg.otp_hash) {
      await pool.query(
        `UPDATE tenant_registrations SET otp_attempts = otp_attempts + 1 WHERE id = $1`,
        [reg.id]
      );
      const remaining = OTP_MAX_ATTEMPTS - reg.otp_attempts - 1;
      throw createHttpError(422,
        `Código incorrecto. ${remaining > 0 ? `Te quedan ${remaining} intentos.` : "Sin intentos restantes."}`
      );
    }

    // 3. Crear tenant + usuario en una transacción
    const client = await pool.connect();
    let tenantId = "";
    let tenantSlug = "";
    let userId = "";

    try {
      await client.query("BEGIN");

      const slug = await uniqueSlug(slugify(reg.workshop_name));
      tenantSlug = slug;

      const { rows: [tenant] } = await client.query<{ id: string; slug: string }>(
        `INSERT INTO tenants
           (slug, name, tax_id, phone, country, plan, sub_status,
            trial_ends_at, max_users, max_vehicles, settings)
         VALUES ($1, $2, $3, $4, 'AR', 'free', 'trialing',
                 NOW() + INTERVAL '${TRIAL_DAYS} days',
                 5, 1000,
                 '{"timezone":"America/Argentina/Buenos_Aires","currency":"ARS"}')
         RETURNING id, slug`,
        [slug, reg.workshop_name, reg.cuit, reg.whatsapp]
      );
      tenantId = tenant.id;

      // SET LOCAL para que los INSERT en users pasen el RLS del tenant
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);

      const { rows: [user] } = await client.query<{ id: string }>(
        `INSERT INTO users (tenant_id, email, password_hash, full_name, role, status)
         VALUES ($1, $2, $3, $4, 'owner', 'active')
         RETURNING id`,
        [tenantId, reg.email, reg.password_hash, reg.workshop_name]
      );
      userId = user.id;

      // Marcar registro como verificado
      await client.query(
        `UPDATE tenant_registrations
            SET status = 'verified', tenant_id = $1, otp_attempts = otp_attempts + 1
          WHERE id = $2`,
        [tenantId, reg.id]
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // 4. Emitir JWT (auto-login)
    const payload: Omit<JwtPayload, "iat" | "exp"> = {
      sub:       userId,
      tenant_id: tenantId,
      role:      "owner",
      email:     reg.email,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });

    return {
      token,
      expires_in: env.JWT_EXPIRES_IN,
      user: {
        id:          userId,
        email:       reg.email,
        full_name:   reg.workshop_name,
        role:        "owner",
        tenant_id:   tenantId,
        tenant_name: reg.workshop_name,
        tenant_slug: tenantSlug,
      },
    };
  },

  // ── POST /onboarding/resend-otp ──────────────────────────────────────────
  async resendOtp(dto: ResendOtpDTO): Promise<{ whatsapp_hint: string; expires_in_min: number }> {

    const { rows } = await pool.query<PendingRegistration>(
      `SELECT * FROM tenant_registrations WHERE id = $1 LIMIT 1`,
      [dto.registration_id]
    );
    const reg = rows[0];

    if (!reg)                    throw createHttpError(404, "Registro no encontrado.");
    if (reg.status !== "pending") throw createHttpError(409, "Este registro ya no está pendiente.");
    if (reg.resend_count >= OTP_MAX_RESENDS) {
      throw createHttpError(429, "Límite de reenvíos alcanzado. Inicia el registro nuevamente.");
    }

    // Cooldown entre reenvíos
    if (reg.last_resend_at) {
      const secondsSince = (Date.now() - new Date(reg.last_resend_at).getTime()) / 1000;
      if (secondsSince < OTP_RESEND_COOLDOWN_SEC) {
        const wait = Math.ceil(OTP_RESEND_COOLDOWN_SEC - secondsSince);
        throw createHttpError(429, `Espera ${wait} segundos antes de solicitar otro código.`);
      }
    }

    const otp     = generateOtp();
    const otpHash = hashOtp(reg.id, otp);

    await pool.query(
      `UPDATE tenant_registrations
          SET otp_hash       = $1,
              otp_expires_at = NOW() + INTERVAL '${OTP_TTL_MINUTES} minutes',
              otp_attempts   = 0,
              resend_count   = resend_count + 1,
              last_resend_at = NOW()
        WHERE id = $2`,
      [otpHash, reg.id]
    );

    whatsappService.sendMessage({
      to:   reg.whatsapp,
      body: `🔐 *TallerTrack* — Nuevo código de verificación:\n\n*${otp}*\n\nVálido por ${OTP_TTL_MINUTES} minutos.`,
    }).catch(() => {});

    return {
      whatsapp_hint:  maskPhone(reg.whatsapp),
      expires_in_min: OTP_TTL_MINUTES,
    };
  },
};
