import { eq } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";
import { getDb, products, type ProductRow } from "@/db";
import type { ColorOption, ProductStatus, ShippingPackage, Variant } from "@/db/types";

export type Product = ProductRow;

/** Tag única (loja de produto só tem 1 item) — todo write de admin invalida com revalidateTag. */
const PRODUCTS_TAG = "products";

export interface VariantPricingUpdate {
  ref: string;
  price: number;
  discountType: "percent" | "flat" | null;
  discountValue: number | null;
  shipping: ShippingPackage;
}

export interface ColorSoldOutUpdate {
  paramKey: string;
  hex: string;
  soldOut: boolean;
}

/**
 * Busca produto publicado por slug (C-04/C-06).
 * Cacheada 60s (poucos produtos, muda raro) — reduz carga no banco em picos de tráfego de anúncio;
 * writes de admin chamam revalidateTag(PRODUCTS_TAG) pra refletir na hora.
 */
export const getPublishedProductBySlug = unstable_cache(
  async (slug: string): Promise<Product | null> => {
    const db = await getDb();
    const [row] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
    if (!row || row.status !== "published") return null;
    return row;
  },
  ["published-product-by-slug"],
  { tags: [PRODUCTS_TAG], revalidate: 60 },
);

export async function getProductById(id: string): Promise<Product | null> {
  const db = await getDb();
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return row ?? null;
}

/**
 * Edição de preço/envio/status pelo admin (9.5 AC1) e toggle de soldOut por cor (9.5 AC2).
 * Atualiza só os campos tocados — preserva label/modelUrl/productionFile das variantes e o
 * resto do paramSchema (pet_name, tamanho) intactos.
 */
export async function updateProductPricing(
  productId: string,
  input: {
    status: ProductStatus;
    variants: VariantPricingUpdate[];
    colorUpdates: ColorSoldOutUpdate[];
  },
): Promise<void> {
  const db = await getDb();
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw new Error("Produto não encontrado");

  const variantPatchByRef = new Map(input.variants.map((v) => [v.ref, v]));
  const newVariants = product.variants.map((variant) => {
    const patch = variantPatchByRef.get(variant.ref);
    return patch
      ? {
          ...variant,
          price: patch.price,
          discountType: patch.discountType,
          discountValue: patch.discountValue,
          shipping: patch.shipping,
        }
      : variant;
  });

  const soldOutByKey = new Map(
    input.colorUpdates.map((c) => [`${c.paramKey}:${c.hex.toUpperCase()}`, c.soldOut]),
  );
  const newParamSchema = product.paramSchema.map((param) => {
    if (param.type !== "color") return param;
    return {
      ...param,
      options: param.options.map((option) => {
        const key = `${param.key}:${option.hex.toUpperCase()}`;
        return soldOutByKey.has(key) ? { ...option, soldOut: soldOutByKey.get(key) } : option;
      }),
    };
  });

  await db
    .update(products)
    .set({
      status: input.status,
      variants: newVariants,
      paramSchema: newParamSchema,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));
  revalidateTag(PRODUCTS_TAG, { expire: 0 });
}

/** Adiciona um tamanho novo (variante + opção do select "tamanho") — 9.5 extensão. */
export async function addProductVariant(
  productId: string,
  input: {
    ref: string;
    label: string;
    dimensions: string;
    modelUrl: string;
    price: number;
    shipping: ShippingPackage;
  },
): Promise<void> {
  const db = await getDb();
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw new Error("Produto não encontrado");
  if (product.variants.some((v) => v.ref === input.ref)) {
    throw new Error("Já existe um tamanho com essa referência");
  }

  const newVariant: Variant = {
    ref: input.ref,
    label: input.label,
    modelUrl: input.modelUrl,
    price: input.price,
    discountType: null,
    discountValue: null,
    dimensions: input.dimensions,
    shipping: input.shipping,
  };

  const newParamSchema = product.paramSchema.map((param) => {
    if (param.type !== "select") return param;
    return {
      ...param,
      options: [...param.options, { label: input.label, value: input.ref, variantRef: input.ref, priceDelta: 0 }],
    };
  });

  await db
    .update(products)
    .set({
      variants: [...product.variants, newVariant],
      paramSchema: newParamSchema,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));
  revalidateTag(PRODUCTS_TAG, { expire: 0 });
}

/** Adiciona uma cor nova (comum ou misturada de 2-4 filamentos) a um param de cor — 9.5 extensão. */
export async function addProductColor(
  productId: string,
  input: { paramKey: string; label: string; hex: string; blend?: string[] },
): Promise<void> {
  const db = await getDb();
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw new Error("Produto não encontrado");

  const newOption: ColorOption = { label: input.label, hex: input.hex, blend: input.blend };

  const newParamSchema = product.paramSchema.map((param) => {
    if (param.type !== "color" || param.key !== input.paramKey) return param;
    if (param.options.some((o) => o.hex.toUpperCase() === input.hex.toUpperCase())) {
      throw new Error("Já existe uma cor com esse hex");
    }
    return { ...param, options: [...param.options, newOption] };
  });

  await db
    .update(products)
    .set({ paramSchema: newParamSchema, updatedAt: new Date() })
    .where(eq(products.id, productId));
  revalidateTag(PRODUCTS_TAG, { expire: 0 });
}

/** Remove um tamanho (variante + opção do select "tamanho") — 9.5 extensão. */
export async function removeProductVariant(productId: string, ref: string): Promise<void> {
  const db = await getDb();
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw new Error("Produto não encontrado");
  if (product.variants.length <= 1) throw new Error("Precisa sobrar pelo menos um tamanho");
  if (!product.variants.some((v) => v.ref === ref)) throw new Error("Tamanho não encontrado");

  const newParamSchema = product.paramSchema.map((param) => {
    if (param.type !== "select") return param;
    return { ...param, options: param.options.filter((o) => o.variantRef !== ref) };
  });

  await db
    .update(products)
    .set({
      variants: product.variants.filter((v) => v.ref !== ref),
      paramSchema: newParamSchema,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));
  revalidateTag(PRODUCTS_TAG, { expire: 0 });
}

/** Remove uma cor de um param de cor — 9.5 extensão. */
export async function removeProductColor(
  productId: string,
  input: { paramKey: string; hex: string },
): Promise<void> {
  const db = await getDb();
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw new Error("Produto não encontrado");

  const param = product.paramSchema.find((p) => p.type === "color" && p.key === input.paramKey);
  if (param?.type !== "color") throw new Error("Param de cor não encontrado");
  if (!param.options.some((o) => o.hex.toUpperCase() === input.hex.toUpperCase())) {
    throw new Error("Cor não encontrada");
  }
  if (param.options.length <= 1) throw new Error("Precisa sobrar pelo menos uma cor");

  const newParamSchema = product.paramSchema.map((p) => {
    if (p.type !== "color" || p.key !== input.paramKey) return p;
    return { ...p, options: p.options.filter((o) => o.hex.toUpperCase() !== input.hex.toUpperCase()) };
  });

  await db
    .update(products)
    .set({ paramSchema: newParamSchema, updatedAt: new Date() })
    .where(eq(products.id, productId));
  revalidateTag(PRODUCTS_TAG, { expire: 0 });
}
