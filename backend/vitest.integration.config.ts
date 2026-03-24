import { defineConfig } from "vitest/config";

// Configuración para tests de INTEGRACIÓN (requieren PostgreSQL corriendo).
// Usa globalSetup para aplicar schema y seed antes de todos los tests.
export default defineConfig({
  test: {
    include: ["src/__tests__/integration/**/*.test.ts"],
    globalSetup: ["src/__tests__/integration/globalSetup.ts"],
    testTimeout: 15_000,
    hookTimeout: 30_000,
    pool: "forks",  // evita conflictos de DB entre workers
    poolOptions: {
      forks: { singleFork: true }, // un solo proceso — los tests de integración son secuenciales
    },
  },
});
