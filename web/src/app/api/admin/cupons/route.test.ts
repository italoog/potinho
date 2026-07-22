import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const listCoupons = vi.fn();
const createCoupon = vi.fn();
vi.mock("@/lib/coupons", () => ({ listCoupons, createCoupon }));

const { GET, POST } = await import("./route");

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

function req(body: unknown): Request {
  return new Request("http://localhost/api/admin/cupons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/admin/cupons", () => {
  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
    expect(listCoupons).not.toHaveBeenCalled();
  });

  it("lista os cupons", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    listCoupons.mockResolvedValue([{ id: "c1", code: "PROMO10" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ coupons: [{ id: "c1", code: "PROMO10" }] });
  });
});

describe("POST /api/admin/cupons", () => {
  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await POST(req(validBody));
    expect(res.status).toBe(404);
    expect(createCoupon).not.toHaveBeenCalled();
  });

  it("rejeita body inválido (400)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const res = await POST(req({ ...validBody, code: "" }));
    expect(res.status).toBe(400);
    expect(createCoupon).not.toHaveBeenCalled();
  });

  it("cria o cupom", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    createCoupon.mockResolvedValue({ id: "c1", ...validBody });
    const res = await POST(req(validBody));
    expect(res.status).toBe(200);
    expect((await res.json()).coupon.id).toBe("c1");
  });

  it("repassa erro de domínio (ex.: código duplicado)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    createCoupon.mockRejectedValue(new Error("Já existe um cupom com esse código"));
    const res = await POST(req(validBody));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Já existe um cupom com esse código");
  });
});
