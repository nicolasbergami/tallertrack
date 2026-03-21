import { z } from "zod";

export const loginSchema = z.object({
  email:    z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export type LoginDTO = z.infer<typeof loginSchema>;

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  password_hash: string;
  tenant_id: string;
}

export interface AuthTenant {
  id: string;
  slug: string;
  name: string;
  plan: string;
  sub_status: string;
}

export interface LoginResponse {
  token: string;
  expires_in: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    tenant_id: string;
    tenant_name: string;
    tenant_slug: string;
    plan: string;
    sub_status: string;
    is_system_admin: boolean;
  };
}
