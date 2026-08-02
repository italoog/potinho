"use client";

import { useEffect, useState } from "react";
import { trackMetaPixel } from "@/lib/meta-pixel";
import type { OrderStatus } from "@/db/types";

const PAID_STATUSES: OrderStatus[] = ["paid", "production", "shipped", "delivered"];

/** Intervalo e teto do polling (P-07): o webhook do Mercado Pago costuma chegar em poucos segundos —
 * 8 tentativas de 3s (24s) cobre a maioria dos casos sem sobrecarregar o Postgres (Neon free tier). */
const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_ATTEMPTS = 8;

/**
 * Dispara o evento Purchase uma única vez por pedido (dedupe via localStorage).
 * Se o pedido ainda está "pending" ao carregar (o navegador voltou do Mercado Pago antes do
 * webhook confirmar o pagamento nesse servidor), faz polling curto do status até confirmar.
 */
export default function OrderPurchaseTracker({
  orderId,
  token,
  status,
  totalAmountCents,
}: {
  orderId: string;
  token: string;
  status: OrderStatus;
  totalAmountCents: number;
}) {
  const [currentStatus, setCurrentStatus] = useState(status);

  useEffect(() => {
    if (PAID_STATUSES.includes(currentStatus)) {
      const key = `fb_purchase_${orderId}`;
      if (localStorage.getItem(key)) return;
      trackMetaPixel(
        "Purchase",
        { value: totalAmountCents / 100, currency: "BRL", content_ids: [orderId], content_type: "product" },
        orderId,
      );
      localStorage.setItem(key, "1");
      return;
    }

    if (currentStatus !== "pending") return; // "canceled" — nunca vai virar pago

    let attempts = 0;
    let cancelled = false;
    const timer = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/pedido/${token}/status`);
        if (res.ok) {
          const data: { status: OrderStatus } = await res.json();
          if (!cancelled) setCurrentStatus(data.status);
        }
      } catch {
        // falha de rede pontual — tenta de novo no próximo tick
      }
      if (attempts >= MAX_POLL_ATTEMPTS) clearInterval(timer);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [orderId, token, currentStatus, totalAmountCents]);

  return null;
}
