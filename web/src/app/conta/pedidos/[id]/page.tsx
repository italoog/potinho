import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getOrderForUser } from "@/lib/orders";
import { formatBRL } from "@/lib/money";
import type { OrderEventType, OrderStatus } from "@/db/types";
import { EVENT_LABEL, STATUS_BADGE_CLASS, STATUS_LABEL } from "@/lib/order-status";

export const metadata = { title: "seu pedido — potinho", robots: { index: false } };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();

  const result = await getOrderForUser(id, session.user.id);
  if (!result) notFound();
  const { order, items, events } = result;
  const status = order.status as OrderStatus;
  const address = (order.customer as { address: Record<string, string> }).address;

  return (
    <main className="min-h-screen bg-potinho-fundo px-4 py-10 font-[family-name:var(--font-poppins)] text-potinho-texto sm:py-16">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Link href="/conta" className="text-sm text-potinho-texto/60 hover:underline">
          ← voltar pra minha conta
        </Link>

        <header className="flex items-center justify-between rounded-3xl bg-white p-6 shadow-potinho-card">
          <div>
            <p className="text-xs uppercase tracking-widest text-potinho-texto/50">
              pedido de {new Date(order.createdAt).toLocaleDateString("pt-BR")}
            </p>
            <p className="text-lg font-bold text-potinho-chocolate">{formatBRL(order.totalAmount)}</p>
          </div>
          <span
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold lowercase ${STATUS_BADGE_CLASS[status]}`}
          >
            {STATUS_LABEL[status]}
          </span>
        </header>

        {order.trackingCode && (
          <div className="rounded-3xl bg-white p-6 shadow-potinho-card">
            <p className="text-xs uppercase tracking-widest text-potinho-texto/50">rastreio</p>
            <p className="font-semibold text-potinho-texto">{order.trackingCode}</p>
          </div>
        )}

        <section className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-potinho-card">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">itens</h2>
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 border-t border-potinho-bege pt-4 first:border-0 first:pt-0">
              {item.snapshotUrl && (
                <Image
                  src={item.snapshotUrl}
                  alt="Produto personalizado"
                  width={96}
                  height={96}
                  unoptimized
                  className="h-20 w-20 rounded-2xl object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold uppercase tracking-wider text-potinho-texto">
                  {item.configuration.pet_name}
                </p>
                <p className="text-xs text-potinho-texto/60">
                  {item.productName} · {item.configuration.size}
                </p>
              </div>
              <span className="font-bold text-potinho-chocolate">{formatBRL(item.unitPrice)}</span>
            </div>
          ))}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-potinho-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
            endereço de entrega
          </h2>
          <p className="text-sm text-potinho-texto/80">
            {address.street}, {address.number}
            {address.complement ? ` · ${address.complement}` : ""} — {address.neighborhood},{" "}
            {address.city}/{address.state}
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-potinho-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
            linha do tempo
          </h2>
          <ol className="flex flex-col gap-3">
            {events
              .filter((e) => e.type in EVENT_LABEL)
              .map((event) => (
                <li key={event.id} className="flex items-center justify-between text-sm">
                  <span className="text-potinho-texto/80">
                    {EVENT_LABEL[event.type as OrderEventType]}
                  </span>
                  <span className="text-xs text-potinho-texto/50">
                    {new Date(event.createdAt).toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
