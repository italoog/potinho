import { listCoupons } from "@/lib/coupons";
import CuponsManager from "@/components/admin/CuponsManager";

export const metadata = { title: "cupons — admin potinho", robots: { index: false } };

export default async function AdminCuponsPage() {
  const coupons = await listCoupons();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold lowercase text-potinho-chocolate dark:text-potinho-caramelo">
        cupons de desconto
      </h1>
      <CuponsManager coupons={coupons} />
    </div>
  );
}
