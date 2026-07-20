import { notFound } from "next/navigation";
import { getPublishedProductBySlug } from "@/lib/products";
import PotinhoHome from "@/components/potinho/PotinhoHome";

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
  return <PotinhoHome product={product} initialComboId={cor} />;
}
