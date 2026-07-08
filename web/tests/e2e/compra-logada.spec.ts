import { test, expect } from "@playwright/test";
import { addPetToCart, fillCheckoutForm, goToCheckout, loginViaMagicLink } from "./helpers";

/** Fluxo de dinheiro 2/4 (10.1 AC1): compra logada — o pedido nasce vinculado à conta (7.1 seção 4). */
test("compra logada: pedido aparece em /conta assim que criado", async ({ page }) => {
  const email = `logada-${Date.now()}@example.com`;

  await loginViaMagicLink(page, email);
  await expect(page).toHaveURL(/\/conta/);

  await addPetToCart(page, "MEL");
  await goToCheckout(page);
  await fillCheckoutForm(page, { name: "Cliente Logado", email, phone: "11999990000" });
  await page.getByTestId("checkout-submit").click();
  await expect(page).toHaveURL(/\/pedido\//, { timeout: 15_000 });

  await page.goto("/conta");
  await expect(page.getByText("MEL")).toBeVisible();
});
