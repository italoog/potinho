import type { OrderStatus } from "@/db/types";

/** Rótulos e cores de status no tom da marca (7.3 AC5) — usado em /conta e no detalhe do pedido. */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "aguardando pagamento",
  paid: "pago — já vai pra impressão",
  production: "sendo impresso",
  shipped: "a caminho",
  delivered: "chegou! 🐾",
  canceled: "cancelado",
};

export const STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  pending: "bg-potinho-bege text-potinho-chocolate",
  paid: "bg-potinho-chocolate text-potinho-bege",
  production: "bg-potinho-chocolate text-potinho-bege",
  shipped: "bg-sky-100 text-sky-700",
  delivered: "bg-emerald-100 text-emerald-700",
  canceled: "bg-zinc-200 text-zinc-600",
};
