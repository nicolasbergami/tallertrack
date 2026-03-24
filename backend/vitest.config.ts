import { defineConfig } from "vitest/config";

// Configuración para tests UNITARIOS (sin DB real).
// Excluye la carpeta integration/ que requiere PostgreSQL.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["src/__tests__/integration/**"],
  },
});
