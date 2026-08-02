import { afterEach, describe, expect, it, vi } from "vitest";

const createStripeSession = vi.fn();
vi.mock("./stripe", () => ({ createStripeSession }));

const createMercadoPagoSession = vi.fn();
vi.mock("./mercadopago", () => ({ createMercadoPagoSession }));

const { activeProvider, providerConfigured, createPaymentSession } = await import("./index");

const INPUT = {
  orderId: "order-1",
  customerEmail: "cliente@example.com",
  shippingCents: 2000,
  items: [{ name: "Comedouro Pet", description: "size: 15cm", unitAmountCents: 14900, quantity: 1 }],
  successUrl: "https://potinho.pet/pedido/token?paid=1",
  cancelUrl: "https://potinho.pet/",
};

afterEach(() => {
  delete process.env.PAYMENT_PROVIDER;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  vi.clearAllMocks();
});

describe("activeProvider", () => {
  it("mercadopago é o gateway padrão", () => {
    expect(activeProvider()).toBe("mercadopago");
  });

  it("PAYMENT_PROVIDER=stripe ativa a redundância", () => {
    process.env.PAYMENT_PROVIDER = "stripe";
    expect(activeProvider()).toBe("stripe");
  });
});

describe("providerConfigured", () => {
  it("stripe: depende de STRIPE_SECRET_KEY", () => {
    expect(providerConfigured("stripe")).toBe(false);
    process.env.STRIPE_SECRET_KEY = "sk_test";
    expect(providerConfigured("stripe")).toBe(true);
  });

  it("mercadopago: depende de MERCADOPAGO_ACCESS_TOKEN", () => {
    expect(providerConfigured("mercadopago")).toBe(false);
    process.env.MERCADOPAGO_ACCESS_TOKEN = "test-token";
    expect(providerConfigured("mercadopago")).toBe(true);
  });
});

describe("createPaymentSession", () => {
  it("delega pro Mercado Pago por padrão e anexa o provider no retorno", async () => {
    createMercadoPagoSession.mockResolvedValue({ providerPaymentId: "mp-1", redirectUrl: "https://mp/1" });
    const session = await createPaymentSession(INPUT);
    expect(createMercadoPagoSession).toHaveBeenCalledWith(INPUT);
    expect(createStripeSession).not.toHaveBeenCalled();
    expect(session).toEqual({ providerPaymentId: "mp-1", redirectUrl: "https://mp/1", provider: "mercadopago" });
  });

  it("delega pro Stripe quando PAYMENT_PROVIDER=stripe", async () => {
    process.env.PAYMENT_PROVIDER = "stripe";
    createStripeSession.mockResolvedValue({ providerPaymentId: "cs_1", redirectUrl: "https://stripe/1" });
    const session = await createPaymentSession(INPUT);
    expect(createStripeSession).toHaveBeenCalledWith(INPUT);
    expect(createMercadoPagoSession).not.toHaveBeenCalled();
    expect(session.provider).toBe("stripe");
  });
});
