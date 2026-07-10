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

// revalidateTag/unstable_cache exigem contexto de request do Next — fora dele (aqui, testes unitários), viram no-op.
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

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
  it("atualiza status e preço/desconto/envio da variante por ref, preservando o resto", async () => {
    await updateProductPricing(productId, {
      status: "draft",
      variants: [
        {
          ref: "15cm",
          price: 18000,
          discountType: "flat",
          discountValue: 2000,
          shipping: { widthCm: 22, heightCm: 20, lengthCm: 22, weightKg: 1 },
        },
      ],
      colorUpdates: [],
    });

    const [after] = await testDb.select().from(schema.products).where(eq(schema.products.id, productId));
    expect(after.status).toBe("draft");
    const variant15 = after.variants.find((v) => v.ref === "15cm")!;
    expect(variant15.price).toBe(18000);
    expect(variant15.discountType).toBe("flat");
    expect(variant15.discountValue).toBe(2000);
    expect(variant15.shipping).toEqual({ widthCm: 22, heightCm: 20, lengthCm: 22, weightKg: 1 });
    expect(variant15.label).toBe("G — 15cm"); // preservado
    // variante não tocada continua com o preço original
    const variant5 = after.variants.find((v) => v.ref === "5cm")!;
    expect(variant5.price).toBe(9900);
  });

  it("marca soldOut na cor certa (por paramKey+hex) sem afetar as outras opções", async () => {
    await updateProductPricing(productId, {
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
        status: "draft",
        variants: [],
        colorUpdates: [],
      }),
    ).rejects.toThrow("Produto não encontrado");
  });
});

describe("addProductVariant / addProductColor (9.5 extensão)", () => {
  it("adiciona um tamanho novo com sua opção no select de tamanho", async () => {
    const { addProductVariant } = await import("./products");
    await addProductVariant(productId, {
      ref: "20cm",
      label: "GG — 20cm",
      dimensions: "20cm de altura",
      modelUrl: "/models/comedouro-pet/15cm.glb",
      price: 17900,
      shipping: { widthCm: 24, heightCm: 22, lengthCm: 24, weightKg: 1 },
    });

    const [after] = await testDb.select().from(schema.products).where(eq(schema.products.id, productId));
    const variant = after.variants.find((v) => v.ref === "20cm");
    expect(variant?.price).toBe(17900);
    const sizeParam = after.paramSchema.find((p) => p.type === "select");
    if (sizeParam?.type !== "select") throw new Error("esperava param select");
    expect(sizeParam.options.some((o) => o.value === "20cm")).toBe(true);
  });

  it("adiciona uma cor comum e uma cor misturada", async () => {
    const { addProductColor } = await import("./products");
    await addProductColor(productId, { paramKey: "color_base", label: "Dourado", hex: "#C9A227" });
    await addProductColor(productId, {
      paramKey: "color_base",
      label: "Marmorizado",
      hex: "#111111",
      blend: ["#111111", "#F4F4F4", "#C9A227"],
    });

    const [after] = await testDb.select().from(schema.products).where(eq(schema.products.id, productId));
    const colorBase = after.paramSchema.find((p) => p.type === "color" && p.key === "color_base");
    if (colorBase?.type !== "color") throw new Error("esperava param color_base");
    expect(colorBase.options.find((o) => o.hex === "#C9A227")?.blend).toBeUndefined();
    expect(colorBase.options.find((o) => o.label === "Marmorizado")?.blend).toEqual([
      "#111111",
      "#F4F4F4",
      "#C9A227",
    ]);
  });

  it("remove um tamanho e sua opção no select, mas bloqueia remover o último", async () => {
    const { removeProductVariant } = await import("./products");
    await removeProductVariant(productId, "20cm");

    const [after] = await testDb.select().from(schema.products).where(eq(schema.products.id, productId));
    expect(after.variants.some((v) => v.ref === "20cm")).toBe(false);
    const sizeParam = after.paramSchema.find((p) => p.type === "select");
    if (sizeParam?.type !== "select") throw new Error("esperava param select");
    expect(sizeParam.options.some((o) => o.value === "20cm")).toBe(false);

    // remove todos menos um, depois confirma que o último é bloqueado
    const remainingRefs = after.variants.map((v) => v.ref);
    for (const ref of remainingRefs.slice(0, -1)) {
      await removeProductVariant(productId, ref);
    }
    await expect(removeProductVariant(productId, remainingRefs[remainingRefs.length - 1])).rejects.toThrow(
      /pelo menos um tamanho/,
    );
  });

  it("remove uma cor, mas bloqueia remover a última do param", async () => {
    const { removeProductColor } = await import("./products");
    await removeProductColor(productId, { paramKey: "color_base", hex: "#C9A227" });

    const [after] = await testDb.select().from(schema.products).where(eq(schema.products.id, productId));
    const colorBase = after.paramSchema.find((p) => p.type === "color" && p.key === "color_base");
    if (colorBase?.type !== "color") throw new Error("esperava param color_base");
    expect(colorBase.options.some((o) => o.hex === "#C9A227")).toBe(false);
    expect(colorBase.options.length).toBeGreaterThan(0);
  });
});
