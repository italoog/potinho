import { eq } from "drizzle-orm";
import { getDb, products, type ProductRow } from "@/db";
import type { ProductStatus, ShippingPackage } from "@/db/types";

export type Product = ProductRow;

export interface VariantPricingUpdate {
  ref: string;
  priceDelta: number;
  shipping: ShippingPackage;
}

export interface ColorSoldOutUpdate {
  paramKey: string;
  hex: string;
  soldOut: boolean;
}

/** Busca produto publicado por slug (C-04/C-06). */
export async function getPublishedProductBySlug(slug: string): Promise<Product | null> {
  const db = await getDb();
  const [row] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!row || row.status !== "published") return null;
  return row;
}

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
    basePrice: number;
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
    return patch ? { ...variant, priceDelta: patch.priceDelta, shipping: patch.shipping } : variant;
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
      basePrice: input.basePrice,
      status: input.status,
      variants: newVariants,
      paramSchema: newParamSchema,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));
}
