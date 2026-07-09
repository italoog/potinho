import { notFound } from "next/navigation";
import { getDb, products } from "@/db";
import ProdutoForm from "@/components/admin/ProdutoForm";

export const metadata = { title: "produto — admin potinho", robots: { index: false } };

export default async function AdminProdutoPage() {
  const db = await getDb();
  const [product] = await db.select().from(products).limit(1);
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold lowercase text-potinho-chocolate">produto</h1>
      <ProdutoForm key={product.updatedAt.toISOString()} product={product} />
    </div>
  );
}
