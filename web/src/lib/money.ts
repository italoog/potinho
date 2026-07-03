/**
 * Valores monetários trafegam SEMPRE em centavos (inteiro) — PRD §6:
 * o preço final é recalculado no backend, nunca aceito do front.
 */

/** Escurece uma cor hex (fator 0–1) — usado para simular gravação negativa no 3D */
export function darkenHex(hex: string, factor = 0.45): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#4a4a4a";
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 0xff) * (1 - factor));
  const g = Math.round(((n >> 8) & 0xff) * (1 - factor));
  const b = Math.round((n & 0xff) * (1 - factor));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function formatBRL(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new Error(`Valor monetário deve ser inteiro em centavos, recebido: ${cents}`);
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
