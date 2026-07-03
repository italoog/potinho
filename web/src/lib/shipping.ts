/**
 * Frete simplificado do MVP (P-06): tabela por região (prefixo de UF) + valor padrão.
 * Configurável por env sem código: SHIPPING_TABLE_JSON='{"SP":1500,"RJ":1800,"*":2500}'
 */

const DEFAULT_TABLE: Record<string, number> = { "*": 2000 };

export function shippingForState(uf: string): number {
  let table = DEFAULT_TABLE;
  const raw = process.env.SHIPPING_TABLE_JSON;
  if (raw) {
    try {
      table = JSON.parse(raw);
    } catch {
      table = DEFAULT_TABLE;
    }
  }
  const key = uf.toUpperCase();
  const value = table[key] ?? table["*"] ?? 0;
  if (!Number.isInteger(value) || value < 0) return 0;
  return value;
}
