import { beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { comedouroPet } from "@/db/seed-data";

/**
 * createOrderFromCart (6.1/9.4): preço e frete sempre recalculados no servidor. Cobre aqui o que
 * a rota de checkout público não exercita diretamente — frete grátis só no PAC (SEDEX sempre paga),
 * aplicação de cupom, e o fallback de snapshot inválido.
 */

let testDb: ReturnType<typeof drizzle<typeof schema>>;
let productId: string;

vi.mock("@/db", async () => {
  const actual = await vi.importActual<typeof schema>("@/db/schema");
  return { ...actual, getDb: async () => testDb };
});

const { createOrderFromCart } = await import("./order-creation");
const { createCoupon } = await import("./coupons");

const CUSTOMER = {
  name: "Mariana Silva",
  email: "mariana@example.com",
  phone: "+5511999990000",
  document: "11144477735",
  address: {
    street: "Rua das Flores",
    number: "123",
    neighborhood: "Jardim",
    city: "São Paulo",
    state: "SP",
    zip: "01234-567",
  },
};

function item(overrides: Record<string, string> = {}) {
  return {
    productId,
    configuration: { pet_name: "THOR", size: "15cm", color_base: "#3D6EB5", color_band: "#3D6EB5", ...overrides },
  };
}

beforeAll(async () => {
  const client = new PGlite();
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
  const [product] = await testDb.insert(schema.products).values(comedouroPet).returning();
  productId = product.id;
});

describe("createOrderFromCart — frete", () => {
  it("1 item (abaixo do mínimo) cobra o PAC normal", async () => {
    const { shippingCents } = await createOrderFromCart({ items: [item()], customer: CUSTOMER }, "system");
    expect(shippingCents).toBeGreaterThan(0);
  });

  it("2+ itens: PAC (default) sai grátis", async () => {
    const { shippingCents } = await createOrderFromCart(
      { items: [item(), item()], customer: CUSTOMER },
      "system",
    );
    expect(shippingCents).toBe(0);
  });

  it("2+ itens escolhendo SEDEX: continua cobrando o valor real, mesmo elegível a frete grátis", async () => {
    const { shippingCents } = await createOrderFromCart(
      { items: [item(), item()], customer: CUSTOMER, shippingService: "SEDEX" },
      "system",
    );
    expect(shippingCents).toBeGreaterThan(0);
  });

  it("shippingCentsOverride tem prioridade sobre a cotação automática", async () => {
    const { shippingCents } = await createOrderFromCart(
      { items: [item(), item()], customer: CUSTOMER, shippingCentsOverride: 4321 },
      "system",
    );
    expect(shippingCents).toBe(4321);
  });
});

describe("createOrderFromCart — cupom", () => {
  it("cupom válido desconta o produto e é consumido (usageCount incrementa)", async () => {
    const coupon = await createCoupon({
      code: `promo-${crypto.randomUUID().slice(0, 8)}`,
      active: true,
      productDiscountType: "percent",
      productDiscountValue: 10,
      shippingDiscountType: null,
      shippingDiscountValue: null,
      cumulative: false,
      usageLimit: null,
      expiresAt: null,
    });

    const { items: created } = await createOrderFromCart(
      { items: [item()], customer: CUSTOMER, couponCode: coupon.code },
      "system",
    );
    expect(created[0].unitPrice).toBeLessThan(comedouroPet.variants.find((v) => v.ref === "15cm")!.price);

    const [after] = await testDb.select().from(schema.coupons).where(eq(schema.coupons.id, coupon.id));
    expect(after.usageCount).toBe(1);
  });

  it("cupom inexistente rejeita a criação do pedido", async () => {
    await expect(
      createOrderFromCart({ items: [item()], customer: CUSTOMER, couponCode: "NAO-EXISTE" }, "system"),
    ).rejects.toThrow("Cupom inválido");
  });
});

describe("createOrderFromCart — snapshot", () => {
  it("snapshot inválido (não é PNG base64) não derruba o pedido — item fica sem snapshotUrl", async () => {
    const { order } = await createOrderFromCart(
      { items: [{ ...item(), snapshotDataUrl: "not-a-valid-data-url" }], customer: CUSTOMER },
      "system",
    );
    const [orderItem] = await testDb.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
    expect(orderItem.snapshotUrl).toBeNull();
  });
});

describe("createOrderFromCart — produto", () => {
  it("produto inexistente rejeita com 'Produto indisponível'", async () => {
    await expect(
      createOrderFromCart({ items: [item()].map((i) => ({ ...i, productId: crypto.randomUUID() })), customer: CUSTOMER }, "system"),
    ).rejects.toThrow("Produto indisponível");
  });
});
