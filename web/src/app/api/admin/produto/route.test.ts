import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const updateProductPricing = vi.fn();
vi.mock("@/lib/products", () => ({ updateProductPricing }));

const { PATCH } = await import("./route");

const validBody = {
  productId: crypto.randomUUID(),
  status: "published",
  variants: [
    {
      ref: "15cm",
      price: 14900,
      discountType: null,
      discountValue: null,
      shipping: { widthCm: 20, heightCm: 15, lengthCm: 20, weightKg: 1 },
    },
  ],
  colorUpdates: [{ paramKey: "color_base", hex: "#3D6EB5", soldOut: false }],
};

function req(body: unknown): Request {
  return new Request("http://localhost/api/admin/produto", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("PATCH /api/admin/produto", () => {
  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await PATCH(req(validBody));
    expect(res.status).toBe(404);
    expect(updateProductPricing).not.toHaveBeenCalled();
  });

  it("rejeita body inválido (400)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const res = await PATCH(req({ ...validBody, status: "invalido" }));
    expect(res.status).toBe(400);
    expect(updateProductPricing).not.toHaveBeenCalled();
  });

  it("aplica a atualização", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    updateProductPricing.mockResolvedValue(undefined);
    const res = await PATCH(req(validBody));
    expect(res.status).toBe(200);
    expect(updateProductPricing).toHaveBeenCalledWith(validBody.productId, validBody);
  });

  it("responde 400 controlado em falha de domínio", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    updateProductPricing.mockRejectedValue(new Error("falhou"));
    const res = await PATCH(req(validBody));
    expect(res.status).toBe(400);
  });
});
