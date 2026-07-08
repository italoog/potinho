import { NextResponse } from "next/server";
import { getMercadoPagoPayment, verifyMercadoPagoWebhookSignature } from "@/lib/payments/mercadopago";
import { markOrderPaid, markOrderRefunded, markOrderRejected } from "@/lib/orders";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * Webhook Mercado Pago (P-04, gateway principal): notificação só traz o id do pagamento —
 * os detalhes (status, external_reference = orderId) vêm de uma consulta à API do MP.
 * 6.2 (S1): assinatura x-signature validada antes de qualquer processamento.
 * Idempotência garantida em markOrderPaid/markOrderRejected/markOrderRefunded.
 */

const REJECTED_STATUSES = new Set(["rejected", "cancelled"]);
const REFUNDED_STATUSES = new Set(["refunded", "charged_back"]);

export async function POST(request: Request) {
  const limit = rateLimit(`mp-webhook:${clientIp(request)}`, 60, 5 * 60_000);
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSeconds);

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Mercado Pago não configurado" }, { status: 501 });
  }

  const url = new URL(request.url);
  const topic = url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = url.searchParams.get("data.id");
  let paymentId = dataId ?? url.searchParams.get("id");

  if (!paymentId) {
    const body = (await request.json().catch(() => null)) as { data?: { id?: string } } | null;
    paymentId = body?.data?.id ?? null;
  }

  // outros tópicos (merchant_order, etc.) não interessam a este fluxo
  if (!paymentId || (topic && topic !== "payment")) {
    return NextResponse.json({ received: true });
  }

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secret) {
    const valid = verifyMercadoPagoWebhookSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId: dataId ?? paymentId,
      secret,
    });
    if (!valid) {
      console.error("Webhook Mercado Pago: assinatura inválida", { paymentId });
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // S1: sem secret configurado em produção não há como validar — recusa por segurança.
    console.error("Webhook Mercado Pago: MERCADOPAGO_WEBHOOK_SECRET ausente em produção");
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 401 });
  }

  try {
    const payment = await getMercadoPagoPayment(paymentId);
    if (!payment.externalReference) return NextResponse.json({ received: true });

    if (payment.status === "approved") {
      await markOrderPaid(payment.externalReference, paymentId);
    } else if (REJECTED_STATUSES.has(payment.status)) {
      await markOrderRejected(payment.externalReference, paymentId, payment.status);
    } else if (REFUNDED_STATUSES.has(payment.status)) {
      await markOrderRefunded(payment.externalReference, paymentId, payment.status);
    }
  } catch (err) {
    console.error("Webhook Mercado Pago falhou:", err);
    return NextResponse.json({ error: "Falha ao processar" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
