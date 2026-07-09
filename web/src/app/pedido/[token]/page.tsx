import Image from "next/image";
import { notFound } from "next/navigation";
import { getOrderByToken } from "@/lib/orders";
import { formatBRL } from "@/lib/money";
import type { OrderEventType } from "@/db/types";
import { EVENT_LABEL, STATUS_BADGE_CLASS, STATUS_LABEL } from "@/lib/order-status";

export const metadata = { title: "seu pedido — potinho", robots: { index: false } };

/** Página de status por link único, sem login (P-07). */

export default async function OrderStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getOrderByToken(token).catch(() => null);
  if (!result) notFound();
  const { order, items, events } = result;
  const address = order.customer.address;

  return (
    <main className="min-h-screen bg-potinho-fundo px-4 pb-10 pt-24 font-[family-name:var(--font-poppins)] text-potinho-texto sm:pb-16">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="rounded-3xl bg-white p-6 text-center shadow-potinho-card sm:p-8">
          <p className="text-xs uppercase tracking-widest text-potinho-texto/50">
            pedido de {new Date(order.createdAt).toLocaleDateString("pt-BR")}
          </p>
          <h1 className="mt-2 text-2xl font-bold lowercase text-potinho-chocolate sm:text-3xl">
            {order.status === "pending" ? "pedido recebido" : "pedido confirmado 🎉"}
          </h1>
          <span
            className={`mt-3 inline-block rounded-full px-4 py-1.5 text-xs font-semibold lowercase ${STATUS_BADGE_CLASS[order.status]}`}
          >
            {STATUS_LABEL[order.status]}
          </span>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-potinho-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
            linha do tempo
          </h2>
          <ol className="flex flex-col gap-3">
            {events
              .filter((e) => e.type in EVENT_LABEL)
              .map((event) => (
                <li key={event.id} className="flex items-center justify-between text-sm">
                  <span className="text-potinho-texto/80">{EVENT_LABEL[event.type as OrderEventType]}</span>
                  <span className="text-xs text-potinho-texto/50">
                    {new Date(event.createdAt).toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
          </ol>
        </section>

        <section className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-potinho-card">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">itens</h2>
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-4 border-t border-potinho-bege pt-4 first:border-0 first:pt-0 sm:flex-row">
              {item.snapshotUrl && (
                <Image
                  src={item.snapshotUrl}
                  alt="Seu produto personalizado"
                  width={160}
                  height={160}
                  unoptimized
                  className="h-32 w-full rounded-2xl object-cover sm:h-24 sm:w-24"
                />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-bold lowercase text-potinho-chocolate">{item.productName}</h3>
                <dl className="mt-2 space-y-1.5 text-sm">
                  {item.paramSchema.map((param) => {
                    const v = item.configuration[param.key];
                    if (v === undefined) return null;
                    const colorName =
                      param.type === "color"
                        ? param.options.find((o) => o.hex.toLowerCase() === v.toLowerCase())?.label
                        : undefined;
                    const selectLabel =
                      param.type === "select" ? param.options.find((o) => o.value === v)?.label : undefined;
                    return (
                      <div key={param.key} className="flex items-center justify-between">
                        <dt className="lowercase text-potinho-texto/60">{param.label}</dt>
                        <dd
                          className={`flex items-center gap-2 font-semibold text-potinho-texto ${
                            param.key === "pet_name" ? "uppercase tracking-widest" : "lowercase"
                          }`}
                        >
                          {param.type === "color" && (
                            <span
                              className="h-4 w-4 rounded-full ring-1 ring-potinho-cinza/40"
                              style={{ backgroundColor: v }}
                            />
                          )}
                          {param.type === "color"
                            ? (colorName ?? "cor personalizada")
                            : (selectLabel ?? v)}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
              <span className="font-bold text-potinho-chocolate">{formatBRL(item.unitPrice)}</span>
            </div>
          ))}

          <div className="flex justify-between border-t border-potinho-bege pt-4 text-sm">
            <dt className="text-potinho-texto/60">frete</dt>
            <dd className="font-semibold text-potinho-texto">{formatBRL(order.shippingAmount)}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="font-semibold uppercase tracking-widest text-potinho-chocolate">total</dt>
            <dd className="text-lg font-bold text-potinho-chocolate">{formatBRL(order.totalAmount)}</dd>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-potinho-card">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
            endereço de entrega
          </h2>
          <p className="text-sm text-potinho-texto/80">
            {address.street}, {address.number}
            {address.complement ? ` · ${address.complement}` : ""} — {address.neighborhood}, {address.city}/
            {address.state} — cep {address.zip}
          </p>

          <h2 className="mb-1 mt-4 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
            rastreio
          </h2>
          {order.trackingCode ? (
            <a
              href={`https://rastreamento.correios.com.br/app/index.php?objeto=${order.trackingCode}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-potinho-chocolate underline"
            >
              {order.trackingCode}
            </a>
          ) : (
            <p className="text-sm text-potinho-texto/60">ainda não disponível — avisamos por e-mail assim que ele sair pra entrega.</p>
          )}
        </section>

        <p className="text-center text-xs text-potinho-texto/60">
          Guarde este link para acompanhar seu pedido. Dúvidas? Responda o e-mail de confirmação.
        </p>
        <p className="text-center text-xs">
          <a href="/conta" className="text-potinho-texto/60 underline hover:text-potinho-chocolate">
            criar conta para acompanhar seus pedidos
          </a>
        </p>
      </div>
    </main>
  );
}
