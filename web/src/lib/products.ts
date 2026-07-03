import { eq } from "drizzle-orm";
import { getDb, products, type ProductRow } from "@/db";

export type Product = ProductRow;

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
