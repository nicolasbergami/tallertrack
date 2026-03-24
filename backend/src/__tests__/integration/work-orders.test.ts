import { describe, it, expect, beforeAll } from "vitest";
import { agent, getAuthToken } from "./helpers";

const NEW_ORDER_BODY = {
  complaint: "El motor hace ruido al arrancar",
  vehicle_data: {
    license_plate: `T${Date.now().toString().slice(-7)}`, // máx 10 chars
    brand: "Ford",
    model: "Focus",
    year: 2019,
  },
  client_data: {
    full_name: "Cliente Test CI",
    phone: "+5491112345678",
  },
};

describe("Work Orders endpoints", () => {
  let token: string;
  let createdOrderId: string;

  beforeAll(async () => {
    token = await getAuthToken();
  });

  describe("GET /api/v1/work-orders", () => {
    it("retorna 200 + array con token válido", async () => {
      const res = await agent
        .get("/api/v1/work-orders")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      // list retorna { data: WorkOrder[], total: number }
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(typeof res.body.total).toBe("number");
    });

    it("retorna 401 sin token", async () => {
      await agent.get("/api/v1/work-orders").expect(401);
    });
  });

  describe("POST /api/v1/work-orders", () => {
    it("crea una orden y retorna 201 con status=received", async () => {
      const res = await agent
        .post("/api/v1/work-orders")
        .set("Authorization", `Bearer ${token}`)
        .send(NEW_ORDER_BODY)
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.status).toBe("received");
      expect(res.body.complaint).toBe(NEW_ORDER_BODY.complaint);

      createdOrderId = res.body.id;
    });

    it("retorna 400 si falta el campo complaint", async () => {
      const res = await agent
        .post("/api/v1/work-orders")
        .set("Authorization", `Bearer ${token}`)
        .send({ vehicle_data: NEW_ORDER_BODY.vehicle_data });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/work-orders/:id", () => {
    it("retorna 200 + detalle de la orden creada", async () => {
      const res = await agent
        .get(`/api/v1/work-orders/${createdOrderId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.id).toBe(createdOrderId);
      expect(res.body.status).toBe("received");
    });

    it("retorna 404 para un ID inexistente", async () => {
      await agent
        .get("/api/v1/work-orders/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });
  });

  describe("GET /api/v1/work-orders/:id/transitions", () => {
    it("retorna los estados válidos siguientes desde received", async () => {
      const res = await agent
        .get(`/api/v1/work-orders/${createdOrderId}/transitions`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      // retorna { current: string, available: string[] }
      expect(res.body.current).toBe("received");
      expect(res.body.available).toContain("diagnosing");
      expect(res.body.available).toContain("cancelled");
    });
  });

  describe("PATCH /api/v1/work-orders/:id/transition", () => {
    it("avanza de received → diagnosing correctamente", async () => {
      const res = await agent
        .patch(`/api/v1/work-orders/${createdOrderId}/transition`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "diagnosing" })
        .expect(200);

      expect(res.body.status).toBe("diagnosing");
    });

    it("rechaza una transición inválida (diagnosing → delivered)", async () => {
      const res = await agent
        .patch(`/api/v1/work-orders/${createdOrderId}/transition`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "delivered" });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
