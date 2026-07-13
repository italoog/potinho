import {
  boolean,
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
  CouponDiscountType,
  OrderConfiguration,
  OrderEventType,
  OrderStatus,
  PaymentProvider,
  ProductParamSchema,
  ProductStatus,
  UserRole,
  Variant,
} from "./types";

/**
 * Tabelas do Better Auth (7.1) — nomes/campos conferidos manualmente contra os
 * schemas zod internos do pacote (node_modules/@better-auth/core/dist/db/schema/*),
 * já que a CLI de geração não pôde ser executada neste ambiente. `usePlural: true`
 * no drizzleAdapter (web/src/lib/auth.ts) mapeia os nomes de modelo singulares
 * (user/session/account/verification) para estas tabelas plurais (R6).
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    /** 'customer'|'admin' — promovido automaticamente via ADMIN_EMAILS no login (A2) */
    role: text("role").$type<UserRole>().notNull().default("customer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sessions_token_idx").on(t.token), index("sessions_user_idx").on(t.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull(),
    accountId: text("account_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("accounts_user_idx").on(t.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

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
    /** Vínculo opcional com a conta (7.1/7.3) — guest checkout continua com userId NULL */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Snapshot do código do cupom usado (se houver) — não é FK: histórico sobrevive mesmo se o cupom for apagado */
    couponCode: text("coupon_code"),
    /** Total descontado em centavos (produto + frete) — já embutido em totalAmount/shippingAmount */
    discountAmount: integer("discount_amount").notNull().default(0),
    /** CPF/CNPJ do destinatário — exigido pela SuperFrete pra gerar etiqueta, coletado pelo admin na hora de gerar (não no checkout público) */
    recipientDocument: text("recipient_document"),
    /** ID do pedido no carrinho da SuperFrete — criado em "cotar etiqueta", consumido em "comprar etiqueta" */
    shippingOrderId: text("shipping_order_id"),
    /** URL do PDF da etiqueta, depois de comprada */
    shippingLabelUrl: text("shipping_label_url"),
    /** Quanto foi cobrado da carteira SuperFrete pela etiqueta, em centavos (pode diferir da cotação do checkout) */
    shippingLabelPriceCents: integer("shipping_label_price_cents"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("orders_provider_payment_idx").on(t.providerPaymentId),
    uniqueIndex("orders_public_token_idx").on(t.publicToken),
    index("orders_status_idx").on(t.status),
    index("orders_created_at_idx").on(t.createdAt),
    index("orders_user_idx").on(t.userId),
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
    /** Preenchido quando o admin dispara "avisar todos" pra essa cor (9.5 AC3) */
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("notify_requests_email_color_idx").on(t.email, t.colorId)],
);

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    active: boolean("active").notNull().default(true),
    /** null = cupom não desconta o subtotal dos produtos */
    productDiscountType: text("product_discount_type").$type<CouponDiscountType | null>(),
    /** percent: 0-100. flat: centavos. */
    productDiscountValue: integer("product_discount_value"),
    /** null = cupom não desconta o frete */
    shippingDiscountType: text("shipping_discount_type").$type<CouponDiscountType | null>(),
    shippingDiscountValue: integer("shipping_discount_value"),
    /** Se falso, o cupom é recusado quando algum item do carrinho já tem desconto de variante ativo */
    cumulative: boolean("cumulative").notNull().default(false),
    /** null = uso ilimitado. Caso contrário, cupom para de valer quando usageCount atinge esse número. */
    usageLimit: integer("usage_limit"),
    /** Quantas vezes o cupom já foi usado em pedidos — incrementado atomicamente na criação do pedido. */
    usageCount: integer("usage_count").notNull().default(0),
    /** null = sem validade. Cupom para de valer a partir desse instante. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("coupons_code_idx").on(t.code)],
);

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
export type OrderRow = typeof orders.$inferSelect;
export type NewOrderRow = typeof orders.$inferInsert;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type NewOrderItemRow = typeof orderItems.$inferInsert;
export type OrderEventRow = typeof orderEvents.$inferSelect;
export type NewOrderEventRow = typeof orderEvents.$inferInsert;
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type NotifyRequestRow = typeof notifyRequests.$inferSelect;
export type NewNotifyRequestRow = typeof notifyRequests.$inferInsert;
export type CouponRow = typeof coupons.$inferSelect;
export type NewCouponRow = typeof coupons.$inferInsert;
