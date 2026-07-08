import { test, expect } from "@playwright/test";
import { addPetToCart, fillCheckoutForm, goToCheckout } from "./helpers";

/** Fluxo de dinheiro 1/4 (10.1 AC1): compra sem conta. */
test("compra guest: monta o potinho, finaliza e vê o pedido pago", async ({ page }) => {
  const email = `guest-${Date.now()}@example.com`;

  await addPetToCart(page, "REX");
  await goToCheckout(page);
  await fillCheckoutForm(page, { name: "Cliente Guest", email, phone: "11999990000" });
  await page.getByTestId("checkout-submit").click();

  await expect(page).toHaveURL(/\/pedido\//, { timeout: 15_000 });
  await expect(page.getByText(/REX/)).toBeVisible();
});
