import { notFound } from "next/navigation";
import { getPublishedProductBySlug } from "@/lib/products";
import PotinhoHome from "@/components/potinho/PotinhoHome";

/** Home = vitrine do produto real (comedouro-pet) — mesma fonte de verdade do /p/[slug]. */
export default async function Home() {
  const product = await getPublishedProductBySlug("comedouro-pet");
  if (!product) notFound();
  return <PotinhoHome product={product} />;
}
