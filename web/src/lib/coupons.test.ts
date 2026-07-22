import { beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { comedouroPet } from "@/db/seed-data";
import type { CouponRow } from "@/db/schema";

let testDb: ReturnType<typeof drizzle<typeof schema>>;

vi.mock("@/db", async () => {
  const actual = await vi.importActual<typeof schema>("@/db/schema");
  return { ...actual, getDb: async () => testDb };
});

const {
  applyCoupon,
  couponValidationError,
  prorateProductDiscount,
  tryConsumeCoupon,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} = await import("./coupons");
type DiscountableCartItem = import("./coupons").DiscountableCartItem;

beforeAll(async () => {
  const client = new PGlite();
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

function couponInput(overrides: Partial<Parameters<typeof createCoupon>[0]> = {}) {
  return {
    code: `cupom-${crypto.randomUUID().slice(0, 8)}`,
    active: true,
    productDiscountType: "percent" as const,
    productDiscountValue: 10,
    shippingDiscountType: null,
    shippingDiscountValue: null,
    cumulative: false,
    usageLimit: null,
    expiresAt: null,
    ...overrides,
  };
}

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

describe("tryConsumeCoupon (consumo atômico — TOCTOU)", () => {
  it("incrementa o uso e devolve true quando ainda há vaga", async () => {
    const coupon = await createCoupon(couponInput({ usageLimit: 2 }));
    expect(await tryConsumeCoupon(coupon.id)).toBe(true);
    const [after] = await testDb.select().from(schema.coupons).where(eq(schema.coupons.id, coupon.id));
    expect(after.usageCount).toBe(1);
  });

  it("devolve false quando o limite já foi atingido (corrida perdida)", async () => {
    const coupon = await createCoupon(couponInput({ usageLimit: 1 }));
    expect(await tryConsumeCoupon(coupon.id)).toBe(true);
    expect(await tryConsumeCoupon(coupon.id)).toBe(false);
  });

  it("sem usageLimit (ilimitado) sempre devolve true", async () => {
    const coupon = await createCoupon(couponInput({ usageLimit: null }));
    for (let i = 0; i < 5; i++) expect(await tryConsumeCoupon(coupon.id)).toBe(true);
  });
});

describe("CRUD de cupons (admin)", () => {
  it("cria, lista, atualiza e apaga um cupom", async () => {
    const created = await createCoupon(couponInput({ code: "cupom-crud" }));
    expect(created.code).toBe("CUPOM-CRUD"); // normalizado

    const all = await listCoupons();
    expect(all.some((c) => c.id === created.id)).toBe(true);

    const updated = await updateCoupon(created.id, couponInput({ code: "cupom-crud", productDiscountValue: 20 }));
    expect(updated.productDiscountValue).toBe(20);

    await deleteCoupon(created.id);
    expect((await listCoupons()).some((c) => c.id === created.id)).toBe(false);
  });

  it("recusa código duplicado", async () => {
    await createCoupon(couponInput({ code: "cupom-dup" }));
    await expect(createCoupon(couponInput({ code: "cupom-dup" }))).rejects.toThrow(/já existe/i);
  });

  it("exige pelo menos um tipo de desconto configurado", async () => {
    await expect(
      createCoupon(couponInput({ productDiscountType: null, shippingDiscountType: null })),
    ).rejects.toThrow(/configure desconto/i);
  });

  it("recusa desconto percentual acima de 100%", async () => {
    await expect(createCoupon(couponInput({ productDiscountValue: 150 }))).rejects.toThrow(/não pode passar de 100/);
  });

  it("recusa usageLimit menor que 1", async () => {
    await expect(createCoupon(couponInput({ usageLimit: 0 }))).rejects.toThrow(/pelo menos 1/);
  });

  it("updateCoupon lança quando o id não existe", async () => {
    await expect(updateCoupon(crypto.randomUUID(), couponInput())).rejects.toThrow(/não encontrado/i);
  });
});
