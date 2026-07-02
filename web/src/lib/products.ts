import { eq } from "drizzle-orm";
import { comedouroPet } from "@/db/seed-data";
import type { ProductRow } from "@/db/schema";

export type Product = Omit<ProductRow, "id" | "createdAt" | "updatedAt"> & {
  id: string;
};

const SEED_FALLBACK_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Busca produto publicado por slug.
 * Sem DATABASE_URL (dev/preview sem banco), cai no seed em memória —
 * permite rodar o visualizador localmente sem Postgres.
 */
export async function getPublishedProductBySlug(slug: string): Promise<Product | null> {
  if (!process.env.DATABASE_URL) {
    if (slug === comedouroPet.slug) {
      return { id: SEED_FALLBACK_ID, ...comedouroPet } as Product;
    }
    return null;
  }
  const { getDb, products } = await import("@/db");
  const db = getDb();
  const [row] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!row || row.status !== "published") return null;
  return row;
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!process.env.DATABASE_URL) {
    return id === SEED_FALLBACK_ID ? ({ id, ...comedouroPet } as Product) : null;
  }
  const { getDb, products } = await import("@/db");
  const db = getDb();
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return row ?? null;
}
