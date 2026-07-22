import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const quoteShippingLabel = vi.fn();
vi.mock("@/lib/admin-orders", () => ({ quoteShippingLabel }));

const { POST } = await import("./route");

function req(body: unknown): Request {
  return new Request("http://localhost/api/admin/pedidos/order-1/etiqueta/cotar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(id = "order-1") {
  return { params: Promise.resolve({ id }) };
}

const validBody = {
  recipientDocument: "12345678901",
  service: "sedex",
  package: { widthCm: 20, heightCm: 15, lengthCm: 20, weightKg: 1.2 },
  declaredValueCents: 14900,
};

beforeEach(() => vi.clearAllMocks());

describe("POST /api/admin/pedidos/[id]/etiqueta/cotar", () => {
  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await POST(req(validBody), ctx());
    expect(res.status).toBe(404);
    expect(quoteShippingLabel).not.toHaveBeenCalled();
  });

  it("rejeita body inválido (400)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const res = await POST(req({ ...validBody, service: "pombo-correio" }), ctx());
    expect(res.status).toBe(400);
    expect(quoteShippingLabel).not.toHaveBeenCalled();
  });

  it("cota e devolve o preço", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    quoteShippingLabel.mockResolvedValue({ ok: true, priceCents: 2350 });
    const res = await POST(req(validBody), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ priceCents: 2350 });
    expect(quoteShippingLabel).toHaveBeenCalledWith("order-1", validBody);
  });

  it("repassa erro de domínio da cotação", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    quoteShippingLabel.mockResolvedValue({ ok: false, error: "CEP de destino inválido" });
    const res = await POST(req(validBody), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("CEP de destino inválido");
  });
});
