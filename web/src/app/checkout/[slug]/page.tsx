import { notFound } from "next/navigation";
import { getPublishedProductBySlug } from "@/lib/products";
import CheckoutForm from "@/components/checkout/CheckoutForm";

export const metadata = { title: "Finalizar pedido — Forja3D", robots: { index: false } };

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) notFound();

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900">Finalizar pedido</h1>
        <CheckoutForm
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            basePrice: product.basePrice,
            variants: product.variants,
            paramSchema: product.paramSchema,
          }}
        />
      </div>
    </main>
  );
}
