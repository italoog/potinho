import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Webhook Mercado Pago (P-04, dinheiro real): assinatura, roteamento de status e rate limit.
 * markOrderPaid/Rejected/Refunded já têm cobertura própria em orders.test.ts — aqui mockados
 * pra isolar só a lógica da rota (S1: nunca processar sem assinatura válida).
 */

const markOrderPaid = vi.fn();
const markOrderRejected = vi.fn();
const markOrderRefunded = vi.fn();
vi.mock("@/lib/orders", () => ({ markOrderPaid, markOrderRejected, markOrderRefunded }));

const getMercadoPagoPayment = vi.fn();
vi.mock("@/lib/payments/mercadopago", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments/mercadopago")>();
  return { ...actual, getMercadoPagoPayment };
});

const { POST } = await import("./route");

const SECRET = "test-webhook-secret";
const TOKEN = "test-access-token";

function sign(dataId: string, xRequestId: string, ts: string, secret = SECRET): string {
  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const hash = createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${hash}`;
}

function req(
  paymentId: string | null,
  opts: { signed?: boolean; ip?: string; topic?: string; badSignature?: boolean; body?: unknown } = {},
): Request {
  const { signed = true, ip = `10.0.0.${Math.floor(Math.random() * 250) + 1}`, topic = "payment", badSignature = false, body } = opts;
  const xRequestId = "req-1";
  const ts = "1700000000";
  const headers: Record<string, string> = { "x-forwarded-for": ip, "Content-Type": "application/json" };

  if (signed && paymentId) {
    headers["x-signature"] = badSignature ? sign(paymentId, xRequestId, ts, "wrong-secret") : sign(paymentId, xRequestId, ts);
    headers["x-request-id"] = xRequestId;
  }

  const url = paymentId
    ? `http://localhost/api/mercadopago/webhook?type=${topic}&data.id=${paymentId}`
    : `http://localhost/api/mercadopago/webhook`;

  return new Request(url, { method: "POST", headers, body: JSON.stringify(body ?? {}) });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MERCADOPAGO_ACCESS_TOKEN = TOKEN;
  process.env.MERCADOPAGO_WEBHOOK_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  delete process.env.NODE_ENV;
  vi.stubEnv("NODE_ENV", "test");
});

describe("POST /api/mercadopago/webhook", () => {
  it("rejeita com 501 quando o gateway não está configurado", async () => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    const res = await POST(req("pay-1"));
    expect(res.status).toBe(501);
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("rejeita com 401 quando a assinatura é inválida (S1)", async () => {
    const res = await POST(req("pay-1", { badSignature: true }));
    expect(res.status).toBe(401);
    expect(getMercadoPagoPayment).not.toHaveBeenCalled();
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("rejeita com 401 quando não há secret configurado em produção", async () => {
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
    vi.stubEnv("NODE_ENV", "production");
    const res = await POST(req("pay-1", { signed: false }));
    expect(res.status).toBe(401);
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("marca o pedido como pago quando o pagamento é aprovado", async () => {
    getMercadoPagoPayment.mockResolvedValue({ status: "approved", externalReference: "order-1" });
    const res = await POST(req("pay-1"));
    expect(res.status).toBe(200);
    expect(markOrderPaid).toHaveBeenCalledWith("order-1", "pay-1");
  });

  it("marca o pedido como rejeitado quando o pagamento é recusado/cancelado", async () => {
    getMercadoPagoPayment.mockResolvedValue({ status: "rejected", externalReference: "order-2" });
    await POST(req("pay-2"));
    expect(markOrderRejected).toHaveBeenCalledWith("order-2", "pay-2", "rejected");
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("marca o pedido como estornado em refund/chargeback", async () => {
    getMercadoPagoPayment.mockResolvedValue({ status: "charged_back", externalReference: "order-3" });
    await POST(req("pay-3"));
    expect(markOrderRefunded).toHaveBeenCalledWith("order-3", "pay-3", "charged_back");
  });

  it("ignora tópicos que não são pagamento (ex.: merchant_order)", async () => {
    const res = await POST(req("mo-1", { topic: "merchant_order" }));
    expect(res.status).toBe(200);
    expect(getMercadoPagoPayment).not.toHaveBeenCalled();
  });

  it("responde 200 sem processar quando não há payment id", async () => {
    const res = await POST(req(null, { signed: false }));
    expect(res.status).toBe(200);
    expect(getMercadoPagoPayment).not.toHaveBeenCalled();
  });

  it("não derruba o webhook quando a consulta ao MP falha (500 controlado)", async () => {
    getMercadoPagoPayment.mockRejectedValue(new Error("timeout"));
    const res = await POST(req("pay-4"));
    expect(res.status).toBe(500);
  });

  it("aplica rate limit por IP (60 req / 5 min)", async () => {
    const ip = "203.0.113.9";
    getMercadoPagoPayment.mockResolvedValue({ status: "approved", externalReference: "order-x" });
    let last = new Response();
    for (let i = 0; i < 61; i++) {
      last = await POST(req(`pay-rl-${i}`, { ip }));
    }
    expect(last.status).toBe(429);
  });
});
