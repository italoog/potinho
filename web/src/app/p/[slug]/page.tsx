import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedProductBySlug } from "@/lib/products";
import { formatBRL } from "@/lib/money";
import ProductConfigurator from "@/components/product/ProductConfigurator";

/**
 * Página pública do produto (C-04): loja.com/p/{slug} — o link da bio do Instagram.
 * SSR garante OG tags corretas no compartilhamento (C-05).
 */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado — Forja3D" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const title = `${product.name} · ${formatBRL(product.basePrice)}`;
  const image = product.photos[0] ? `${appUrl}${product.photos[0]}` : undefined;

  return {
    title: `${title} — Forja3D`,
    description: product.description,
    openGraph: {
      title,
      description: product.description,
      url: `${appUrl}/p/${product.slug}`,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) notFound();

  return (
    <main className="min-h-screen bg-zinc-50">
      <ProductConfigurator product={product} />
    </main>
  );
}
