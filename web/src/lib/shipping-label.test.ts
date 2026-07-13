import { afterEach, describe, expect, it, vi } from "vitest";
import { checkoutOrder, createCartOrder } from "./shipping-label";

const ORIGIN_ENV = {
  SUPERFRETE_TOKEN: "test-token",
  STORE_ORIGIN_CEP: "63660-000",
  STORE_ORIGIN_NAME: "potinho",
  STORE_ORIGIN_ADDRESS: "Rua Teste",
  STORE_ORIGIN_DISTRICT: "Centro",
  STORE_ORIGIN_CITY: "Tauá",
  STORE_ORIGIN_STATE: "CE",
};

function setOriginEnv(overrides: Partial<typeof ORIGIN_ENV> = {}) {
  for (const [k, v] of Object.entries({ ...ORIGIN_ENV, ...overrides })) process.env[k] = v;
}

const SHIPMENT_INPUT = {
  to: {
    name: "Cliente Teste",
    document: "12345678900",
    address: { street: "Av Paulista", number: "1000", neighborhood: "Bela Vista", city: "São Paulo", state: "SP", zip: "01310-100" },
  },
  service: 1 as const,
  productName: "Comedouro pet personalizado",
  productValueCents: 14900,
  packageDimensions: { widthCm: 20, heightCm: 18, lengthCm: 20, weightKg: 0.8 },
};

describe("createCartOrder", () => {
  afterEach(() => {
    for (const k of Object.keys(ORIGIN_ENV)) delete process.env[k];
    vi.unstubAllGlobals();
  });

  it("recusa quando falta um campo obrigatório do remetente", async () => {
    setOriginEnv({ STORE_ORIGIN_NAME: undefined as unknown as string });
    delete process.env.STORE_ORIGIN_NAME;
    await expect(createCartOrder(SHIPMENT_INPUT)).rejects.toThrow(/STORE_ORIGIN_NAME/);
  });

  it("converte o preço (reais, float) pra centavos (inteiro) sem perder precisão", async () => {
    setOriginEnv();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "ORDER123", price: 33.9, status: "pending" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createCartOrder(SHIPMENT_INPUT);
    expect(result).toEqual({ superfreteOrderId: "ORDER123", priceCents: 3390 });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/v0/cart"), expect.objectContaining({ method: "POST" }));
  });

  it("propaga a mensagem de erro da SuperFrete quando a resposta não é ok", async () => {
    setOriginEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ message: "CEP inválido" }) }),
    );
    await expect(createCartOrder(SHIPMENT_INPUT)).rejects.toThrow(/CEP inválido/);
  });
});

describe("checkoutOrder", () => {
  afterEach(() => {
    delete process.env.SUPERFRETE_TOKEN;
    vi.unstubAllGlobals();
  });

  it("extrai o rastreio e converte o preço cobrado pra centavos", async () => {
    process.env.SUPERFRETE_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        purchase: {
          status: "paid",
          orders: [{ id: "ORDER123", price: 33.33, discount: 1.11, service_id: 1, tracking: "DG048745602BR", print: { url: "x" } }],
        },
      }),
    }));

    const result = await checkoutOrder("ORDER123");
    expect(result).toEqual({ trackingCode: "DG048745602BR", priceCents: 3333 });
  });
});
