import type { TextParam } from "@/db/types";

/**
 * Validação do texto personalizado (V-05): limites + whitelist de caracteres.
 * `supportsChar` injeta a cobertura real da fonte (glifos) quando disponível no client;
 * no server usamos a whitelist estática.
 */

// Letras latinas (com acentos pt-BR), dígitos e espaço — interseção segura Anton/Impact
const SAFE_CHARS = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9 ]+$/;

export interface TextValidationResult {
  ok: boolean;
  /** valor normalizado (trim + MAIÚSCULAS, como a gravação) */
  value: string;
  error?: string;
}

export function validateCustomText(
  input: string,
  param: Pick<TextParam, "min" | "max" | "label">,
  supportsChar?: (char: string) => boolean,
): TextValidationResult {
  const value = input.trim().toUpperCase();

  if (value.length === 0) {
    return { ok: false, value, error: `Digite o ${param.label.toLowerCase()}` };
  }
  if (value.length < param.min) {
    return { ok: false, value, error: `Mínimo de ${param.min} caracteres` };
  }
  if (value.length > param.max) {
    return { ok: false, value, error: `Máximo de ${param.max} caracteres` };
  }
  if (!SAFE_CHARS.test(value)) {
    return {
      ok: false,
      value,
      error: "Use apenas letras, números e espaço (emojis e símbolos não podem ser gravados)",
    };
  }
  if (supportsChar) {
    const unsupported = [...value].find((c) => c !== " " && !supportsChar(c));
    if (unsupported) {
      return {
        ok: false,
        value,
        error: `O caractere "${unsupported}" não está disponível nesta fonte`,
      };
    }
  }
  return { ok: true, value };
}
