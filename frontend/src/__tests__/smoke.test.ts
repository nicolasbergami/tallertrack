import { describe, it, expect } from "vitest";

// Test de humo: valida que el entorno de testing compila y ejecuta correctamente.
// No requiere DOM ni dependencias externas.

describe("Frontend — smoke", () => {
  it("el entorno de test funciona", () => {
    expect(1 + 1).toBe(2);
  });

  it("los arrays tienen el método includes", () => {
    const estados = ["received", "diagnosing", "in_progress", "delivered"];
    expect(estados).toContain("delivered");
    expect(estados).not.toContain("unknown_state");
  });

  it("las funciones flecha se comportan correctamente", () => {
    const formatearPatente = (p: string) => p.toUpperCase().trim();
    expect(formatearPatente("  abc123  ")).toBe("ABC123");
  });
});
