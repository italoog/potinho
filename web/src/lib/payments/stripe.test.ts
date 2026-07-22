import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("stripe", () => ({
  default: class StripeMock {
    checkout = { sessions: { create } };
  },
}));

const { createStripeSession } = await import("./stripe");

const INPUT = {
  orderId: "order-1",
  customerEmail: "cliente@example.com",
  shippingCents: 2000,
  items: [{ name: "Comedouro Pet", description: "size: 15cm", unitAmountCents: 14900, quantity: 1 }],
  successUrl: "https://potinho.pet/pedido/token?paid=1",
  cancelUrl: "https://potinho.pet/",
};

beforeEach(() => {
  create.mockReset();
  process.env.STRIPE_SECRET_KEY = "sk_test";
});

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY;
});

describe("createStripeSession", () => {
  it("lança erro quando não há STRIPE_SECRET_KEY", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    await expect(createStripeSession(INPUT)).rejects.toThrow(/STRIPE_SECRET_KEY não configurado/);
  });

  it("cria a sessão com os itens do carrinho + linha de frete", async () => {
    create.mockResolvedValue({ url: "https://checkout.stripe.com/session_1", id: "cs_123" });
    const result = await createStripeSession(INPUT);
    expect(result).toEqual({ redirectUrl: "https://checkout.stripe.com/session_1", providerPaymentId: "cs_123" });

    const call = create.mock.calls[0][0];
    expect(call.line_items).toHaveLength(2); // item + frete
    expect(call.line_items[1].price_data.product_data.name).toBe("Frete");
    expect(call.metadata).toEqual({ orderId: "order-1" });
  });

  it("omite a linha de frete quando shippingCents é 0", async () => {
    create.mockResolvedValue({ url: "https://checkout.stripe.com/session_2", id: "cs_456" });
    await createStripeSession({ ...INPUT, shippingCents: 0 });
    const call = create.mock.calls[0][0];
    expect(call.line_items).toHaveLength(1);
  });
});
