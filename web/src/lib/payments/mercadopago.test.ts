import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyMercadoPagoStatus,
  findMercadoPagoPaymentByOrderId,
  getMercadoPagoPayment,
  verifyMercadoPagoWebhookSignature,
} from "./mercadopago";

function sign(manifest: string, secret: string): string {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

describe("verifyMercadoPagoWebhookSignature", () => {
  const secret = "test-secret";
  const dataId = "123456789";
  const xRequestId = "req-abc";
  const ts = "1704908010";

  function validSignature(): string {
    const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
    return `ts=${ts},v1=${sign(manifest, secret)}`;
  }

  it("aceita assinatura válida", () => {
    const ok = verifyMercadoPagoWebhookSignature({
      xSignature: validSignature(),
      xRequestId,
      dataId,
      secret,
    });
    expect(ok).toBe(true);
  });

  it("rejeita quando o hash não bate (secret errado)", () => {
    const ok = verifyMercadoPagoWebhookSignature({
      xSignature: validSignature(),
      xRequestId,
      dataId,
      secret: "outro-secret",
    });
    expect(ok).toBe(false);
  });

  it("rejeita quando o data.id foi adulterado", () => {
    const ok = verifyMercadoPagoWebhookSignature({
      xSignature: validSignature(),
      xRequestId,
      dataId: "999999999",
      secret,
    });
    expect(ok).toBe(false);
  });

  it("rejeita header ausente ou malformado", () => {
    expect(verifyMercadoPagoWebhookSignature({ xSignature: null, xRequestId, dataId, secret })).toBe(false);
    expect(
      verifyMercadoPagoWebhookSignature({ xSignature: "ts=123", xRequestId, dataId, secret }),
    ).toBe(false);
  });

  it("data.id é comparado sem diferenciar maiúsculas/minúsculas", () => {
    const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
    const xSignature = `ts=${ts},v1=${sign(manifest, secret)}`;
    const ok = verifyMercadoPagoWebhookSignature({
      xSignature,
      xRequestId,
      dataId: dataId.toUpperCase(),
      secret,
    });
    expect(ok).toBe(true);
  });
});

describe("classifyMercadoPagoStatus", () => {
  it("classifica approved, rejected/cancelled e refunded/charged_back", () => {
    expect(classifyMercadoPagoStatus("approved")).toBe("approved");
    expect(classifyMercadoPagoStatus("rejected")).toBe("rejected");
    expect(classifyMercadoPagoStatus("cancelled")).toBe("rejected");
    expect(classifyMercadoPagoStatus("refunded")).toBe("refunded");
    expect(classifyMercadoPagoStatus("charged_back")).toBe("refunded");
    expect(classifyMercadoPagoStatus("in_process")).toBe("other");
  });
});

describe("getMercadoPagoPayment / findMercadoPagoPaymentByOrderId", () => {
  afterEach(() => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    vi.unstubAllGlobals();
  });

  it("busca o pagamento por id e devolve status + external_reference", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "test-token";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "approved", external_reference: "order-123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await getMercadoPagoPayment("mp-payment-1")).toEqual({
      status: "approved",
      externalReference: "order-123",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/v1/payments/mp-payment-1",
      expect.objectContaining({ headers: { Authorization: "Bearer test-token" } }),
    );
  });

  it("lança erro quando a API do MP responde com falha", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    await expect(getMercadoPagoPayment("inexistente")).rejects.toThrow(/Falha ao buscar pagamento/);
  });

  it("busca por external_reference e devolve o pagamento mais recente", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "test-token";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ id: 999, status: "approved" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await findMercadoPagoPaymentByOrderId("order-123")).toEqual({
      status: "approved",
      paymentId: "999",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("external_reference=order-123"),
      expect.anything(),
    );
  });

  it("devolve null quando não há pagamento pra esse pedido ainda", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [] }) }));

    expect(await findMercadoPagoPaymentByOrderId("order-sem-pagamento")).toBeNull();
  });
});
