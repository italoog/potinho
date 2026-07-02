/**
 * Valores monetários trafegam SEMPRE em centavos (inteiro) — PRD §6:
 * o preço final é recalculado no backend, nunca aceito do front.
 */

export function formatBRL(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error(`Valor monetário deve ser inteiro em centavos, recebido: ${cents}`);
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
