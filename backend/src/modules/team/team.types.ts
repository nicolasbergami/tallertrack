import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas de validación
// ---------------------------------------------------------------------------

export const createMemberSchema = z.object({
  full_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email:     z.string().email("Email inválido"),
  password:  z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role:      z.enum(["mechanic", "receptionist", "admin"]),
});

export const updateMemberSchema = z.object({
  full_name: z.string().min(2).optional(),
  role:      z.enum(["mechanic", "receptionist", "admin"]).optional(),
  status:    z.enum(["active", "inactive"]).optional(),
});

export type CreateMemberDTO = z.infer<typeof createMemberSchema>;
export type UpdateMemberDTO = z.infer<typeof updateMemberSchema>;

// ---------------------------------------------------------------------------
// Tipos de respuesta
// ---------------------------------------------------------------------------

export interface TeamMember {
  id:            string;
  full_name:     string;
  email:         string;
  role:          string;
  status:        string;
  last_login_at: string | null;
  created_at:    string;
}

export interface TeamListResponse {
  members:   TeamMember[];
  total:     number;
  max_users: number;
  can_add:   boolean;
}
