import { beforeEach, describe, expect, it, vi } from "vitest";

/** Compra de etiqueta (gasta saldo real SuperFrete) — precisa de admin e repassar erros do domínio. */

const requireAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const purchaseShippingLabel = vi.fn();
vi.mock("@/lib/admin-orders", () => ({ purchaseShippingLabel }));

const { POST } = await import("./route");

function ctx(id = "order-1") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/admin/pedidos/[id]/etiqueta/comprar", () => {
  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await POST(new Request("http://localhost"), ctx());
    expect(res.status).toBe(404);
    expect(purchaseShippingLabel).not.toHaveBeenCalled();
  });

  it("compra a etiqueta e devolve tracking + url", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    purchaseShippingLabel.mockResolvedValue({ ok: true, trackingCode: "BR123", labelUrl: "https://label.example/1" });
    const res = await POST(new Request("http://localhost"), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ trackingCode: "BR123", labelUrl: "https://label.example/1" });
    expect(purchaseShippingLabel).toHaveBeenCalledWith("order-1", "admin@potinho.com.br");
  });

  it("repassa erro de domínio (ex.: sem cotação prévia)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    purchaseShippingLabel.mockResolvedValue({ ok: false, error: "Cote o frete antes de comprar a etiqueta" });
    const res = await POST(new Request("http://localhost"), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Cote o frete antes de comprar a etiqueta");
  });

  it("responde 500 controlado quando a chamada ao SuperFrete lança", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    purchaseShippingLabel.mockRejectedValue(new Error("timeout"));
    const res = await POST(new Request("http://localhost"), ctx());
    expect(res.status).toBe(500);
  });
});
