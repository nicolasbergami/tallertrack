import { describe, it, expect } from "vitest";
import { agent } from "./helpers";

describe("Endpoints públicos", () => {
  describe("GET /health", () => {
    it("retorna 200 con status ok", async () => {
      const res = await agent.get("/health").expect(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.service).toBe("tallertrack-api");
    });
  });

  describe("GET /api/v1/billing/plans", () => {
    it("retorna 200 + lista de planes sin auth", async () => {
      const res = await agent.get("/api/v1/billing/plans").expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      // El endpoint devuelve { id (=slug), price (=price_ars) }
      const plan = res.body[0];
      expect(plan).toHaveProperty("id");
      expect(plan).toHaveProperty("price");
    });
  });

  describe("GET /api/v1/public/orders/:slug/:number (tracking público)", () => {
    it("retorna 404 para un número de orden inexistente", async () => {
      const res = await agent.get("/api/v1/public/orders/mi-taller/ORD-9999");
      expect(res.status).toBe(404);
    });

    it("retorna 404 para un tenant inexistente", async () => {
      const res = await agent.get("/api/v1/public/orders/taller-fantasma/ORD-0001");
      expect(res.status).toBe(404);
    });
  });

  describe("Rutas protegidas sin token", () => {
    it("GET /api/v1/work-orders retorna 401", async () => {
      await agent.get("/api/v1/work-orders").expect(401);
    });

    it("GET /api/v1/team retorna 401", async () => {
      await agent.get("/api/v1/team").expect(401);
    });

    it("GET /api/v1/tenant/settings retorna 401", async () => {
      await agent.get("/api/v1/tenant/settings").expect(401);
    });
  });
});
