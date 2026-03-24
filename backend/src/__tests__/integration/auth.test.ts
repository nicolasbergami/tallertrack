import { describe, it, expect } from "vitest";
import { agent, TEST_CREDENTIALS, getAuthToken } from "./helpers";

describe("Auth endpoints", () => {
  describe("POST /api/v1/auth/login", () => {
    it("retorna 200 + JWT con credenciales correctas", async () => {
      const res = await agent
        .post("/api/v1/auth/login")
        .send(TEST_CREDENTIALS)
        .expect(200);

      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("user");
      expect(res.body.user.email).toBe(TEST_CREDENTIALS.email);
      expect(res.body.user.role).toBe("owner");
    });

    it("retorna 401 con contraseña incorrecta", async () => {
      const res = await agent
        .post("/api/v1/auth/login")
        .send({ email: TEST_CREDENTIALS.email, password: "wrongpassword" });

      expect(res.status).toBe(401);
    });

    it("retorna 400 con email inválido", async () => {
      const res = await agent
        .post("/api/v1/auth/login")
        .send({ email: "not-an-email", password: "anything" });

      expect(res.status).toBe(400);
    });

    it("retorna 401 con email inexistente", async () => {
      const res = await agent
        .post("/api/v1/auth/login")
        .send({ email: "noexiste@test.com", password: "TallerTrack2024!" });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("retorna 200 + datos del usuario con token válido", async () => {
      const token = await getAuthToken();
      const res = await agent
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.email).toBe(TEST_CREDENTIALS.email);
      expect(res.body.role).toBe("owner");
      expect(res.body).not.toHaveProperty("password_hash");
    });

    it("retorna 401 sin token", async () => {
      await agent.get("/api/v1/auth/me").expect(401);
    });

    it("retorna 401 con token malformado", async () => {
      await agent
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer token-invalido")
        .expect(401);
    });
  });
});
