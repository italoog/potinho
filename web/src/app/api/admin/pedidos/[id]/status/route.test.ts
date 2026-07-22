import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Mudança de status do pedido pelo admin (9.3 AC3): a rota confia em requireAdminSession +
 * changeOrderStatus, ambos já testados isoladamente — aqui o foco é 404 sem sessão admin,
 * validação de body e repasse do erro de transição inválida.
 */

const requireAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const changeOrderStatus = vi.fn();
vi.mock("@/lib/admin-orders", () => ({ changeOrderStatus }));

const { POST } = await import("./route");

function req(body: unknown): Request {
  return new Request("http://localhost/api/admin/pedidos/order-1/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function ctx(id = "order-1") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/pedidos/[id]/status", () => {
  it("responde 404 quando não há sessão de admin (defesa em profundidade)", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await POST(req({ status: "paid" }), ctx());
    expect(res.status).toBe(404);
    expect(changeOrderStatus).not.toHaveBeenCalled();
  });

  it("rejeita status fora do enum (400)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const res = await POST(req({ status: "nao-existe" }), ctx());
    expect(res.status).toBe(400);
    expect(changeOrderStatus).not.toHaveBeenCalled();
  });

  it("aplica a transição e devolve ok", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    changeOrderStatus.mockResolvedValue({ ok: true });
    const res = await POST(req({ status: "production" }), ctx());
    expect(res.status).toBe(200);
    expect(changeOrderStatus).toHaveBeenCalledWith("order-1", "production", "admin@potinho.com.br", undefined);
  });

  it("repassa o código de rastreio quando informado", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    changeOrderStatus.mockResolvedValue({ ok: true });
    await POST(req({ status: "shipped", trackingCode: "BR123456789" }), ctx());
    expect(changeOrderStatus).toHaveBeenCalledWith("order-1", "shipped", "admin@potinho.com.br", "BR123456789");
  });

  it("repassa erro de transição inválida (não a mensagem genérica)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    changeOrderStatus.mockResolvedValue({ ok: false, error: 'Não é possível mudar de "delivered" para "paid"' });
    const res = await POST(req({ status: "paid" }), ctx());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Não é possível mudar de "delivered" para "paid"');
  });
});
