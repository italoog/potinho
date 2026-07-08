import { getDb, orderItems, orders } from "@/db";
import type { OrderRow } from "@/db/schema";
import type { Customer, OrderConfiguration } from "@/db/types";
import { getProductById } from "./products";
import { validateCartItems, type CartItemInput } from "./pricing";
import { shippingCentsFor } from "./shipping";
import { decodePngDataUrl, storeFile } from "./storage";
import { recordOrderEvent } from "./order-events";
import { linkOrderToAccountIfExists } from "./orders";

export interface CreateOrderItemInput {
  productId: string;
  configuration: Record<string, string>;
  snapshotDataUrl?: string;
}

export interface CreateOrderInput {
  items: CreateOrderItemInput[];
  customer: Customer;
  /** Sobrescreve a cotação automática (9.4 AC1) — admin pode digitar o frete manualmente. */
  shippingCentsOverride?: number;
}

export interface CreatedOrderItem {
  productName: string;
  configuration: OrderConfiguration;
  unitPrice: number;
}

export interface CreateOrderResult {
  order: OrderRow;
  shippingCents: number;
  items: CreatedOrderItem[];
}

async function storeSnapshot(dataUrl: string | undefined): Promise<string | null> {
  if (!dataUrl) return null;
  try {
    const png = decodePngDataUrl(dataUrl);
    const stored = await storeFile(`snapshots/${crypto.randomUUID()}.png`, png, "image/png");
    return stored.url;
  } catch (err) {
    console.warn("Snapshot descartado:", err);
    return null;
  }
}

/**
 * Cria o pedido (1..N itens) com preço SEMPRE recalculado no servidor (NFR §6) —
 * usado pelo checkout público (6.1) e pela criação manual do admin (9.4 AC3),
 * a mesma validação pros dois: o front nunca manda preço.
 */
export async function createOrderFromCart(input: CreateOrderInput, actor: string): Promise<CreateOrderResult> {
  const products = await Promise.all(input.items.map((item) => getProductById(item.productId)));
  const missing = products.some((p) => !p || p.status !== "published");
  if (missing) throw new Error("Produto indisponível");

  const cartInputs: CartItemInput[] = input.items.map((item, i) => ({
    product: products[i]!,
    configuration: item.configuration,
  }));
  const validated = validateCartItems(cartInputs);

  const packages = validated
    .map((v, i) => products[i]!.variants.find((variant) => variant.ref === v.configuration.size)?.shipping)
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const shippingCents =
    input.shippingCentsOverride ??
    (await shippingCentsFor(input.customer.address.zip, input.customer.address.state, packages));

  const itemsTotal = validated.reduce((sum, v) => sum + v.unitPrice, 0);
  const total = itemsTotal + shippingCents;

  const snapshotUrls = await Promise.all(input.items.map((item) => storeSnapshot(item.snapshotDataUrl)));

  const db = await getDb();
  const [order] = await db
    .insert(orders)
    .values({ totalAmount: total, shippingAmount: shippingCents, customer: input.customer })
    .returning();

  await db.insert(orderItems).values(
    validated.map((v, i) => ({
      orderId: order.id,
      productId: products[i]!.id,
      configuration: v.configuration,
      unitPrice: v.unitPrice,
      snapshotUrl: snapshotUrls[i],
    })),
  );
  await recordOrderEvent(order.id, "created", actor, { itemCount: validated.length });
  await linkOrderToAccountIfExists(order.id, input.customer.email);

  return {
    order,
    shippingCents,
    items: validated.map((v, i) => ({
      productName: products[i]!.name,
      configuration: v.configuration,
      unitPrice: v.unitPrice,
    })),
  };
}
