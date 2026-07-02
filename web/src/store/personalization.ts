"use client";

import { create } from "zustand";
import type { ProductParamSchema, Variant } from "@/db/types";
import { calculateTotalCents, type PriceInput } from "@/lib/pricing";

/**
 * Fonte única de verdade da personalização (ADR-005).
 * Alimenta: visualizador 3D, preço ao vivo, snapshot e payload do checkout.
 */

interface PersonalizationState {
  product: PriceInput | null;
  values: Record<string, string>;
  /** erros de validação por chave de parâmetro */
  errors: Record<string, string | undefined>;
  init: (product: PriceInput) => void;
  setValue: (key: string, value: string) => void;
  setError: (key: string, error: string | undefined) => void;
}

function defaultsFor(schema: ProductParamSchema): Record<string, string> {
  const values: Record<string, string> = {};
  for (const param of schema) {
    switch (param.type) {
      case "text":
        values[param.key] = "";
        break;
      case "color":
        values[param.key] = param.options[0].hex;
        break;
      case "select":
        values[param.key] = param.options[0].value;
        break;
    }
  }
  return values;
}

export const usePersonalization = create<PersonalizationState>((set) => ({
  product: null,
  values: {},
  errors: {},
  init: (product) =>
    set({ product, values: defaultsFor(product.paramSchema), errors: {} }),
  setValue: (key, value) => set((s) => ({ values: { ...s.values, [key]: value } })),
  setError: (key, error) => set((s) => ({ errors: { ...s.errors, [key]: error } })),
}));

/** Variante ativa (parâmetro select com variantRef) — define qual GLB carregar (V-04) */
export function selectActiveVariant(s: PersonalizationState): Variant | null {
  if (!s.product) return null;
  for (const param of s.product.paramSchema) {
    if (param.type !== "select") continue;
    const chosen = param.options.find((o) => o.value === s.values[param.key]);
    if (chosen?.variantRef) {
      return s.product.variants.find((v) => v.ref === chosen.variantRef) ?? null;
    }
  }
  return s.product.variants[0] ?? null;
}

/** Mapa meshName → hex a partir dos parâmetros de cor (V-03) */
export function selectMeshColors(s: PersonalizationState): Record<string, string> {
  const map: Record<string, string> = {};
  if (!s.product) return map;
  for (const param of s.product.paramSchema) {
    if (param.type !== "color") continue;
    const hex = s.values[param.key];
    if (!hex) continue;
    for (const target of param.targets) {
      map[target] = hex;
    }
  }
  return map;
}

/** Texto do nome (primeiro parâmetro text do schema) */
export function selectCustomText(s: PersonalizationState): { value: string; anchor: string } | null {
  if (!s.product) return null;
  const param = s.product.paramSchema.find((p) => p.type === "text");
  if (!param || param.type !== "text") return null;
  return { value: (s.values[param.key] ?? "").trim().toUpperCase(), anchor: param.anchor };
}

/** Preço total ao vivo (C-03) — o servidor recalcula com a MESMA função no checkout */
export function selectTotalCents(s: PersonalizationState): number | null {
  if (!s.product) return null;
  try {
    return calculateTotalCents(s.product, s.values);
  } catch {
    return null;
  }
}

/** Configuração pronta para envio ao checkout (P-03) */
export function selectConfiguration(s: PersonalizationState): Record<string, string> {
  return { ...s.values };
}

export function selectIsComplete(s: PersonalizationState): boolean {
  if (!s.product) return false;
  return s.product.paramSchema.every((param) => {
    const v = s.values[param.key];
    if (param.type === "text") {
      return typeof v === "string" && v.trim().length > 0 && !s.errors[param.key];
    }
    return typeof v === "string" && v.length > 0;
  });
}
