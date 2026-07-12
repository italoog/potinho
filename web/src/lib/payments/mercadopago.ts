import { createHmac, timingSafeEqual } from "node:crypto";
import type { CreatePaymentSessionInput, PaymentSession } from "./types";

/**
 * Gateway principal (não é mais Stripe). REST direto — a API do Mercado Pago
 * é HTTP simples o bastante pra não justificar o SDK oficial como dependência.
 */

function token(): string {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!t) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
  return t;
}

export async function createMercadoPagoSession(
  input: CreatePaymentSessionInput,
): Promise<PaymentSession> {
  const items = input.items.map((item) => ({
    title: item.name,
    description: item.description,
    quantity: item.quantity,
    currency_id: "BRL",
    unit_price: item.unitAmountCents / 100,
  }));
  if (input.shippingCents > 0) {
    items.push({
      title: "Frete",
      description: undefined,
      quantity: 1,
      currency_id: "BRL",
      unit_price: input.shippingCents / 100,
    });
  }

  const appUrl = new URL(input.successUrl).origin;
  const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items,
      payer: { email: input.customerEmail },
      external_reference: input.orderId,
      back_urls: { success: input.successUrl, pending: input.successUrl, failure: input.cancelUrl },
      auto_return: "approved",
      notification_url: `${appUrl}/api/mercadopago/webhook`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`Mercado Pago recusou a preferência (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string; init_point: string };
  return { redirectUrl: data.init_point, providerPaymentId: data.id };
}

/** Webhook só manda o id do pagamento — os detalhes (status, pedido) vêm daqui. */
export async function getMercadoPagoPayment(
  paymentId: string,
): Promise<{ status: string; externalReference: string | null }> {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token()}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Falha ao buscar pagamento ${paymentId} (${res.status})`);
  const data = (await res.json()) as { status: string; external_reference: string | null };
  return { status: data.status, externalReference: data.external_reference };
}

/**
 * Busca o pagamento mais recente pelo external_reference (= orderId) — usado pra reconciliar
 * manualmente um pedido "pending" sem depender do webhook ter chegado. Diferente de
 * getMercadoPagoPayment: aqui não se tem o payment id ainda (o providerPaymentId salvo no
 * checkout é o id da PREFERÊNCIA, não do pagamento), então a busca é pelo pedido.
 * ponytail: formato da resposta de /v1/payments/search inferido da doc pública — revalidar
 * contra o sandbox real antes de operar, no mesmo espírito do aviso já existente no HMAC.
 */
export async function findMercadoPagoPaymentByOrderId(
  orderId: string,
): Promise<{ status: string; paymentId: string } | null> {
  const url = `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&external_reference=${encodeURIComponent(orderId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token()}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Falha ao buscar pagamentos do pedido ${orderId} (${res.status})`);
  const data = (await res.json()) as { results?: { id: number; status: string }[] };
  const [latest] = data.results ?? [];
  return latest ? { status: latest.status, paymentId: String(latest.id) } : null;
}

/** Classifica o status bruto do Mercado Pago no desfecho que o pedido precisa (P-04/6.2 AC2). */
export type MercadoPagoOutcome = "approved" | "rejected" | "refunded" | "other";

export function classifyMercadoPagoStatus(status: string): MercadoPagoOutcome {
  if (status === "approved") return "approved";
  if (status === "rejected" || status === "cancelled") return "rejected";
  if (status === "refunded" || status === "charged_back") return "refunded";
  return "other";
}

/**
 * Valida o x-signature do webhook (6.2, S1) — manifest `id:{data.id};request-id:{x-request-id};ts:{ts};`
 * assinado com HMAC-SHA256 e o secret do painel do MP. Formato confirmado via múltiplas fontes da
 * comunidade/SDK oficial (a doc pública atual só documenta o `WebhookSignatureValidator` do SDK,
 * que não usamos aqui por ser API REST simples — R2: revalidar com o simulador de webhook do painel).
 */
export function verifyMercadoPagoWebhookSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = params;
  if (!xSignature || !dataId) return false;

  const parts: Record<string, string> = {};
  for (const pair of xSignature.split(",")) {
    const [key, value] = pair.split("=");
    if (key && value) parts[key.trim()] = value.trim();
  }
  const { ts, v1: hash } = parts;
  if (!ts || !hash) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId ?? ""};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const hashBuf = Buffer.from(hash, "hex");
  const lengthMatches = expectedBuf.length === hashBuf.length;
  const valid = lengthMatches && timingSafeEqual(expectedBuf, hashBuf);
  if (!valid) {
    console.error("Webhook Mercado Pago: debug assinatura", { manifest, expected, received: hash });
  }
  return valid;
}
