import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const updateCoupon = vi.fn();
const deleteCoupon = vi.fn();
vi.mock("@/lib/coupons", () => ({ updateCoupon, deleteCoupon }));

const { PATCH, DELETE } = await import("./route");

const validBody = {
  code: "PROMO10",
  active: true,
  productDiscountType: "percent",
  productDiscountValue: 10,
  shippingDiscountType: null,
  shippingDiscountValue: null,
  cumulative: false,
  usageLimit: null,
  expiresAt: null,
};

function ctx(id = "coupon-1") {
  return { params: Promise.resolve({ id }) };
}

function req(body: unknown): Request {
  return new Request("http://localhost/api/admin/cupons/coupon-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("PATCH /api/admin/cupons/[id]", () => {
  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await PATCH(req(validBody), ctx());
    expect(res.status).toBe(404);
    expect(updateCoupon).not.toHaveBeenCalled();
  });

  it("rejeita body inválido (400)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const res = await PATCH(req({ ...validBody, usageLimit: 0 }), ctx());
    expect(res.status).toBe(400);
  });

  it("atualiza o cupom", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    updateCoupon.mockResolvedValue({ id: "coupon-1", ...validBody });
    const res = await PATCH(req(validBody), ctx());
    expect(res.status).toBe(200);
    expect(updateCoupon).toHaveBeenCalledWith("coupon-1", expect.objectContaining({ code: "PROMO10" }));
  });

  it("repassa erro de domínio (ex.: cupom não encontrado)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    updateCoupon.mockRejectedValue(new Error("Cupom não encontrado"));
    const res = await PATCH(req(validBody), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Cupom não encontrado");
  });
});

describe("DELETE /api/admin/cupons/[id]", () => {
  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost"), ctx());
    expect(res.status).toBe(404);
    expect(deleteCoupon).not.toHaveBeenCalled();
  });

  it("remove o cupom", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    deleteCoupon.mockResolvedValue(undefined);
    const res = await DELETE(new Request("http://localhost"), ctx());
    expect(res.status).toBe(200);
    expect(deleteCoupon).toHaveBeenCalledWith("coupon-1");
  });

  it("responde 400 controlado em falha", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    deleteCoupon.mockRejectedValue(new Error("falhou"));
    const res = await DELETE(new Request("http://localhost"), ctx());
    expect(res.status).toBe(400);
  });
});
