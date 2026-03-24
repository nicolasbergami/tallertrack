/**
 * Helpers compartidos para tests de integración.
 * Exporta el agente supertest y utilidades de autenticación.
 */

import request from "supertest";
import app from "../../app";

export const agent = request(app);

export const TEST_CREDENTIALS = {
  email: "admin@tallertrack.com",
  password: "TallerTrack2024!",
};

/** Realiza login y retorna el JWT. Cachea el token entre llamadas del mismo proceso. */
let _cachedToken: string | null = null;

export async function getAuthToken(): Promise<string> {
  if (_cachedToken) return _cachedToken;

  const res = await agent
    .post("/api/v1/auth/login")
    .send(TEST_CREDENTIALS)
    .expect(200);

  _cachedToken = res.body.token as string;
  return _cachedToken;
}

export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
