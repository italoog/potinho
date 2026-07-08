import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderForAdmin } from "@/lib/orders";
import { formatBRL } from "@/lib/money";
import { EVENT_LABEL, STATUS_BADGE_CLASS, STATUS_LABEL } from "@/lib/order-status";
import type { Customer, OrderEventType, OrderStatus } from "@/db/types";
import OrderActions from "@/components/admin/OrderActions";

export const metadata = { title: "pedido — admin potinho", robots: { index: false } };

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getOrderForAdmin(id);
  if (!result) notFound();
  const { order, items, events } = result;
  const status = order.status as OrderStatus;
  const customer = order.customer as Customer;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/pedidos" className="text-sm text-potinho-texto/60 hover:underline">
        ← voltar pra pedidos
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-6 shadow-potinho-card">
        <div>
          <p className="text-xs uppercase tracking-widest text-potinho-texto/50">
            pedido de {new Date(order.createdAt).toLocaleDateString("pt-BR")} · {order.id}
          </p>
          <p className="text-lg font-bold text-potinho-chocolate">{formatBRL(order.totalAmount)}</p>
        </div>
        <span
          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold lowercase ${STATUS_BADGE_CLASS[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
      </header>

      <OrderActions orderId={order.id} currentStatus={status} trackingCode={order.trackingCode} />

      <section className="rounded-3xl bg-white p-6 shadow-potinho-card">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">cliente</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-potinho-texto/50">nome</dt>
            <dd className="text-potinho-texto">{customer.name}</dd>
          </div>
          <div>
            <dt className="text-potinho-texto/50">e-mail</dt>
            <dd className="text-potinho-texto">{customer.email}</dd>
          </div>
          <div>
            <dt className="text-potinho-texto/50">telefone</dt>
            <dd className="text-potinho-texto">{customer.phone}</dd>
          </div>
          <div>
            <dt className="text-potinho-texto/50">endereço</dt>
            <dd className="text-potinho-texto">
              {customer.address.street}, {customer.address.number}
              {customer.address.complement ? ` · ${customer.address.complement}` : ""} —{" "}
              {customer.address.neighborhood}, {customer.address.city}/{customer.address.state}
            </dd>
          </div>
        </dl>
      </section>

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
                {item.productName} · {item.configuration.size} · {item.configuration.color_base} /{" "}
                {item.configuration.color_band}
              </p>
            </div>
            <span className="font-bold text-potinho-chocolate">{formatBRL(item.unitPrice)}</span>
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-potinho-card">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
          pagamento
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-potinho-texto/50">provedor</dt>
            <dd className="text-potinho-texto">{order.paymentProvider}</dd>
          </div>
          <div>
            <dt className="text-potinho-texto/50">id do gateway</dt>
            <dd className="break-all text-potinho-texto">{order.providerPaymentId ?? "—"}</dd>
          </div>
        </dl>
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
                  <span className="ml-2 text-xs text-potinho-texto/40">{event.actor}</span>
                </span>
                <span className="text-xs text-potinho-texto/50">
                  {new Date(event.createdAt).toLocaleString("pt-BR")}
                </span>
              </li>
            ))}
        </ol>
      </section>
    </div>
  );
}
