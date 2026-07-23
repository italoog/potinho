import { getDb, products } from "@/db";
import { getPendingNotifyRequests } from "@/lib/admin-notify";
import NotifyGroupRow from "@/components/admin/NotifyGroupRow";

export const metadata = { title: "avise-me — admin potinho", robots: { index: false } };

export default async function AdminAviseMePage() {
  const db = await getDb();
  const [product] = await db.select().from(products).limit(1);
  const groups = await getPendingNotifyRequests();

  const labelByHex = new Map<string, string>();
  for (const param of product?.paramSchema ?? []) {
    if (param.type !== "color") continue;
    for (const option of param.options) labelByHex.set(option.hex.toUpperCase(), option.label);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold lowercase text-potinho-chocolate dark:text-potinho-caramelo">avise-me</h1>
      <section className="rounded-3xl bg-white p-6 shadow-potinho-card dark:bg-potinho-carvao">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate dark:text-potinho-caramelo">
          pedidos pendentes por cor
        </h2>
        {groups.length === 0 ? (
          <p className="text-sm text-potinho-texto/50 dark:text-potinho-bege/50">nenhum pedido pendente.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {groups.map((group) => (
              <NotifyGroupRow
                key={group.colorId}
                colorId={group.colorId}
                colorLabel={labelByHex.get(group.colorId.toUpperCase()) ?? group.colorId}
                emails={group.emails}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
