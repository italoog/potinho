import { test, expect } from "@playwright/test";
import { loginViaMagicLink } from "./helpers";

/**
 * Fluxo de dinheiro 3/4 (10.1 AC1): pedido manual criado pelo admin.
 * ADMIN_EMAILS=admin@potinho.com.br (playwright.config.ts) promove essa conta a admin no login.
 */
test("admin cria pedido manual pago e o pedido nasce vinculado quando o cliente cria conta depois", async ({
  page,
}) => {
  const customerEmail = `manual-${Date.now()}@example.com`;

  await loginViaMagicLink(page, "admin@potinho.com.br");
  await page.goto("/admin/pedidos/novo");

  await page.getByPlaceholder("nome do pet").fill("BOB");
  await page.getByPlaceholder("nome completo").fill("Cliente Manual");
  await page.getByPlaceholder("e-mail").fill(customerEmail);
  await page.getByPlaceholder("telefone").fill("11999990000");
  await page.getByPlaceholder("cep").fill("01310-100");
  await page.getByPlaceholder("rua").fill("Avenida Paulista");
  await page.getByPlaceholder("número").fill("1000");
  await page.getByPlaceholder("bairro").fill("Bela Vista");
  await page.getByPlaceholder("cidade").fill("São Paulo");
  await page.locator("select").last().selectOption("SP"); // último select da tela é a UF

  await page.getByRole("button", { name: "marcar como pago" }).click();
  await expect(page.getByText("pedido criado")).toBeVisible();

  // AC5: aparece em /admin/pedidos
  await page.goto("/admin/pedidos");
  await expect(page.getByText("BOB")).toBeVisible();
  await expect(page.getByText(customerEmail)).toBeVisible();

  // AC4: se o cliente cria conta depois com o mesmo e-mail, o pedido guest é retroativamente vinculado (backfill 7.1)
  await page.goto("/conta");
  await page.getByTestId("conta-sair").click();
  await expect(page).toHaveURL("http://localhost:3000/");

  await loginViaMagicLink(page, customerEmail);
  await expect(page.getByText("BOB")).toBeVisible();
});
