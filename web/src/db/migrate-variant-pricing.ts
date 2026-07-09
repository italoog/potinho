import { eq } from "drizzle-orm";
import { getDb, products } from "./index";

/**
 * One-off: converte variants antigas (basePrice + priceDelta) pro modelo novo
 * (preço absoluto por tamanho + desconto opcional). Idempotente — pula linhas
 * que já têm `price` em todas as variantes.
 */
async function main() {
  const db = await getDb();
  const rows = await db.select().from(products);

  for (const row of rows) {
    const alreadyMigrated = row.variants.every((v) => "price" in v);
    if (alreadyMigrated) {
      console.log(`↷ ${row.slug}: já migrado, pulando`);
      continue;
    }

    const newVariants = row.variants.map((v) => {
      const legacy = v as unknown as { priceDelta?: number };
      return {
        ...v,
        price: row.basePrice + (legacy.priceDelta ?? 0),
        discountType: null,
        discountValue: null,
      };
    });

    await db
      .update(products)
      .set({ variants: newVariants, basePrice: 0, updatedAt: new Date() })
      .where(eq(products.id, row.id));
    console.log(`✅ ${row.slug}: ${newVariants.length} variante(s) migrada(s)`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Falha na migração:", err);
  process.exit(1);
});
