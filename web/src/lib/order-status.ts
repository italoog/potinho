import type { OrderEventType, OrderStatus } from "@/db/types";

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

/** Transições válidas de status (9.3 AC3) — progressão só pra frente + cancelamento; terminais não saem. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "canceled"],
  paid: ["production", "canceled"],
  production: ["shipped", "canceled"],
  shipped: ["delivered"],
  delivered: [],
  canceled: [],
};

/** Rótulos da linha do tempo de order_events — usado em /conta e /admin. */
export const EVENT_LABEL: Partial<Record<OrderEventType, string>> = {
  created: "pedido recebido",
  paid: "pagamento confirmado",
  status_changed: "status atualizado",
  label_created: "etiqueta de envio gerada",
  payment_rejected: "pagamento recusado",
  refunded: "pagamento estornado",
};
