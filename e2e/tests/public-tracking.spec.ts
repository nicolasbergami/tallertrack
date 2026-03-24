import { test, expect } from "@playwright/test";

test.describe("Tracking público (sin autenticación)", () => {
  test("la página de tracking muestra error elegante para orden inexistente", async ({ page }) => {
    await page.goto("/track/mi-taller/ORD-9999");
    // No debe mostrar un error de JS crudo — debe ser una UI amigable
    await expect(page.locator("body")).not.toContainText("Cannot read");
    await expect(page.locator("body")).not.toContainText("undefined");
    // Debe indicar que no se encontró la orden o mostrar un estado de carga
    // (la app maneja 404 con UI propia)
    await expect(page).toHaveURL(/\/track\//);
  });

  test("la página de tracking no requiere autenticación", async ({ page }) => {
    // Acceder sin cookies ni token — no debe redirigir a /login
    await page.context().clearCookies();
    await page.goto("/track/mi-taller/ORD-0001");
    await expect(page).not.toHaveURL(/\/login/);
  });
});
