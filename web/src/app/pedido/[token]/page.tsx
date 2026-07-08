import Image from "next/image";
import { notFound } from "next/navigation";
import { getOrderByToken } from "@/lib/orders";
import { formatBRL } from "@/lib/money";
import type { OrderStatus } from "@/db/types";

export const metadata = { title: "Seu pedido — Forja3D", robots: { index: false } };

/** Página de status por link único, sem login (P-07). */

const STATUS_STEPS: { key: OrderStatus; label: string }[] = [
  { key: "paid", label: "Pago" },
  { key: "production", label: "Em produção" },
  { key: "shipped", label: "Enviado" },
  { key: "delivered", label: "Entregue" },
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago — na fila de produção",
  production: "Em produção 🖨️",
  shipped: "Enviado 📦",
  delivered: "Entregue 🎉",
  canceled: "Cancelado",
};

export default async function OrderStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getOrderByToken(token).catch(() => null);
  if (!result) notFound();
  const { order, items } = result;

  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">
            {order.status === "pending" ? "Pedido recebido" : "Pedido confirmado 🎉"}
          </h1>
          <p className="mt-1 text-zinc-600">{STATUS_LABEL[order.status]}</p>
        </header>

        {order.status !== "pending" && order.status !== "canceled" && (
          <ol className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
            {STATUS_STEPS.map((step, i) => (
              <li key={step.key} className="flex flex-1 flex-col items-center gap-1 text-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    i <= currentIndex ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-500"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`text-xs ${i <= currentIndex ? "text-zinc-900" : "text-zinc-400"}`}>
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        )}

        <section className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white p-5 shadow-sm">
              {item.snapshotUrl && (
                <Image
                  src={item.snapshotUrl}
                  alt="Seu produto personalizado"
                  width={640}
                  height={480}
                  className="mb-4 w-full rounded-xl"
                  unoptimized
                />
              )}
              <h2 className="mb-2 font-semibold text-zinc-900">{item.productName}</h2>
              <dl className="space-y-1 text-sm">
                {Object.entries(item.configuration).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-zinc-500">{k}</dt>
                    <dd className="font-medium text-zinc-900">{v}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t border-zinc-100 pt-2">
                  <dt className="text-zinc-600">Preço</dt>
                  <dd className="font-bold text-zinc-900">{formatBRL(item.unitPrice)}</dd>
                </div>
              </dl>
            </div>
          ))}

          <div className="flex justify-between rounded-2xl bg-white p-5 text-sm shadow-sm">
            <dt className="text-zinc-600">Total (com frete)</dt>
            <dd className="font-bold text-zinc-900">{formatBRL(order.totalAmount)}</dd>
          </div>

          {order.trackingCode && (
            <p className="rounded-xl bg-zinc-100 px-4 py-3 text-sm">
              Código de rastreio: <strong>{order.trackingCode}</strong>
            </p>
          )}
        </section>

        <p className="text-center text-xs text-zinc-500">
          Guarde este link para acompanhar seu pedido. Dúvidas? Responda o e-mail de confirmação.
        </p>
      </div>
    </main>
  );
}
