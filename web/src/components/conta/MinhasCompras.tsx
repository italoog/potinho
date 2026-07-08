"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { formatBRL } from "@/lib/money";
import type { OrderRow } from "@/db/schema";
import type { OrderStatus } from "@/db/types";
import type { OrderItemWithProduct } from "@/lib/orders";
import { STATUS_BADGE_CLASS, STATUS_LABEL } from "@/lib/order-status";

interface Props {
  userName: string;
  orders: { order: OrderRow; items: OrderItemWithProduct[] }[];
}

/** /conta logado (7.3 AC2) — lista de pedidos da conta, mais recentes primeiro. */
export default function MinhasCompras({ userName, orders }: Props) {
  async function handleSignOut() {
    await authClient.signOut();
    window.location.href = "/";
  }

  async function handleDeleteAccount() {
    if (!confirm("tem certeza? isso encerra sua conta e desvincula seus pedidos.")) return;
    await fetch("/api/conta/excluir", { method: "POST" });
    await authClient.signOut();
    window.location.href = "/";
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex items-center justify-between rounded-3xl bg-white p-6 shadow-potinho-card">
        <div>
          <p className="text-xs uppercase tracking-widest text-potinho-texto/50">minha conta</p>
          <h1 className="text-xl font-bold lowercase text-potinho-texto">
            oi, {userName.split(" ")[0].toLowerCase()}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          data-testid="conta-sair"
          className="rounded-full border-2 border-potinho-bege px-4 py-2 text-sm font-semibold lowercase text-potinho-chocolate hover:bg-potinho-fundo"
        >
          sair
        </button>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-potinho-card">
          <p className="text-sm text-potinho-texto/60">você ainda não tem pedidos por aqui.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map(({ order, items }) => {
            const status = order.status as OrderStatus;
            const swatches = items[0]
              ? [items[0].configuration.color_base, items[0].configuration.color_band]
              : [];
            return (
              <li key={order.id}>
                <Link
                  href={`/conta/pedidos/${order.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-potinho-card"
                >
                  <div className="flex -space-x-1">
                    {swatches.map((hex, i) => (
                      <span
                        key={i}
                        className="h-8 w-8 rounded-full ring-1 ring-potinho-cinza/40"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold uppercase tracking-wider text-potinho-texto">
                      {items.map((i) => i.configuration.pet_name).join(", ")}
                    </p>
                    <p className="text-xs text-potinho-texto/60">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold lowercase ${STATUS_BADGE_CLASS[status]}`}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                  <span className="font-bold text-potinho-chocolate">{formatBRL(order.totalAmount)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={handleDeleteAccount}
        className="self-center text-xs text-potinho-texto/40 underline hover:text-rose-500"
      >
        excluir minha conta
      </button>
    </div>
  );
}
