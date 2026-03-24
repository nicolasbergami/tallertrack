import { defineConfig, devices } from "@playwright/test";

// URL del entorno QA desplegado en Vercel. Configurar en GitHub Secrets como PLAYWRIGHT_BASE_URL.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://tallertrack-qa.vercel.app";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 1, // 1 reintento en CI para absorber flakiness de red
  workers: 1, // secuencial — evita condiciones de carrera en la DB de QA

  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Los formularios están en español — no cambiar idioma
    locale: "es-AR",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
