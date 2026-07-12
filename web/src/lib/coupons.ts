import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { coupons, getDb } from "@/db";
import type { CouponRow } from "@/db/schema";
import type { CouponDiscountType, OrderConfiguration } from "@/db/types";
import type { PriceInput } from "./pricing";

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Busca um cupom pelo código, ativo ou não — a validade (active/expiração/limite) é checada à parte. */
export async function getCouponByCode(code: string): Promise<CouponRow | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, normalizeCouponCode(code)))
    .limit(1);
  return row ?? null;
}

/** Mensagem específica de por que o cupom não vale agora, ou null se estiver tudo certo (checkout). */
export function couponValidationError(coupon: CouponRow): string | null {
  if (!coupon.active) return "Cupom inválido";
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= Date.now()) return "Esse cupom expirou";
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return "Esse cupom atingiu o limite de usos";
  }
  return null;
}

/**
 * Incrementa o uso do cupom de forma atômica (UPDATE com guarda no WHERE) — evita que dois
 * checkouts simultâneos passem ambos pela checagem de limite antes de qualquer um incrementar
 * (corrida clássica de TOCTOU). Retorna false se o limite acabou de ser atingido por outro pedido.
 */
export async function tryConsumeCoupon(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .update(coupons)
    .set({ usageCount: sql`${coupons.usageCount} + 1` })
    .where(and(eq(coupons.id, id), or(isNull(coupons.usageLimit), lt(coupons.usageCount, coupons.usageLimit))))
    .returning({ id: coupons.id });
  return result.length > 0;
}

export interface DiscountableCartItem {
  product: PriceInput;
  configuration: OrderConfiguration;
}

/** Item já está em promoção quando a variante escolhida (tamanho) tem discountType cadastrado no produto. */
function hasActivePromo(item: DiscountableCartItem): boolean {
  const sizeParam = item.product.paramSchema.find((p) => p.type === "select");
  const chosen = sizeParam?.options.find((o) => o.value === item.configuration[sizeParam.key]);
  const variant = chosen?.variantRef ? item.product.variants.find((v) => v.ref === chosen.variantRef) : undefined;
  return Boolean(variant?.discountType);
}

function discountFor(type: CouponDiscountType | null, value: number | null, base: number): number {
  if (!type || value === null || base <= 0) return 0;
  const raw = type === "percent" ? Math.round((base * value) / 100) : value;
  return Math.min(base, Math.max(0, raw));
}

export interface CouponDiscount {
  productDiscountCents: number;
  shippingDiscountCents: number;
}

/**
 * Calcula o desconto de um cupom sobre o subtotal de produtos e o frete.
 * Lança erro descritivo se o cupom não-cumulativo encontra item já em promoção.
 */
export function applyCoupon(
  coupon: CouponRow,
  items: DiscountableCartItem[],
  itemsSubtotalCents: number,
  shippingCents: number,
): CouponDiscount {
  if (!coupon.cumulative && items.some(hasActivePromo)) {
    throw new Error("Esse cupom não pode ser combinado com itens já em promoção");
  }
  return {
    productDiscountCents: discountFor(coupon.productDiscountType, coupon.productDiscountValue, itemsSubtotalCents),
    shippingDiscountCents: discountFor(coupon.shippingDiscountType, coupon.shippingDiscountValue, shippingCents),
  };
}

/**
 * Distribui o desconto de produto proporcionalmente entre os itens do carrinho, pra que a soma dos
 * unitPrice enviados ao gateway de pagamento (e gravados em order_items) bata exatamente com o total
 * cobrado — nunca esconde o desconto só no agregado. Sobra de arredondamento cai no último item.
 */
export function prorateProductDiscount(unitPricesCents: number[], discountCents: number): number[] {
  if (discountCents <= 0 || unitPricesCents.length === 0) return unitPricesCents;
  const total = unitPricesCents.reduce((sum, p) => sum + p, 0);
  if (total <= 0) return unitPricesCents;

  let remaining = discountCents;
  return unitPricesCents.map((price, i) => {
    if (i === unitPricesCents.length - 1) return Math.max(0, price - remaining);
    const share = Math.min(price, Math.round((price / total) * discountCents));
    remaining -= share;
    return price - share;
  });
}

// --- Admin: CRUD dos cupons ---

export interface CouponInput {
  code: string;
  active: boolean;
  productDiscountType: CouponDiscountType | null;
  productDiscountValue: number | null;
  shippingDiscountType: CouponDiscountType | null;
  shippingDiscountValue: number | null;
  cumulative: boolean;
  /** null = uso ilimitado */
  usageLimit: number | null;
  /** null = sem validade */
  expiresAt: Date | null;
}

function validateCouponInput(input: CouponInput) {
  if (!input.productDiscountType && !input.shippingDiscountType) {
    throw new Error("Configure desconto no produto, no frete, ou nos dois");
  }
  if (input.productDiscountType === "percent" && (input.productDiscountValue ?? 0) > 100) {
    throw new Error("Desconto percentual do produto não pode passar de 100%");
  }
  if (input.shippingDiscountType === "percent" && (input.shippingDiscountValue ?? 0) > 100) {
    throw new Error("Desconto percentual do frete não pode passar de 100%");
  }
  if (input.usageLimit !== null && input.usageLimit < 1) {
    throw new Error("Limite de uso deve ser pelo menos 1 (ou deixe em branco para ilimitado)");
  }
}

export async function listCoupons(): Promise<CouponRow[]> {
  const db = await getDb();
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function createCoupon(input: CouponInput): Promise<CouponRow> {
  validateCouponInput(input);
  const db = await getDb();
  try {
    const [row] = await db
      .insert(coupons)
      .values({ ...input, code: normalizeCouponCode(input.code) })
      .returning();
    return row;
  } catch (err) {
    if (err instanceof Error && /duplicate key|unique constraint/i.test(err.message)) {
      throw new Error("Já existe um cupom com esse código");
    }
    throw err;
  }
}

export async function updateCoupon(id: string, input: CouponInput): Promise<CouponRow> {
  validateCouponInput(input);
  const db = await getDb();
  try {
    const [row] = await db
      .update(coupons)
      .set({ ...input, code: normalizeCouponCode(input.code), updatedAt: new Date() })
      .where(eq(coupons.id, id))
      .returning();
    if (!row) throw new Error("Cupom não encontrado");
    return row;
  } catch (err) {
    if (err instanceof Error && /duplicate key|unique constraint/i.test(err.message)) {
      throw new Error("Já existe um cupom com esse código");
    }
    throw err;
  }
}

export async function deleteCoupon(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(coupons).where(eq(coupons.id, id));
}
