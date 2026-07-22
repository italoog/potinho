import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { comedouroPet } from "@/db/seed-data";

/**
 * Preview do cupom no checkout — só UX (o recálculo real é em POST /api/checkout, já coberto).
 * Aqui: cupom inexistente/expirado/esgotado, produto inválido, e o desconto calculado batendo
 * com applyCoupon (coupons.test.ts).
 */

let testDb: ReturnType<typeof drizzle<typeof schema>>;
let productId: string;

vi.mock("@/db", async () => {
  const actual = await vi.importActual<typeof schema>("@/db/schema");
  return { ...actual, getDb: async () => testDb };
});

const { POST } = await import("./route");

function req(body: unknown): Request {
  return new Request("http://localhost/api/checkout/cupom", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `172.16.0.${Math.floor(Math.random() * 250) + 1}` },
    body: JSON.stringify(body),
  });
}

async function createCoupon(overrides: Partial<schema.NewCouponRow> = {}) {
  const [row] = await testDb
    .insert(schema.coupons)
    .values({
      code: `CUPOM-${crypto.randomUUID().slice(0, 8)}`.toUpperCase(),
      active: true,
      productDiscountType: "percent",
      productDiscountValue: 10,
      cumulative: false,
      ...overrides,
    })
    .returning();
  return row;
}

beforeAll(async () => {
  const client = new PGlite();
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
  const [product] = await testDb.insert(schema.products).values(comedouroPet).returning();
  productId = product.id;
});

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    couponCode: "CUPOM-1",
    items: [{ productId, configuration: { pet_name: "THOR", size: "15cm", color_base: "#3D6EB5", color_band: "#3D6EB5" } }],
    shippingCents: 2000,
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/checkout/cupom", () => {
  it("rejeita body inválido (400)", async () => {
    const res = await POST(req({ couponCode: "", items: [], shippingCents: -1 }));
    expect(res.status).toBe(400);
  });

  it("responde 404 quando o cupom não existe", async () => {
    const res = await POST(req(validBody({ couponCode: "NAO-EXISTE" })));
    expect(res.status).toBe(404);
  });

  it("responde 400 quando o cupom está inativo", async () => {
    const coupon = await createCoupon({ active: false });
    const res = await POST(req(validBody({ couponCode: coupon.code })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/inválido/);
  });

  it("responde 400 quando o cupom expirou", async () => {
    const coupon = await createCoupon({ expiresAt: new Date(Date.now() - 1000) });
    const res = await POST(req(validBody({ couponCode: coupon.code })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/expirou/);
  });

  it("responde 404 quando o produto não existe/não está publicado", async () => {
    const coupon = await createCoupon();
    const res = await POST(
      req(validBody({ couponCode: coupon.code, items: [{ productId: crypto.randomUUID(), configuration: {} }] })),
    );
    expect(res.status).toBe(404);
  });

  it("calcula e devolve o desconto de produto", async () => {
    const coupon = await createCoupon({ productDiscountValue: 10 });
    const res = await POST(req(validBody({ couponCode: coupon.code })));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.productDiscountCents).toBe(1490); // 10% de 14900
    expect(json.shippingDiscountCents).toBe(0);
  });

  it("responde 400 quando o cupom não-cumulativo encontra item já em promoção", async () => {
    const [product] = await testDb
      .insert(schema.products)
      .values({
        ...comedouroPet,
        slug: "comedouro-promo",
        variants: comedouroPet.variants.map((v) => (v.ref === "15cm" ? { ...v, discountType: "percent", discountValue: 5 } : v)),
      })
      .returning();
    const coupon = await createCoupon({ cumulative: false });
    const res = await POST(
      req(
        validBody({
          couponCode: coupon.code,
          items: [{ productId: product.id, configuration: { pet_name: "THOR", size: "15cm", color_base: "#3D6EB5", color_band: "#3D6EB5" } }],
        }),
      ),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/promoção/);
  });

  it("aplica rate limit (20 req / 5 min por IP)", async () => {
    const ip = "10.10.10.10";
    const coupon = await createCoupon();
    let last = new Response();
    for (let i = 0; i < 21; i++) {
      last = await POST(
        new Request("http://localhost/api/checkout/cupom", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
          body: JSON.stringify(validBody({ couponCode: coupon.code })),
        }),
      );
    }
    expect(last.status).toBe(429);
  });
});
