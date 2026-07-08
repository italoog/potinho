import type { ProductParamSchema, OrderConfiguration, Variant } from "@/db/types";

/**
 * Cálculo de preço — função PURA usada pelo preview (client) e pelo checkout (server).
 * O servidor SEMPRE recalcula com esta função; o valor do front nunca é cobrado (PRD §6, risco #4).
 */
export interface PriceInput {
  basePrice: number;
  variants: Variant[];
  paramSchema: ProductParamSchema;
}

export function calculateTotalCents(product: PriceInput, configuration: OrderConfiguration): number {
  let total = product.basePrice;

  for (const param of product.paramSchema) {
    if (param.type !== "select") continue;
    const chosen = configuration[param.key];
    if (chosen === undefined) continue;
    const option = param.options.find((o) => o.value === chosen);
    if (!option) {
      throw new Error(`Opção inválida para "${param.key}": ${chosen}`);
    }
    total += option.priceDelta;
    if (option.variantRef) {
      const variant = product.variants.find((v) => v.ref === option.variantRef);
      if (!variant) {
        throw new Error(`Variante inexistente: ${option.variantRef}`);
      }
      total += variant.priceDelta;
    }
  }
  return total;
}

/**
 * Valida a configuração completa contra o schema (server-side em toda submissão).
 * Retorna a configuração normalizada (só chaves conhecidas) ou lança erro descritivo.
 */
export function validateConfiguration(
  product: PriceInput,
  raw: Record<string, unknown>,
): OrderConfiguration {
  const clean: OrderConfiguration = {};
  for (const param of product.paramSchema) {
    const value = raw[param.key];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`Parâmetro obrigatório ausente: ${param.label}`);
    }
    switch (param.type) {
      case "text": {
        const trimmed = value.trim().toUpperCase();
        if (trimmed.length < param.min || trimmed.length > param.max) {
          throw new Error(`${param.label}: entre ${param.min} e ${param.max} caracteres`);
        }
        clean[param.key] = trimmed;
        break;
      }
      case "color": {
        if (!param.options.some((o) => o.hex.toUpperCase() === value.toUpperCase())) {
          throw new Error(`${param.label}: cor fora da paleta`);
        }
        clean[param.key] = value.toUpperCase();
        break;
      }
      case "select": {
        if (!param.options.some((o) => o.value === value)) {
          throw new Error(`${param.label}: opção inválida`);
        }
        clean[param.key] = value;
        break;
      }
    }
  }
  return clean;
}

/** Um item do carrinho antes da validação server-side. */
export interface CartItemInput {
  product: PriceInput;
  configuration: Record<string, unknown>;
}

/** Valida cada item do carrinho contra o schema do SEU produto e soma o total (carrinho multi-item). */
export function validateCartItems(
  items: CartItemInput[],
): { configuration: OrderConfiguration; unitPrice: number }[] {
  if (items.length === 0) throw new Error("Carrinho vazio");
  return items.map(({ product, configuration }) => {
    const clean = validateConfiguration(product, configuration);
    return { configuration: clean, unitPrice: calculateTotalCents(product, clean) };
  });
}
