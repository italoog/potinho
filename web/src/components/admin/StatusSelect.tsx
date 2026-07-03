"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@/db/types";

/** Fluxo de status do pedido (D-04): Pago → Em produção → Enviado → Entregue. */

const OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "paid", label: "Pago" },
  { value: "production", label: "Em produção" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregue" },
  { value: "canceled", label: "Cancelado" },
];

export default function StatusSelect({
  orderId,
  current,
  trackingCode,
}: {
  orderId: string;
  current: OrderStatus;
  trackingCode: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function update(status: OrderStatus) {
    setBusy(true);
    let tracking: string | null = trackingCode;
    if (status === "shipped" && !tracking) {
      tracking = window.prompt("Código de rastreio (opcional):") || null;
    }
    await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, trackingCode: tracking }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <select
      value={current}
      disabled={busy || current === "pending"}
      onChange={(e) => update(e.target.value as OrderStatus)}
      className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900"
    >
      {current === "pending" && <option value="pending">Aguardando pgto</option>}
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
