import type { ProductParamSchema, Variant } from "@/db/types";

/**
 * Carrinho real (sessionStorage) compartilhado entre a home ("monte o seu potinho")
 * e a página de produto (/p/[slug]) — ambos alimentam o mesmo /checkout.
 * Cada item carrega os dados do produto só para PREVIEW de preço no client;
 * o servidor sempre revalida productId + configuration (NFR §6, pricing.ts).
 */
export interface CartCheckoutItem {
  productId: string;
  productSlug: string;
  productName: string;
  basePrice: number;
  variants: Variant[];
  paramSchema: ProductParamSchema;
  configuration: Record<string, string>;
  snapshotDataUrl?: string;
}

const KEY = "forja3d:checkout-cart";

export function readCart(): CartCheckoutItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartCheckoutItem[]): void {
  sessionStorage.setItem(KEY, JSON.stringify(items));
}

export function clearCart(): void {
  sessionStorage.removeItem(KEY);
}
