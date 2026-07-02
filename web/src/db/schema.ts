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
  OrderStatus,
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
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    status: text("status").$type<OrderStatus>().notNull().default("pending"),
    stripeSessionId: text("stripe_session_id"),
    /** Total cobrado em centavos — recalculado no servidor (NFR §6) */
    totalAmount: integer("total_amount").notNull(),
    shippingAmount: integer("shipping_amount").notNull().default(0),
    customer: jsonb("customer").$type<Customer>().notNull(),
    /** Configuração IMUTÁVEL do pedido (P-03) — nunca sofre UPDATE */
    configuration: jsonb("configuration").$type<OrderConfiguration>().notNull(),
    snapshotUrl: text("snapshot_url"),
    trackingCode: text("tracking_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("orders_stripe_session_idx").on(t.stripeSessionId),
    uniqueIndex("orders_public_token_idx").on(t.publicToken),
    index("orders_status_idx").on(t.status),
    index("orders_created_at_idx").on(t.createdAt),
  ],
);

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
export type OrderRow = typeof orders.$inferSelect;
export type NewOrderRow = typeof orders.$inferInsert;
