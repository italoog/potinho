import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMercadoPagoWebhookSignature } from "./mercadopago";

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
