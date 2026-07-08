"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/money";
import type { Product } from "@/lib/products";
import type { ColorParam, ProductStatus } from "@/db/types";

interface VariantDraft {
  ref: string;
  label: string;
  priceDelta: string;
  widthCm: string;
  heightCm: string;
  lengthCm: string;
  weightKg: string;
}

interface ColorDraft {
  paramKey: string;
  hex: string;
  label: string;
  soldOut: boolean;
}

/** Edição de preço/envio/status e estoque de cores (9.5 AC1/AC2). */
export default function ProdutoForm({ product }: { product: Product }) {
  const router = useRouter();
  const [basePrice, setBasePrice] = useState(String(product.basePrice / 100));
  const [status, setStatus] = useState<ProductStatus>(product.status);
  const [variants, setVariants] = useState<VariantDraft[]>(
    product.variants.map((v) => ({
      ref: v.ref,
      label: v.label,
      priceDelta: String(v.priceDelta / 100),
      widthCm: String(v.shipping?.widthCm ?? 0),
      heightCm: String(v.shipping?.heightCm ?? 0),
      lengthCm: String(v.shipping?.lengthCm ?? 0),
      weightKg: String(v.shipping?.weightKg ?? 0),
    })),
  );
  const colorParams = product.paramSchema.filter((p): p is ColorParam => p.type === "color");
  const [colors, setColors] = useState<ColorDraft[]>(
    colorParams.flatMap((param) =>
      param.options.map((opt) => ({ paramKey: param.key, hex: opt.hex, label: opt.label, soldOut: !!opt.soldOut })),
    ),
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function updateVariant(ref: string, patch: Partial<VariantDraft>) {
    setVariants((prev) => prev.map((v) => (v.ref === ref ? { ...v, ...patch } : v)));
  }

  function toggleColor(paramKey: string, hex: string) {
    setColors((prev) =>
      prev.map((c) => (c.paramKey === paramKey && c.hex === hex ? { ...c, soldOut: !c.soldOut } : c)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveState("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/produto", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          basePrice: Math.round(parseFloat(basePrice) * 100),
          status,
          variants: variants.map((v) => ({
            ref: v.ref,
            priceDelta: Math.round(parseFloat(v.priceDelta) * 100),
            shipping: {
              widthCm: parseFloat(v.widthCm),
              heightCm: parseFloat(v.heightCm),
              lengthCm: parseFloat(v.lengthCm),
              weightKg: parseFloat(v.weightKg),
            },
          })),
          colorUpdates: colors.map(({ paramKey, hex, soldOut }) => ({ paramKey, hex, soldOut })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível salvar");
      setSaveState("saved");
      router.refresh();
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar");
      setSaveState("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-potinho-card">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
          preço base e status
        </legend>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-xs text-potinho-texto/60">
            preço base (R$)
            <input
              type="number"
              step="0.01"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-potinho-texto/60">
            status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductStatus)}
              className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm"
            >
              <option value="draft">rascunho</option>
              <option value="published">publicado</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-potinho-card">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
          preço e envio por tamanho
        </legend>
        {variants.map((variant) => (
          <div key={variant.ref} className="grid grid-cols-2 gap-3 rounded-2xl bg-potinho-fundo p-4 sm:grid-cols-5">
            <span className="col-span-2 self-center text-sm font-semibold text-potinho-texto sm:col-span-1">
              {variant.label}
            </span>
            <label className="flex flex-col gap-1 text-xs text-potinho-texto/60">
              acréscimo (R$)
              <input
                type="number"
                step="0.01"
                value={variant.priceDelta}
                onChange={(e) => updateVariant(variant.ref, { priceDelta: e.target.value })}
                className="rounded-xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-potinho-texto/60">
              largura (cm)
              <input
                type="number"
                value={variant.widthCm}
                onChange={(e) => updateVariant(variant.ref, { widthCm: e.target.value })}
                className="rounded-xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-potinho-texto/60">
              altura (cm)
              <input
                type="number"
                value={variant.heightCm}
                onChange={(e) => updateVariant(variant.ref, { heightCm: e.target.value })}
                className="rounded-xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-potinho-texto/60">
              peso (kg)
              <input
                type="number"
                step="0.1"
                value={variant.weightKg}
                onChange={(e) => updateVariant(variant.ref, { weightKg: e.target.value })}
                className="rounded-xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
        ))}
        <p className="text-xs text-potinho-texto/50">
          preço final do tamanho = preço base + acréscimo. ex.: {variants[0] && formatBRL(
            Math.round(parseFloat(basePrice) * 100) + Math.round(parseFloat(variants[0].priceDelta) * 100),
          )}{" "}
          pro primeiro tamanho.
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-potinho-card">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
          estoque de cores
        </legend>
        {colorParams.map((param) => (
          <div key={param.key} className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-widest text-potinho-texto/50">{param.label}</p>
            <div className="flex flex-wrap gap-2">
              {colors
                .filter((c) => c.paramKey === param.key)
                .map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => toggleColor(color.paramKey, color.hex)}
                    aria-pressed={color.soldOut}
                    className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-medium lowercase transition-colors ${
                      color.soldOut
                        ? "border-rose-300 bg-rose-50 text-rose-600"
                        : "border-potinho-bege text-potinho-texto/70"
                    }`}
                  >
                    <span className="h-3.5 w-3.5 rounded-full ring-1 ring-potinho-cinza/40" style={{ backgroundColor: color.hex }} />
                    {color.label}
                    {color.soldOut && " · esgotada"}
                  </button>
                ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-potinho-texto/50">clique numa cor pra marcar/desmarcar como esgotada.</p>
      </fieldset>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <button
        type="submit"
        disabled={saveState === "saving"}
        className="self-start rounded-full bg-potinho-chocolate px-8 py-3 text-sm font-semibold lowercase text-potinho-bege hover:bg-potinho-texto disabled:opacity-40"
      >
        {saveState === "saving" ? "salvando…" : saveState === "saved" ? "salvo ✓" : "salvar alterações"}
      </button>
    </form>
  );
}
