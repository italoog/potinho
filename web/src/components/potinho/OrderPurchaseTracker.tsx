"use client";

import { useEffect } from "react";
import { trackMetaPixel } from "@/lib/meta-pixel";
import type { OrderStatus } from "@/db/types";

const PAID_STATUSES: OrderStatus[] = ["paid", "production", "shipped", "delivered"];

/** Dispara o evento Purchase uma única vez por pedido (dedupe via localStorage) — a página de status é revisitável a qualquer momento. */
export default function OrderPurchaseTracker({
  orderId,
  status,
  totalAmountCents,
}: {
  orderId: string;
  status: OrderStatus;
  totalAmountCents: number;
}) {
  useEffect(() => {
    if (!PAID_STATUSES.includes(status)) return;
    const key = `fb_purchase_${orderId}`;
    if (localStorage.getItem(key)) return;
    trackMetaPixel(
      "Purchase",
      { value: totalAmountCents / 100, currency: "BRL", content_ids: [orderId], content_type: "product" },
      orderId,
    );
    localStorage.setItem(key, "1");
  }, [orderId, status, totalAmountCents]);

  return null;
}
