import bcrypt from "bcrypt";
import { pool, withTenantContext } from "../../config/database";
import { createHttpError } from "../../middleware/error.middleware";
import {
  CreateMemberDTO,
  UpdateMemberDTO,
  TeamListResponse,
  TeamMember,
} from "./team.types";

export const teamService = {

  // ── GET /team ─────────────────────────────────────────────────────────────
  async list(tenantId: string): Promise<TeamListResponse> {
    return withTenantContext(tenantId, async (client) => {
      // Traer todos los usuarios activos/inactivos (sin soft-deleted)
      const { rows: members } = await client.query<TeamMember>(
        `SELECT id, full_name, email, role, status, last_login_at, created_at
           FROM users
          WHERE tenant_id = $1
            AND deleted_at IS NULL
          ORDER BY
            CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
            full_name ASC`,
        [tenantId]
      );

      // Límite del tenant
      const { rows: [tenant] } = await client.query<{ max_users: number }>(
        `SELECT max_users FROM tenants WHERE id = $1`,
        [tenantId]
      );

      const maxUsers = tenant?.max_users ?? 1;
      // El owner no cuenta contra el límite de mecánicos
      const nonOwnerCount = members.filter((m) => m.role !== "owner").length;

      return {
        members,
        total:     members.length,
        max_users: maxUsers,
        can_add:   nonOwnerCount < maxUsers,
      };
    });
  },

  // ── POST /team ────────────────────────────────────────────────────────────
  async create(tenantId: string, dto: CreateMemberDTO): Promise<TeamMember> {
    return withTenantContext(tenantId, async (client) => {
      // 1. Verificar que no se supere el límite
      const { rows: [counts] } = await client.query<{
        non_owner_count: string;
        max_users: string;
      }>(
        `SELECT
            (SELECT COUNT(*) FROM users
              WHERE tenant_id = $1 AND role != 'owner' AND deleted_at IS NULL) AS non_owner_count,
            (SELECT max_users FROM tenants WHERE id = $1) AS max_users`,
        [tenantId]
      );

      if (parseInt(counts.non_owner_count) >= parseInt(counts.max_users)) {
        throw createHttpError(
          403,
          `Límite de mecánicos alcanzado (${counts.max_users}). Actualizá tu plan para agregar más.`
        );
      }

      // 2. Verificar email único globalmente (login es por email sin tenant_slug)
      const { rows: existing } = await client.query(
        `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL`,
        [dto.email.toLowerCase().trim()]
      );
      if (existing.length > 0) {
        throw createHttpError(409, "Ya existe un usuario con ese email en la plataforma.");
      }

      // 3. Crear usuario
      const passwordHash = await bcrypt.hash(dto.password, 12);

      const { rows: [member] } = await client.query<TeamMember>(
        `INSERT INTO users (tenant_id, email, password_hash, full_name, role, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         RETURNING id, full_name, email, role, status, last_login_at, created_at`,
        [tenantId, dto.email.toLowerCase().trim(), passwordHash, dto.full_name.trim(), dto.role]
      );

      return member;
    });
  },

  // ── PATCH /team/:id ───────────────────────────────────────────────────────
  async update(
    tenantId:     string,
    memberId:     string,
    requesterId:  string,
    dto:          UpdateMemberDTO,
  ): Promise<TeamMember> {
    return withTenantContext(tenantId, async (client) => {
      // Buscar al usuario target
      const { rows: [target] } = await client.query<{ role: string }>(
        `SELECT role FROM users WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [memberId, tenantId]
      );

      if (!target) throw createHttpError(404, "Usuario no encontrado.");

      // No se puede modificar al owner
      if (target.role === "owner") {
        throw createHttpError(403, "No se puede modificar al propietario del taller.");
      }

      // Construir update dinámico
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (dto.full_name !== undefined) { fields.push(`full_name = $${idx++}`); values.push(dto.full_name.trim()); }
      if (dto.role      !== undefined) { fields.push(`role = $${idx++}`);      values.push(dto.role); }
      if (dto.status    !== undefined) { fields.push(`status = $${idx++}`);    values.push(dto.status); }

      if (fields.length === 0) throw createHttpError(400, "No hay cambios para guardar.");

      fields.push(`updated_at = NOW()`);
      values.push(memberId, tenantId);

      const { rows: [member] } = await client.query<TeamMember>(
        `UPDATE users SET ${fields.join(", ")}
          WHERE id = $${idx++} AND tenant_id = $${idx++}
          RETURNING id, full_name, email, role, status, last_login_at, created_at`,
        values
      );

      return member;
    });
  },

  // ── DELETE /team/:id ──────────────────────────────────────────────────────
  async remove(tenantId: string, memberId: string, requesterId: string): Promise<void> {
    return withTenantContext(tenantId, async (client) => {
      if (memberId === requesterId) {
        throw createHttpError(403, "No podés eliminar tu propia cuenta.");
      }

      const { rows: [target] } = await client.query<{ role: string }>(
        `SELECT role FROM users WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [memberId, tenantId]
      );

      if (!target) throw createHttpError(404, "Usuario no encontrado.");
      if (target.role === "owner") {
        throw createHttpError(403, "No se puede eliminar al propietario del taller.");
      }

      await client.query(
        `UPDATE users SET deleted_at = NOW(), status = 'inactive' WHERE id = $1 AND tenant_id = $2`,
        [memberId, tenantId]
      );
    });
  },
};
