import { notFound } from "next/navigation";
import { getPublishedProductBySlug } from "@/lib/products";
import NovoPedidoForm from "@/components/admin/NovoPedidoForm";

export const metadata = { title: "criar pedido — admin potinho", robots: { index: false } };

export default async function AdminNovoPedidoPage() {
  const product = await getPublishedProductBySlug("comedouro-pet");
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold lowercase text-potinho-chocolate">criar pedido</h1>
      <NovoPedidoForm product={product} />
    </div>
  );
}
