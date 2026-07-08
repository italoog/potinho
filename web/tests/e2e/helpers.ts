import { expect, type Page } from "@playwright/test";

/** Monta um potinho na home e adiciona ao carrinho (customizer real, sem mock). */
export async function addPetToCart(page: Page, petName: string) {
  await page.goto("/#produto");
  await page.getByPlaceholder("ex.: paçoca").fill(petName);
  await page.getByTestId("add-to-cart").click();
}

/** Vai pro /checkout público — addItem já abre a gaveta do carrinho sozinho. */
export async function goToCheckout(page: Page) {
  await page.getByTestId("go-to-checkout").click();
  await expect(page).toHaveURL(/\/checkout/);
}

interface CheckoutCustomer {
  name: string;
  email: string;
  phone: string;
}

/** Preenche o form de checkout público (endereço fixo — não depende do ViaCEP responder). */
export async function fillCheckoutForm(page: Page, customer: CheckoutCustomer) {
  await page.getByPlaceholder("nome completo").fill(customer.name);
  await page.getByPlaceholder("e-mail").fill(customer.email);
  await page.getByPlaceholder("telefone / whatsapp").fill(customer.phone);
  await page.getByTestId("checkout-cep").fill("01310-100");
  await page.getByPlaceholder("rua").fill("Avenida Paulista");
  await page.getByPlaceholder("número").fill("1000");
  await page.getByPlaceholder("bairro").fill("Bela Vista");
  await page.getByPlaceholder("cidade").fill("São Paulo");
  await page.locator("select").selectOption("SP");
  await page.locator('input[type="checkbox"]').check();
}

/** Login por magic link sem e-mail real: pega o token direto do banco via rota de teste (10.1b, nunca em produção). */
export async function loginViaMagicLink(page: Page, email: string) {
  await page.goto("/conta");
  await page.getByTestId("conta-email").fill(email);
  await page.getByTestId("conta-entrar").click();
  await expect(page.getByText("link enviado")).toBeVisible();

  const res = await page.request.get(`/api/test/last-verification?email=${encodeURIComponent(email)}`);
  expect(res.ok()).toBe(true);
  const { token } = await res.json();
  await page.goto(`/api/auth/magic-link/verify?token=${token}&callbackURL=%2Fconta`);
}
