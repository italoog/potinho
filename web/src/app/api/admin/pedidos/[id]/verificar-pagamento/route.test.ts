import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const reconcilePaymentByAdmin = vi.fn();
vi.mock("@/lib/admin-orders", () => ({ reconcilePaymentByAdmin }));

const { POST } = await import("./route");

function ctx(id = "order-1") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/admin/pedidos/[id]/verificar-pagamento", () => {
  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await POST(new Request("http://localhost"), ctx());
    expect(res.status).toBe(404);
    expect(reconcilePaymentByAdmin).not.toHaveBeenCalled();
  });

  it("reconcilia e devolve o status encontrado no MP", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    reconcilePaymentByAdmin.mockResolvedValue({ ok: true, status: "approved" });
    const res = await POST(new Request("http://localhost"), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: "approved" });
    expect(reconcilePaymentByAdmin).toHaveBeenCalledWith("order-1", "admin@potinho.com.br");
  });

  it("repassa erro de domínio (ex.: nenhum pagamento encontrado)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    reconcilePaymentByAdmin.mockResolvedValue({ ok: false, error: "Nenhum pagamento encontrado no Mercado Pago para este pedido" });
    const res = await POST(new Request("http://localhost"), ctx());
    expect(res.status).toBe(400);
  });

  it("responde 500 controlado em falha inesperada (API do MP fora do ar)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    reconcilePaymentByAdmin.mockRejectedValue(new Error("timeout"));
    const res = await POST(new Request("http://localhost"), ctx());
    expect(res.status).toBe(500);
  });
});
