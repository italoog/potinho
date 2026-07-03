import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, gte, sql } from "drizzle-orm";
import { getDb, orders, products } from "@/db";
import { isAdmin } from "@/lib/auth";
import { formatBRL } from "@/lib/money";
import type { OrderStatus } from "@/db/types";
import StatusSelect from "@/components/admin/StatusSelect";

export const metadata = { title: "Pedidos — Forja3D Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Aguardando pgto",
  paid: "Pago",
  production: "Em produção",
  shipped: "Enviado",
  delivered: "Entregue",
  canceled: "Cancelado",
};

/** Dashboard do lojista (D-02, D-05): pedidos com spec completa + métricas do mês. */
export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const db = await getDb();
  const rows = await db
    .select({ order: orders, productName: products.name })
    .from(orders)
    .leftJoin(products, eq(orders.productId, products.id))
    .orderBy(desc(orders.createdAt))
    .limit(100);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [metrics] = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
      revenue: sql<number>`coalesce(sum(${orders.totalAmount}), 0)`.mapWith(Number),
    })
    .from(orders)
    .where(gte(orders.createdAt, monthStart));

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">Pedidos</h1>
          <nav className="flex gap-3 text-sm">
            <a href="/api/admin/orders.csv" className="rounded-xl border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-700 hover:border-zinc-500">
              Exportar CSV
            </a>
            <form action="/api/admin/logout" method="post">
              <button className="rounded-xl border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-700 hover:border-zinc-500">
                Sair
              </button>
            </form>
          </nav>
        </header>

        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Vendas do mês</p>
            <p className="text-2xl font-bold text-zinc-900">{formatBRL(metrics?.revenue ?? 0)}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Pedidos do mês</p>
            <p className="text-2xl font-bold text-zinc-900">{metrics?.count ?? 0}</p>
          </div>
        </section>

        <section className="space-y-4">
          {rows.length === 0 && (
            <p className="rounded-2xl bg-white p-8 text-center text-zinc-500 shadow-sm">
              Nenhum pedido ainda. Compartilhe o link do produto no Instagram! 🚀
            </p>
          )}
          {rows.map(({ order, productName }) => (
            <article key={order.id} className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row">
              {order.snapshotUrl && (
                <Image
                  src={order.snapshotUrl}
                  alt="Configuração do cliente"
                  width={160}
                  height={120}
                  className="h-28 w-36 rounded-xl object-cover"
                  unoptimized
                />
              )}
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-semibold text-zinc-900">{productName ?? "Produto"}</h2>
                  <span className="text-sm text-zinc-500">
                    {order.createdAt.toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm text-zinc-600">
                  {order.customer.name} · {order.customer.phone} ·{" "}
                  {order.customer.address.city}/{order.customer.address.state}
                </p>
                <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {Object.entries(order.configuration).map(([k, v]) => (
                    <div key={k} className="rounded-lg bg-zinc-100 px-2 py-1">
                      <dt className="inline text-zinc-500">{k}: </dt>
                      <dd className="inline font-medium text-zinc-900">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="font-bold text-zinc-900">{formatBRL(order.totalAmount)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500">{STATUS_LABEL[order.status]}</span>
                    <StatusSelect orderId={order.id} current={order.status} trackingCode={order.trackingCode} />
                  </div>
                </div>
                <Link href={`/pedido/${order.publicToken}`} className="mt-2 inline-block text-xs text-zinc-400 underline">
                  ver página do cliente
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
