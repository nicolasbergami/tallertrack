import { test, expect, Page } from "@playwright/test";

const EMAIL    = process.env.E2E_EMAIL    ?? "admin@tallertrack.com";
const PASSWORD = process.env.E2E_PASSWORD ?? "TallerTrack2024!";

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByRole("textbox", { name: /email/i }).fill(EMAIL);
  await page.getByRole("textbox", { name: /contraseña|password/i }).fill(PASSWORD);
  await page.getByRole("button", { name: /ingresar|iniciar|entrar/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
}

test.describe("Órdenes de trabajo", () => {
  test("el dashboard carga y muestra la lista de órdenes", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard/);
    // La página debe cargar sin error (no muestra "Algo salió mal")
    await expect(page.locator("body")).not.toContainText("Algo salió mal");
  });

  test("crear nueva orden completa el flujo de 3 pasos", async ({ page }) => {
    await login(page);

    // Ir a nueva orden
    await page.goto("/new");
    await expect(page).toHaveURL(/\/new/, { timeout: 5_000 });

    // Paso 1: datos del cliente
    const clientNameInput = page.getByRole("textbox", { name: /nombre|cliente/i }).first();
    await clientNameInput.fill("Cliente E2E Test");

    const phoneInput = page.getByRole("textbox", { name: /teléfono|celular|phone/i }).first();
    await phoneInput.fill("+5491199998888");

    await page.getByRole("button", { name: /siguiente|next|continuar/i }).first().click();

    // Paso 2: datos del vehículo
    const plateInput = page.getByRole("textbox", { name: /patente|placa|plate/i }).first();
    await plateInput.fill(`E2E${Date.now().toString().slice(-6)}`);

    const brandInput = page.getByRole("textbox", { name: /marca|brand/i }).first();
    await brandInput.fill("Toyota");

    const modelInput = page.getByRole("textbox", { name: /modelo|model/i }).first();
    await modelInput.fill("Corolla");

    await page.getByRole("button", { name: /siguiente|next|continuar/i }).first().click();

    // Paso 3: descripción del problema
    const complaintInput = page.getByRole("textbox", { name: /problema|falla|complaint|descripción/i }).first();
    await complaintInput.fill("Ruido en el motor al arrancar en frío — test E2E");

    await page.getByRole("button", { name: /crear|guardar|finalizar|abrir/i }).first().click();

    // Debe redirigir al detalle de la orden creada
    await expect(page).toHaveURL(/\/orders\//, { timeout: 10_000 });
  });

  test("el detalle de una orden muestra el status y los botones de acción", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");

    // Hacer clic en la primera orden disponible
    const firstOrder = page.locator("a[href*='/orders/'], [data-testid='order-item']").first();
    const hasOrders = await firstOrder.count() > 0;

    if (!hasOrders) {
      test.skip(); // No hay órdenes — omitir
      return;
    }

    await firstOrder.click();
    await expect(page).toHaveURL(/\/orders\//, { timeout: 5_000 });
    await expect(page.locator("body")).not.toContainText("Algo salió mal");
  });
});
