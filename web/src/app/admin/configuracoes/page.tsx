import { getUrgencyCountdown } from "@/lib/urgency-countdown";
import UrgencyCountdownForm from "@/components/admin/UrgencyCountdownForm";

export const metadata = { title: "configurações — admin potinho", robots: { index: false } };

export default async function AdminConfiguracoesPage() {
  const urgencyCountdown = await getUrgencyCountdown();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold lowercase text-potinho-chocolate dark:text-potinho-caramelo">
        configurações
      </h1>
      <UrgencyCountdownForm config={urgencyCountdown} />
    </div>
  );
}
