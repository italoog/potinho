import { getDb, products } from "./index";
import { comedouroPet } from "./seed-data";

async function main() {
  const db = await getDb();
  await db
    .insert(products)
    .values(comedouroPet)
    .onConflictDoUpdate({
      target: products.slug,
      set: {
        name: comedouroPet.name,
        description: comedouroPet.description,
        basePrice: comedouroPet.basePrice,
        status: comedouroPet.status,
        variants: comedouroPet.variants,
        paramSchema: comedouroPet.paramSchema,
        updatedAt: new Date(),
      },
    });
  console.log("✅ Seed aplicado: comedouro-pet");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Falha no seed:", err);
  process.exit(1);
});
