import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const resendOrderConfirmation = vi.fn();
vi.mock("@/lib/admin-orders", () => ({ resendOrderConfirmation }));

const { POST } = await import("./route");

function ctx(id = "order-1") {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/admin/pedidos/[id]/reenviar-email", () => {
  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await POST(new Request("http://localhost"), ctx());
    expect(res.status).toBe(404);
    expect(resendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("reenvia e devolve ok", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    resendOrderConfirmation.mockResolvedValue(true);
    const res = await POST(new Request("http://localhost"), ctx());
    expect(res.status).toBe(200);
    expect(resendOrderConfirmation).toHaveBeenCalledWith("order-1", "admin@potinho.com.br");
  });

  it("responde 404 quando o pedido não existe", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    resendOrderConfirmation.mockResolvedValue(false);
    const res = await POST(new Request("http://localhost"), ctx());
    expect(res.status).toBe(404);
  });
});
