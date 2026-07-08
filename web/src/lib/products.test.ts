import { beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { comedouroPet } from "@/db/seed-data";

let testDb: ReturnType<typeof drizzle<typeof schema>>;

vi.mock("@/db", async () => {
  const actual = await vi.importActual<typeof schema>("@/db/schema");
  return { ...actual, getDb: async () => testDb };
});

const { updateProductPricing } = await import("./products");

let productId: string;

beforeAll(async () => {
  const client = new PGlite();
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
  const [product] = await testDb.insert(schema.products).values(comedouroPet).returning();
  productId = product.id;
});

describe("updateProductPricing (9.5 AC1/AC2)", () => {
  it("atualiza basePrice, status e priceDelta/envio da variante por ref, preservando o resto", async () => {
    await updateProductPricing(productId, {
      basePrice: 12000,
      status: "draft",
      variants: [{ ref: "15cm", priceDelta: 6000, shipping: { widthCm: 22, heightCm: 20, lengthCm: 22, weightKg: 1 } }],
      colorUpdates: [],
    });

    const [after] = await testDb.select().from(schema.products).where(eq(schema.products.id, productId));
    expect(after.basePrice).toBe(12000);
    expect(after.status).toBe("draft");
    const variant15 = after.variants.find((v) => v.ref === "15cm")!;
    expect(variant15.priceDelta).toBe(6000);
    expect(variant15.shipping).toEqual({ widthCm: 22, heightCm: 20, lengthCm: 22, weightKg: 1 });
    expect(variant15.label).toBe("G — 15cm"); // preservado
    // variante não tocada continua com o priceDelta original
    const variant5 = after.variants.find((v) => v.ref === "5cm")!;
    expect(variant5.priceDelta).toBe(0);
  });

  it("marca soldOut na cor certa (por paramKey+hex) sem afetar as outras opções", async () => {
    await updateProductPricing(productId, {
      basePrice: 12000,
      status: "published",
      variants: [],
      colorUpdates: [{ paramKey: "color_base", hex: "#1A1A1A", soldOut: true }],
    });

    const [after] = await testDb.select().from(schema.products).where(eq(schema.products.id, productId));
    const colorBase = after.paramSchema.find((p) => p.type === "color" && p.key === "color_base");
    if (colorBase?.type !== "color") throw new Error("esperava param color_base");
    const preto = colorBase.options.find((o) => o.hex === "#1A1A1A");
    const branco = colorBase.options.find((o) => o.hex === "#F4F4F4");
    expect(preto?.soldOut).toBe(true);
    expect(branco?.soldOut).toBeFalsy();
  });

  it("lança erro para produto inexistente", async () => {
    await expect(
      updateProductPricing("00000000-0000-0000-0000-000000000000", {
        basePrice: 100,
        status: "draft",
        variants: [],
        colorUpdates: [],
      }),
    ).rejects.toThrow("Produto não encontrado");
  });
});
