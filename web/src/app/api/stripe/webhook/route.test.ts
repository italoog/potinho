import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Webhook Stripe (P-04): redundância desativada por padrão, mas quando PAYMENT_PROVIDER=stripe
 * é o único caminho de confirmação de pagamento — precisa da mesma garantia do MP (assinatura + idempotência).
 */

const markOrderPaid = vi.fn();
vi.mock("@/lib/orders", () => ({ markOrderPaid }));

const constructEventAsync = vi.fn();
vi.mock("stripe", () => ({
  default: class StripeMock {
    webhooks = { constructEventAsync };
  },
}));

const { POST } = await import("./route");

function req(body: string, signature = "valid-sig"): Request {
  const headers: Record<string, string> = {};
  if (signature) headers["stripe-signature"] = signature;
  return new Request("http://localhost/api/stripe/webhook", { method: "POST", headers, body });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  process.env.STRIPE_SECRET_KEY = "sk_test";
});

describe("POST /api/stripe/webhook", () => {
  it("responde 501 quando o Stripe não está configurado", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await POST(req("{}"));
    expect(res.status).toBe(501);
  });

  it("responde 400 quando falta o header de assinatura", async () => {
    const res = await POST(req("{}", ""));
    expect(res.status).toBe(400);
  });

  it("responde 400 quando a assinatura é inválida", async () => {
    constructEventAsync.mockRejectedValue(new Error("invalid signature"));
    const res = await POST(req("{}"));
    expect(res.status).toBe(400);
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("marca o pedido como pago em checkout.session.completed", async () => {
    constructEventAsync.mockResolvedValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_123", metadata: { orderId: "order-1" } } },
    });
    const res = await POST(req("{}"));
    expect(res.status).toBe(200);
    expect(markOrderPaid).toHaveBeenCalledWith("order-1", "cs_123");
  });

  it("ignora o evento quando não há orderId no metadata", async () => {
    constructEventAsync.mockResolvedValue({
      type: "checkout.session.completed",
      data: { object: { id: "cs_456", metadata: {} } },
    });
    await POST(req("{}"));
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("ignora eventos de outros tipos", async () => {
    constructEventAsync.mockResolvedValue({ type: "payment_intent.created", data: { object: {} } });
    const res = await POST(req("{}"));
    expect(res.status).toBe(200);
    expect(markOrderPaid).not.toHaveBeenCalled();
  });
});
