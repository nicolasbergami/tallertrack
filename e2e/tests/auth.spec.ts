import { test, expect } from "@playwright/test";

const EMAIL    = process.env.E2E_EMAIL    ?? "admin@tallertrack.com";
const PASSWORD = process.env.E2E_PASSWORD ?? "TallerTrack2024!";

test.describe("Autenticación", () => {
  test("login exitoso redirige al dashboard", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("textbox", { name: /email/i }).fill(EMAIL);
    await page.getByRole("textbox", { name: /contraseña|password/i }).fill(PASSWORD);
    await page.getByRole("button", { name: /ingresar|iniciar|entrar/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test("credenciales incorrectas muestran error y no redirigen", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("textbox", { name: /email/i }).fill(EMAIL);
    await page.getByRole("textbox", { name: /contraseña|password/i }).fill("wrong-password");
    await page.getByRole("button", { name: /ingresar|iniciar|entrar/i }).click();

    // Debe permanecer en /login
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
    // Debe mostrar algún mensaje de error en pantalla
    await expect(page.locator("body")).toContainText(/inválid|incorrect|error/i);
  });

  test("usuario autenticado que va a / es redirigido al dashboard", async ({ page }) => {
    // Login primero
    await page.goto("/login");
    await page.getByRole("textbox", { name: /email/i }).fill(EMAIL);
    await page.getByRole("textbox", { name: /contraseña|password/i }).fill(PASSWORD);
    await page.getByRole("button", { name: /ingresar|iniciar|entrar/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Ir a raíz
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5_000 });
  });
});
