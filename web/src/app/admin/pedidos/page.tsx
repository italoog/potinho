import Link from "next/link";
import { searchAdminOrders } from "@/lib/admin-orders";
import { formatBRL } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/order-status";
import { ORDER_STATUSES, type OrderStatus } from "@/db/types";

const PAGE_SIZE = 20;

export default async function AdminPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q, status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const validStatus = ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined;

  const { items, total } = await searchAdminOrders({ query: q, status: validStatus, page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold lowercase text-potinho-chocolate">pedidos</h1>

      <form method="get" className="flex flex-wrap gap-3 rounded-3xl bg-white p-4 shadow-potinho-card">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="buscar por nome, e-mail ou nome do pet"
          className="min-w-64 flex-1 rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm text-potinho-texto placeholder:text-potinho-cinza focus:border-potinho-chocolate focus:outline-none"
        />
        <select
          name="status"
          defaultValue={validStatus ?? ""}
          className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm text-potinho-texto focus:border-potinho-chocolate focus:outline-none"
        >
          <option value="">todos os status</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full bg-potinho-chocolate px-6 py-2.5 text-sm font-semibold lowercase text-potinho-bege hover:bg-potinho-texto"
        >
          buscar
        </button>
        <a
          href={`/api/admin/orders.csv?${new URLSearchParams({ ...(q ? { q } : {}), ...(validStatus ? { status: validStatus } : {}) }).toString()}`}
          className="rounded-full border-2 border-potinho-bege px-6 py-2.5 text-sm font-semibold lowercase text-potinho-chocolate hover:bg-potinho-fundo"
        >
          exportar csv
        </a>
      </form>

      <div className="overflow-x-auto rounded-3xl bg-white shadow-potinho-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-potinho-bege text-xs uppercase tracking-widest text-potinho-texto/50">
              <th className="px-5 py-3">data</th>
              <th className="px-5 py-3">cliente</th>
              <th className="px-5 py-3">pets</th>
              <th className="px-5 py-3">total</th>
              <th className="px-5 py-3">status</th>
              <th className="px-5 py-3">rastreio</th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ order, petNames }) => {
              const customer = order.customer as { name: string; email: string };
              return (
                <tr key={order.id} className="border-b border-potinho-bege/50 last:border-0 hover:bg-potinho-fundo">
                  <td className="px-5 py-3">
                    <Link href={`/admin/pedidos/${order.id}`} className="hover:underline">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-potinho-texto">{customer.name}</p>
                    <p className="text-xs text-potinho-texto/50">{customer.email}</p>
                  </td>
                  <td className="px-5 py-3 uppercase tracking-wide">{petNames.join(", ")}</td>
                  <td className="px-5 py-3 font-semibold text-potinho-chocolate">{formatBRL(order.totalAmount)}</td>
                  <td className="px-5 py-3 lowercase">{STATUS_LABEL[order.status]}</td>
                  <td className="px-5 py-3 text-xs text-potinho-texto/60">{order.trackingCode ?? "—"}</td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-potinho-texto/50">
                  nenhum pedido encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/pedidos?${new URLSearchParams({ ...(q ? { q } : {}), ...(validStatus ? { status: validStatus } : {}), page: String(p) }).toString()}`}
              className={`rounded-full px-3 py-1.5 text-sm ${
                p === page ? "bg-potinho-chocolate text-potinho-bege" : "bg-white text-potinho-texto/60 shadow-sm"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
