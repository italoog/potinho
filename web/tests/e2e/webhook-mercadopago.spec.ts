import { test, expect } from "@playwright/test";

/**
 * Fluxo de dinheiro 4/4 (10.1 AC1): webhook do Mercado Pago com payload de teste.
 *
 * Este ambiente de e2e não tem credenciais reais do MP (o servidor compartilhado
 * roda sem MERCADOPAGO_ACCESS_TOKEN pra permitir ALLOW_DEV_CHECKOUT nos outros 3
 * fluxos — os dois não podem coexistir no mesmo processo, e rodar um segundo
 * `next dev` só pra isso colidiria no mesmo arquivo do PGlite). Por isso, o que
 * dá pra verificar de ponta a ponta contra o servidor real é o comportamento
 * seguro quando o gateway não está configurado: nunca processa nada, nunca
 * vaza detalhe interno. A lógica que realmente importa validar — construção
 * do HMAC, assinatura inválida/adulterada rejeitada, idempotência de
 * markOrderPaid/Rejected/Refunded — já tem cobertura unitária dedicada e
 * determinística em src/lib/payments/mercadopago.test.ts e src/lib/orders.test.ts.
 */
test("webhook do Mercado Pago não processa nada quando o gateway não está configurado", async ({ request }) => {
  const res = await request.post("/api/mercadopago/webhook?data.id=123456789&type=payment", {
    headers: { "x-signature": "ts=1,v1=0000000000000000000000000000000000000000000000000000000000000000" },
    data: {},
  });

  expect(res.status()).toBe(501);
  const body = await res.json();
  expect(body.error).toBeTruthy();
});
