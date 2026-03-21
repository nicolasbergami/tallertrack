import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool, withTenantContext } from "../../config/database";
import { env } from "../../config/env";
import { createHttpError } from "../../middleware/error.middleware";
import { LoginDTO, LoginResponse, AuthUser, AuthTenant } from "./auth.types";
import { JwtPayload } from "../../middleware/auth.middleware";

// ─── Generic error — never reveal whether email or password is wrong ───────
const INVALID_CREDENTIALS = createHttpError(401, "Email o contraseña incorrectos.");

export const authService = {
  async login(dto: LoginDTO): Promise<LoginResponse> {
    const email = dto.email.toLowerCase().trim();

    // 1. Buscar usuario por email globalmente (emails son únicos en toda la plataforma)
    const userResult = await pool.query<AuthUser & { tenant_id: string; is_system_admin: boolean }>(
      `SELECT u.id, u.email, u.full_name, u.role, u.status, u.password_hash, u.tenant_id,
              u.is_system_admin
         FROM users u
        WHERE u.email = $1
          AND u.deleted_at IS NULL
        LIMIT 1`,
      [email]
    );

    const user = userResult.rows[0] ?? null;

    // Usamos el mismo error genérico para no revelar si el email existe
    if (!user) throw INVALID_CREDENTIALS;

    // 2. Cargar el tenant asociado al usuario
    const tenantResult = await pool.query<AuthTenant>(
      `SELECT id, slug, name, plan, sub_status
         FROM tenants
        WHERE id = $1
          AND deleted_at IS NULL`,
      [user.tenant_id]
    );

    const tenant = tenantResult.rows[0];
    if (!tenant) throw INVALID_CREDENTIALS;

    // 3. Block suspended/cancelled subscriptions
    if (tenant.sub_status === "canceled") {
      throw createHttpError(403, "La suscripción de este taller está cancelada.");
    }

    // 4. Guard: inactive/suspended user
    if (user.status !== "active") {
      throw createHttpError(403, "Tu cuenta está inactiva. Contacta al administrador del taller.");
    }

    // 5. Verify password — bcrypt compare (timing-safe)
    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) throw INVALID_CREDENTIALS;

    // 6. Update last_login_at (fire-and-forget, never blocks login)
    pool.query(
      `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
      [user.id]
    ).catch(() => {});

    // 7. Sign JWT
    const payload: Omit<JwtPayload, "iat" | "exp"> = {
      sub:              user.id,
      tenant_id:        tenant.id,
      role:             user.role,
      email:            user.email,
      is_system_admin:  user.is_system_admin ?? false,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    return {
      token,
      expires_in: env.JWT_EXPIRES_IN,
      user: {
        id:               user.id,
        email:            user.email,
        full_name:        user.full_name,
        role:             user.role,
        tenant_id:        tenant.id,
        tenant_name:      tenant.name,
        tenant_slug:      tenant.slug,
        plan:             tenant.plan,
        sub_status:       tenant.sub_status,
        is_system_admin:  user.is_system_admin ?? false,
      },
    };
  },

  // ── GET /me — decode the already-validated JWT and return enriched profile ──
  async getProfile(userId: string, tenantId: string) {
    return withTenantContext(tenantId, async (client) => {
      const { rows } = await client.query(
        `SELECT
            u.id, u.email, u.full_name, u.role, u.status,
            u.phone, u.avatar_url, u.last_login_at, u.created_at,
            t.id   AS tenant_id,
            t.name AS tenant_name,
            t.slug AS tenant_slug,
            t.plan AS tenant_plan
          FROM users u
          JOIN tenants t ON t.id = u.tenant_id
         WHERE u.id = $1
           AND u.tenant_id = $2
           AND u.deleted_at IS NULL`,
        [userId, tenantId]
      );

      if (!rows[0]) throw createHttpError(404, "Usuario no encontrado.");
      return rows[0];
    });
  },
};
