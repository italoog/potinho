import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  Customer,
  OrderConfiguration,
  OrderEventType,
  OrderStatus,
  PaymentProvider,
  ProductParamSchema,
  ProductStatus,
  Variant,
} from "./types";

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    photos: jsonb("photos").$type<string[]>().notNull().default([]),
    /** Preço base em centavos — dinheiro é sempre inteiro */
    basePrice: integer("base_price").notNull(),
    status: text("status").$type<ProductStatus>().notNull().default("draft"),
    variants: jsonb("variants").$type<Variant[]>().notNull(),
    paramSchema: jsonb("param_schema").$type<ProductParamSchema>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("products_slug_idx").on(t.slug), index("products_status_idx").on(t.status)],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Token opaco para a página pública de status (P-07) — sem login */
    publicToken: uuid("public_token").notNull().defaultRandom(),
    status: text("status").$type<OrderStatus>().notNull().default("pending"),
    /** Gateway que processou (ou vai processar) o pagamento — Mercado Pago é o principal, Stripe fica redundante/desativado */
    paymentProvider: text("payment_provider").$type<PaymentProvider>().notNull().default("mercadopago"),
    /** ID da sessão/preferência no gateway (Stripe session id ou Mercado Pago preference/payment id) */
    providerPaymentId: text("provider_payment_id"),
    /** Total cobrado em centavos (todos os itens + frete) — recalculado no servidor (NFR §6) */
    totalAmount: integer("total_amount").notNull(),
    shippingAmount: integer("shipping_amount").notNull().default(0),
    customer: jsonb("customer").$type<Customer>().notNull(),
    trackingCode: text("tracking_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("orders_provider_payment_idx").on(t.providerPaymentId),
    uniqueIndex("orders_public_token_idx").on(t.publicToken),
    index("orders_status_idx").on(t.status),
    index("orders_created_at_idx").on(t.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    /** Configuração IMUTÁVEL do item (P-03) — nunca sofre UPDATE */
    configuration: jsonb("configuration").$type<OrderConfiguration>().notNull(),
    /** Preço unitário em centavos recalculado no servidor no momento da compra */
    unitPrice: integer("unit_price").notNull(),
    snapshotUrl: text("snapshot_url"),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** 'created'|'paid'|'status_changed'|'label_created'|'email_sent'|'payment_rejected'|'refunded' */
    type: text("type").$type<OrderEventType>().notNull(),
    data: jsonb("data").$type<Record<string, unknown>>(),
    /** 'system'|'webhook'|e-mail do admin — quem causou a transição */
    actor: text("actor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_events_order_created_idx").on(t.orderId, t.createdAt)],
);

export const notifyRequests = pgTable(
  "notify_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    /** Hex da cor esgotada (fonte: colorOptionSchema do produto) */
    colorId: text("color_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("notify_requests_email_color_idx").on(t.email, t.colorId)],
);

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
export type OrderRow = typeof orders.$inferSelect;
export type NewOrderRow = typeof orders.$inferInsert;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type NewOrderItemRow = typeof orderItems.$inferInsert;
export type OrderEventRow = typeof orderEvents.$inferSelect;
export type NewOrderEventRow = typeof orderEvents.$inferInsert;
export type NotifyRequestRow = typeof notifyRequests.$inferSelect;
export type NewNotifyRequestRow = typeof notifyRequests.$inferInsert;
