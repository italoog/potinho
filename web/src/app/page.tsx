import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedProductBySlug } from "@/lib/products";
import PotinhoHome from "@/components/potinho/PotinhoHome";

/** ?cor=<id> muda só a pré-seleção visual, não o conteúdo — sem isso o Google indexaria a mesma
 * home várias vezes (uma por link de Story) como páginas "diferentes". */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** Home = vitrine do produto real (comedouro-pet) — mesma fonte de verdade do /p/[slug]. */
export default async function Home({
  searchParams,
}: {
  /** ?cor=<id de turntableClips> — deep link (ex: Stories) pré-seleciona a combinação de cor. */
  searchParams: Promise<{ cor?: string }>;
}) {
  const product = await getPublishedProductBySlug("comedouro-pet");
  if (!product) notFound();
  const { cor } = await searchParams;

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const prices = product.variants.map((v) => v.price);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.photos.map((p) => `${siteUrl}${p}`),
    brand: { "@type": "Brand", name: "potinho" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "BRL",
      lowPrice: (Math.min(...prices) / 100).toFixed(2),
      highPrice: (Math.max(...prices) / 100).toFixed(2),
      offerCount: product.variants.length,
      availability: "https://schema.org/InStock",
      url: siteUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // "<" escapado: impede que um "</script>" dentro do texto do produto feche a tag antes da hora.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c") }}
      />
      <PotinhoHome product={product} initialComboId={cor} />
    </>
  );
}
