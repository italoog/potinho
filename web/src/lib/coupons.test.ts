import { describe, expect, it } from "vitest";
import { applyCoupon, couponValidationError, prorateProductDiscount, type DiscountableCartItem } from "./coupons";
import { comedouroPet } from "@/db/seed-data";
import type { CouponRow } from "@/db/schema";

const baseCoupon: CouponRow = {
  id: "coupon-1",
  code: "TESTE10",
  active: true,
  productDiscountType: "percent",
  productDiscountValue: 10,
  shippingDiscountType: null,
  shippingDiscountValue: null,
  cumulative: false,
  usageLimit: null,
  usageCount: 0,
  expiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const config = { pet_name: "THOR", color_base: "#3D6EB5", color_band: "#E88BB1", size: "15cm" };
const cartItem: DiscountableCartItem = { product: comedouroPet, configuration: config };

function withPromoOnSize15cm() {
  return {
    ...comedouroPet,
    variants: comedouroPet.variants.map((v) =>
      v.ref === "15cm" ? { ...v, discountType: "percent" as const, discountValue: 5 } : v,
    ),
  };
}

describe("applyCoupon", () => {
  it("desconta percentual do subtotal de produtos", () => {
    const result = applyCoupon(baseCoupon, [cartItem], 14900, 2000);
    expect(result.productDiscountCents).toBe(1490);
    expect(result.shippingDiscountCents).toBe(0);
  });

  it("desconta valor fixo do frete", () => {
    const coupon: CouponRow = {
      ...baseCoupon,
      productDiscountType: null,
      productDiscountValue: null,
      shippingDiscountType: "flat",
      shippingDiscountValue: 1000,
    };
    const result = applyCoupon(coupon, [cartItem], 14900, 2000);
    expect(result.shippingDiscountCents).toBe(1000);
  });

  it("desconto nunca passa do valor da base (frete grátis não vira frete negativo)", () => {
    const coupon: CouponRow = {
      ...baseCoupon,
      productDiscountType: null,
      productDiscountValue: null,
      shippingDiscountType: "flat",
      shippingDiscountValue: 9999,
    };
    const result = applyCoupon(coupon, [cartItem], 14900, 2000);
    expect(result.shippingDiscountCents).toBe(2000);
  });

  it("recusa cupom não-cumulativo quando algum item já está em promoção", () => {
    const promoItem: DiscountableCartItem = { product: withPromoOnSize15cm(), configuration: config };
    expect(() => applyCoupon(baseCoupon, [promoItem], 14900, 2000)).toThrow(/promoção/);
  });

  it("aceita item em promoção quando o cupom é cumulativo", () => {
    const promoItem: DiscountableCartItem = { product: withPromoOnSize15cm(), configuration: config };
    const cumulativeCoupon: CouponRow = { ...baseCoupon, cumulative: true };
    expect(() => applyCoupon(cumulativeCoupon, [promoItem], 14900, 2000)).not.toThrow();
  });
});

describe("couponValidationError", () => {
  it("aceita cupom ativo, sem validade, sem limite", () => {
    expect(couponValidationError(baseCoupon)).toBeNull();
  });

  it("recusa cupom inativo", () => {
    expect(couponValidationError({ ...baseCoupon, active: false })).toMatch(/inválido/);
  });

  it("recusa cupom com validade vencida", () => {
    const expired: CouponRow = { ...baseCoupon, expiresAt: new Date(Date.now() - 1000) };
    expect(couponValidationError(expired)).toMatch(/expirou/);
  });

  it("aceita cupom com validade no futuro", () => {
    const valid: CouponRow = { ...baseCoupon, expiresAt: new Date(Date.now() + 1000 * 60 * 60) };
    expect(couponValidationError(valid)).toBeNull();
  });

  it("recusa cupom que já atingiu o limite de uso", () => {
    const exhausted: CouponRow = { ...baseCoupon, usageLimit: 5, usageCount: 5 };
    expect(couponValidationError(exhausted)).toMatch(/limite/);
  });

  it("aceita cupom com limite ainda não atingido", () => {
    const withRoom: CouponRow = { ...baseCoupon, usageLimit: 5, usageCount: 4 };
    expect(couponValidationError(withRoom)).toBeNull();
  });
});

describe("prorateProductDiscount", () => {
  it("distribui o desconto proporcionalmente preservando a soma exata", () => {
    const result = prorateProductDiscount([9900, 14900], 2480);
    expect(result.reduce((sum, p) => sum + p, 0)).toBe(9900 + 14900 - 2480);
    expect(result.every((p) => p >= 0)).toBe(true);
  });

  it("sem desconto retorna os preços originais", () => {
    expect(prorateProductDiscount([9900, 14900], 0)).toEqual([9900, 14900]);
  });

  it("desconto igual ao total zera todos os itens", () => {
    expect(prorateProductDiscount([9900, 14900], 24800)).toEqual([0, 0]);
  });
});
