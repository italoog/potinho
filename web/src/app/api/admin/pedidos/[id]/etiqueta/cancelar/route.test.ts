import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const cancelShippingLabel = vi.fn();
vi.mock("@/lib/admin-orders", () => ({ cancelShippingLabel }));

const { POST } = await import("./route");

function ctx(id = "order-1") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/admin/pedidos/[id]/etiqueta/cancelar", () => {
  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await POST(new Request("http://localhost"), ctx());
    expect(res.status).toBe(404);
    expect(cancelShippingLabel).not.toHaveBeenCalled();
  });

  it("cancela e devolve ok", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    cancelShippingLabel.mockResolvedValue({ ok: true });
    const res = await POST(new Request("http://localhost"), ctx());
    expect(res.status).toBe(200);
    expect(cancelShippingLabel).toHaveBeenCalledWith("order-1", "admin@potinho.com.br");
  });

  it("repassa erro de domínio (ex.: já enviado, não pode cancelar)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    cancelShippingLabel.mockResolvedValue({ ok: false, error: "Pedido já foi enviado" });
    const res = await POST(new Request("http://localhost"), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Pedido já foi enviado");
  });

  it("responde 500 controlado em falha inesperada", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    cancelShippingLabel.mockRejectedValue(new Error("timeout"));
    const res = await POST(new Request("http://localhost"), ctx());
    expect(res.status).toBe(500);
  });
});
