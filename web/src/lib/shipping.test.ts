import { afterEach, describe, expect, it, vi } from "vitest";
import { isFreeShippingEligible, shippingCentsFor } from "./shipping";

const PACKAGE = [{ widthCm: 20, heightCm: 18, lengthCm: 20, weightKg: 0.8 }];

describe("isFreeShippingEligible", () => {
  it("libera a partir de 2 itens no carrinho (freeShipping.minQuantity)", () => {
    expect(isFreeShippingEligible(1)).toBe(false);
    expect(isFreeShippingEligible(2)).toBe(true);
    expect(isFreeShippingEligible(3)).toBe(true);
  });
});

describe("shippingCentsFor (sem SuperFrete configurado, cai na tabela fixa)", () => {
  it("usa o valor padrão quando a UF não está na tabela", async () => {
    expect(await shippingCentsFor("01234-567", "SP", [])).toBe(2000);
  });

  it("respeita SHIPPING_TABLE_JSON quando definida", async () => {
    process.env.SHIPPING_TABLE_JSON = '{"SP":1500,"*":2500}';
    expect(await shippingCentsFor("01234-567", "SP", [])).toBe(1500);
    expect(await shippingCentsFor("01234-567", "RJ", [])).toBe(2500);
    delete process.env.SHIPPING_TABLE_JSON;
  });
});

describe("shippingCentsFor (SuperFrete configurado, 8.1 AC1-AC4)", () => {
  afterEach(() => {
    delete process.env.SUPERFRETE_TOKEN;
    delete process.env.STORE_ORIGIN_CEP;
    delete process.env.SUPERFRETE_SANDBOX;
    vi.unstubAllGlobals();
  });

  it("usa a cotação mais barata entre os serviços retornados sem erro", async () => {
    process.env.SUPERFRETE_TOKEN = "test-token";
    process.env.STORE_ORIGIN_CEP = "01310-100";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { price: "32.90" },
        { price: "18.50" },
        { price: "50.00", error: "serviço indisponível" },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await shippingCentsFor("20040-020", "RJ", PACKAGE)).toBe(1850);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v0/calculator"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("cai na tabela fixa quando a API responde com erro HTTP", async () => {
    process.env.SUPERFRETE_TOKEN = "test-token";
    process.env.STORE_ORIGIN_CEP = "01310-100";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    expect(await shippingCentsFor("20040-020", "RJ", PACKAGE)).toBe(2000);
  });

  it("cai na tabela fixa quando a chamada estoura o timeout", async () => {
    process.env.SUPERFRETE_TOKEN = "test-token";
    process.env.STORE_ORIGIN_CEP = "01310-100";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("The operation was aborted", "TimeoutError")),
    );

    expect(await shippingCentsFor("20040-020", "RJ", PACKAGE)).toBe(2000);
  });

  it("usa o endpoint sandbox quando SUPERFRETE_SANDBOX=true", async () => {
    process.env.SUPERFRETE_TOKEN = "test-token";
    process.env.STORE_ORIGIN_CEP = "01310-100";
    process.env.SUPERFRETE_SANDBOX = "true";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ price: "10.00" }] });
    vi.stubGlobal("fetch", fetchMock);

    await shippingCentsFor("20040-020", "RJ", PACKAGE);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("sandbox.superfrete.com"),
      expect.anything(),
    );
  });
});
