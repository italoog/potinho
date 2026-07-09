"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/money";
import { swatchBackground } from "@/lib/color-swatch";
import type { Product } from "@/lib/products";
import type { ColorParam, ProductStatus } from "@/db/types";

type DiscountType = "" | "percent" | "flat";

interface VariantDraft {
  ref: string;
  label: string;
  price: string;
  discountType: DiscountType;
  discountValue: string;
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
  blend?: string[];
}

function computeFinalCents(v: VariantDraft): number {
  let price = Math.round(parseFloat(v.price || "0") * 100);
  if (v.discountType === "percent") {
    price -= Math.round((price * parseFloat(v.discountValue || "0")) / 100);
  } else if (v.discountType === "flat") {
    price -= Math.round(parseFloat(v.discountValue || "0") * 100);
  }
  return Math.max(0, price);
}

const EMPTY_NEW_VARIANT = {
  ref: "",
  label: "",
  dimensions: "",
  price: "",
  widthCm: "",
  heightCm: "",
  lengthCm: "",
  weightKg: "",
};

/** Edição de preço/desconto/envio por tamanho, cadastro de tamanho e cor novos, estoque de cores (9.5). */
export default function ProdutoForm({ product }: { product: Product }) {
  const router = useRouter();
  const [status, setStatus] = useState<ProductStatus>(product.status);
  const [variants, setVariants] = useState<VariantDraft[]>(
    product.variants.map((v) => ({
      ref: v.ref,
      label: v.label,
      price: String(v.price / 100),
      discountType: v.discountType ?? "",
      discountValue: v.discountValue ? String(v.discountType === "percent" ? v.discountValue : v.discountValue / 100) : "",
      widthCm: String(v.shipping?.widthCm ?? 0),
      heightCm: String(v.shipping?.heightCm ?? 0),
      lengthCm: String(v.shipping?.lengthCm ?? 0),
      weightKg: String(v.shipping?.weightKg ?? 0),
    })),
  );
  const colorParams = product.paramSchema.filter((p): p is ColorParam => p.type === "color");
  const [colors, setColors] = useState<ColorDraft[]>(
    colorParams.flatMap((param) =>
      param.options.map((opt) => ({
        paramKey: param.key,
        hex: opt.hex,
        label: opt.label,
        soldOut: !!opt.soldOut,
        blend: opt.blend,
      })),
    ),
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  // Cadastro de tamanho novo
  const [addingVariant, setAddingVariant] = useState(false);
  const [newVariant, setNewVariant] = useState(EMPTY_NEW_VARIANT);
  const [newVariantFile, setNewVariantFile] = useState<File | null>(null);
  const [addVariantState, setAddVariantState] = useState<"idle" | "saving" | "error">("idle");
  const [addVariantError, setAddVariantError] = useState<string | null>(null);

  // Cadastro de cor nova (comum ou misturada)
  const [addingColor, setAddingColor] = useState(false);
  const [newColorParamKey, setNewColorParamKey] = useState(colorParams[0]?.key ?? "");
  const [newColorLabel, setNewColorLabel] = useState("");
  const [newColorHexes, setNewColorHexes] = useState<string[]>(["#5A4032"]);
  const [addColorState, setAddColorState] = useState<"idle" | "saving" | "error">("idle");
  const [addColorError, setAddColorError] = useState<string | null>(null);

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
          status,
          variants: variants.map((v) => ({
            ref: v.ref,
            price: Math.round(parseFloat(v.price) * 100),
            discountType: v.discountType || null,
            discountValue:
              v.discountType === "percent"
                ? Math.round(parseFloat(v.discountValue || "0"))
                : v.discountType === "flat"
                  ? Math.round(parseFloat(v.discountValue || "0") * 100)
                  : null,
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

  async function handleAddVariant(e: React.FormEvent) {
    e.preventDefault();
    setAddVariantState("saving");
    setAddVariantError(null);
    try {
      const form = new FormData();
      form.set("productId", product.id);
      form.set("ref", newVariant.ref);
      form.set("label", newVariant.label);
      form.set("dimensions", newVariant.dimensions);
      form.set("price", String(Math.round(parseFloat(newVariant.price || "0") * 100)));
      form.set("widthCm", newVariant.widthCm);
      form.set("heightCm", newVariant.heightCm);
      form.set("lengthCm", newVariant.lengthCm);
      form.set("weightKg", newVariant.weightKg);
      // ponytail: sem arquivo novo, reaproveita o modelo do último tamanho até o GLB real chegar
      form.set("fallbackModelUrl", product.variants[product.variants.length - 1]?.modelUrl ?? "");
      if (newVariantFile) form.set("model", newVariantFile);

      const res = await fetch("/api/admin/produto/tamanho", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível cadastrar o tamanho");
      setNewVariant(EMPTY_NEW_VARIANT);
      setNewVariantFile(null);
      setAddingVariant(false);
      setAddVariantState("idle");
      router.refresh();
    } catch (err) {
      setAddVariantError(err instanceof Error ? err.message : "Não foi possível cadastrar o tamanho");
      setAddVariantState("error");
    }
  }

  async function handleDeleteVariant(ref: string, label: string) {
    if (!confirm(`remover o tamanho "${label}"? essa ação não pode ser desfeita.`)) return;
    setDeletingKey(`variant:${ref}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/produto/tamanho", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, ref }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível remover");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover o tamanho");
    } finally {
      setDeletingKey(null);
    }
  }

  async function handleDeleteColor(paramKey: string, hex: string, label: string) {
    if (!confirm(`remover a cor "${label}"? essa ação não pode ser desfeita.`)) return;
    setDeletingKey(`color:${paramKey}:${hex}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/produto/cor", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, paramKey, hex }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível remover");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover a cor");
    } finally {
      setDeletingKey(null);
    }
  }

  async function handleAddColor(e: React.FormEvent) {
    e.preventDefault();
    setAddColorState("saving");
    setAddColorError(null);
    try {
      const res = await fetch("/api/admin/produto/cor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          paramKey: newColorParamKey,
          label: newColorLabel,
          hex: newColorHexes[0],
          blend: newColorHexes.length >= 2 ? newColorHexes : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível cadastrar a cor");
      setNewColorLabel("");
      setNewColorHexes(["#5A4032"]);
      setAddingColor(false);
      setAddColorState("idle");
      router.refresh();
    } catch (err) {
      setAddColorError(err instanceof Error ? err.message : "Não foi possível cadastrar a cor");
      setAddColorState("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <fieldset>
          <legend className="sr-only">status do produto</legend>
          <div className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-potinho-card">
            <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate" aria-hidden>
              status do produto
            </p>
            <label className="flex w-fit flex-col gap-1 text-xs text-potinho-texto/60">
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

        <fieldset>
          <legend className="sr-only">preço, desconto e envio por tamanho</legend>
          <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-potinho-card">
            <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate" aria-hidden>
              preço, desconto e envio por tamanho
            </p>
            {variants.map((variant) => (
              <div key={variant.ref} className="flex flex-col gap-3 rounded-2xl bg-potinho-fundo p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <div className="col-span-2 flex items-center justify-between gap-2 self-center sm:col-span-1">
                    <span className="text-sm font-semibold text-potinho-texto">{variant.label}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteVariant(variant.ref, variant.label)}
                      disabled={deletingKey === `variant:${variant.ref}`}
                      className="text-xs text-rose-500 hover:underline disabled:opacity-40"
                    >
                      {deletingKey === `variant:${variant.ref}` ? "removendo…" : "remover"}
                    </button>
                  </div>
                  <label className="flex flex-col gap-1 text-xs text-potinho-texto/60">
                    preço (R$)
                    <input
                      type="number"
                      step="0.01"
                      value={variant.price}
                      onChange={(e) => updateVariant(variant.ref, { price: e.target.value })}
                      className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-potinho-texto/60">
                    largura (cm)
                    <input
                      type="number"
                      value={variant.widthCm}
                      onChange={(e) => updateVariant(variant.ref, { widthCm: e.target.value })}
                      className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-potinho-texto/60">
                    altura (cm)
                    <input
                      type="number"
                      value={variant.heightCm}
                      onChange={(e) => updateVariant(variant.ref, { heightCm: e.target.value })}
                      className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-potinho-texto/60">
                    peso (kg)
                    <input
                      type="number"
                      step="0.1"
                      value={variant.weightKg}
                      onChange={(e) => updateVariant(variant.ref, { weightKg: e.target.value })}
                      className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-end gap-3 border-t border-potinho-bege pt-3">
                  <label className="flex flex-col gap-1 text-xs text-potinho-texto/60">
                    desconto
                    <select
                      value={variant.discountType}
                      onChange={(e) =>
                        updateVariant(variant.ref, { discountType: e.target.value as DiscountType, discountValue: "" })
                      }
                      className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
                    >
                      <option value="">sem desconto</option>
                      <option value="percent">porcentagem</option>
                      <option value="flat">valor fixo (R$)</option>
                    </select>
                  </label>
                  {variant.discountType && (
                    <label className="flex flex-col gap-1 text-xs text-potinho-texto/60">
                      {variant.discountType === "percent" ? "% de desconto" : "desconto (R$)"}
                      <input
                        type="number"
                        step={variant.discountType === "percent" ? "1" : "0.01"}
                        value={variant.discountValue}
                        onChange={(e) => updateVariant(variant.ref, { discountValue: e.target.value })}
                        className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
                      />
                    </label>
                  )}
                  <p className="text-xs text-potinho-texto/60">
                    preço final: <span className="font-semibold text-potinho-chocolate">{formatBRL(computeFinalCents(variant))}</span>
                  </p>
                </div>
              </div>
            ))}

            {addingVariant ? (
              <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-potinho-bege p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    required
                    type="text"
                    placeholder="referência (ex.: gg)"
                    value={newVariant.ref}
                    onChange={(e) => setNewVariant((v) => ({ ...v, ref: e.target.value }))}
                    className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
                  />
                  <input
                    required
                    type="text"
                    placeholder="rótulo (ex.: GG — 20cm)"
                    value={newVariant.label}
                    onChange={(e) => setNewVariant((v) => ({ ...v, label: e.target.value }))}
                    className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
                  />
                </div>
                <input
                  required
                  type="text"
                  placeholder="dimensões (ex.: 20cm de altura)"
                  value={newVariant.dimensions}
                  onChange={(e) => setNewVariant((v) => ({ ...v, dimensions: e.target.value }))}
                  className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="preço (R$)"
                    value={newVariant.price}
                    onChange={(e) => setNewVariant((v) => ({ ...v, price: e.target.value }))}
                    className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
                  />
                  <input
                    required
                    type="number"
                    placeholder="largura (cm)"
                    value={newVariant.widthCm}
                    onChange={(e) => setNewVariant((v) => ({ ...v, widthCm: e.target.value }))}
                    className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
                  />
                  <input
                    required
                    type="number"
                    placeholder="altura (cm)"
                    value={newVariant.heightCm}
                    onChange={(e) => setNewVariant((v) => ({ ...v, heightCm: e.target.value }))}
                    className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
                  />
                  <input
                    required
                    type="number"
                    step="0.1"
                    placeholder="peso (kg)"
                    value={newVariant.weightKg}
                    onChange={(e) => setNewVariant((v) => ({ ...v, weightKg: e.target.value }))}
                    className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
                  />
                </div>
                <label className="flex flex-col gap-1 text-xs text-potinho-texto/60">
                  arquivo 3D (GLB) — opcional, dá pra subir depois
                  <input
                    type="file"
                    accept=".glb,model/gltf-binary"
                    onChange={(e) => setNewVariantFile(e.target.files?.[0] ?? null)}
                    className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
                  />
                </label>
                {addVariantError && <p className="text-xs text-rose-500">{addVariantError}</p>}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    disabled={addVariantState === "saving"}
                    className="rounded-full bg-potinho-chocolate px-5 py-2 text-sm font-semibold lowercase text-potinho-bege hover:bg-potinho-texto disabled:opacity-40"
                  >
                    {addVariantState === "saving" ? "salvando…" : "salvar tamanho"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingVariant(false)}
                    className="rounded-full border-2 border-potinho-bege px-5 py-2 text-sm font-semibold lowercase text-potinho-chocolate hover:bg-white"
                  >
                    cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingVariant(true)}
                className="self-start rounded-full border-2 border-potinho-bege px-5 py-2 text-sm font-semibold lowercase text-potinho-chocolate hover:bg-potinho-fundo"
              >
                + adicionar tamanho
              </button>
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend className="sr-only">estoque de cores</legend>
          <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-potinho-card">
          <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate" aria-hidden>
            estoque de cores
          </p>
          {colorParams.map((param) => (
            <div key={param.key} className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-widest text-potinho-texto/50">{param.label}</p>
              <div className="flex flex-wrap gap-2">
                {colors
                  .filter((c) => c.paramKey === param.key)
                  .map((color) => (
                    <span
                      key={color.hex}
                      className={`flex items-center gap-2 rounded-full border-2 py-1.5 pl-3 pr-1.5 text-xs font-medium lowercase transition-colors ${
                        color.soldOut
                          ? "border-rose-300 bg-rose-50 text-rose-600"
                          : "border-potinho-bege text-potinho-texto/70"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleColor(color.paramKey, color.hex)}
                        aria-pressed={color.soldOut}
                        className="flex items-center gap-2"
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full ring-1 ring-potinho-cinza/40"
                          style={{ background: swatchBackground(color) }}
                        />
                        {color.label}
                        {color.soldOut && " · esgotada"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteColor(color.paramKey, color.hex, color.label)}
                        disabled={deletingKey === `color:${color.paramKey}:${color.hex}`}
                        aria-label={`remover ${color.label}`}
                        className="rounded-full p-0.5 text-potinho-cinza hover:bg-white hover:text-rose-500 disabled:opacity-40"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
                          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                        </svg>
                      </button>
                    </span>
                  ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-potinho-texto/50">clique numa cor pra marcar/desmarcar como esgotada.</p>

          {addingColor ? (
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-potinho-bege p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={newColorParamKey}
                  onChange={(e) => setNewColorParamKey(e.target.value)}
                  className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
                >
                  {colorParams.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <input
                  required
                  type="text"
                  placeholder="nome da cor (ex.: dourado marmorizado)"
                  value={newColorLabel}
                  onChange={(e) => setNewColorLabel(e.target.value)}
                  className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
                />
              </div>
              <label className="flex flex-col gap-1 text-xs text-potinho-texto/60">
                quantas cores tem esse filamento? (1 = cor comum, 2 a 4 = mistura)
                <select
                  value={newColorHexes.length}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setNewColorHexes((prev) => {
                      const next = prev.slice(0, n);
                      while (next.length < n) next.push("#5A4032");
                      return next;
                    });
                  }}
                  className="w-fit rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
                >
                  <option value={1}>1 — cor comum</option>
                  <option value={2}>2 — mistura</option>
                  <option value={3}>3 — mistura</option>
                  <option value={4}>4 — mistura</option>
                </select>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {newColorHexes.map((hex, i) => (
                  <input
                    key={i}
                    type="color"
                    value={hex}
                    onChange={(e) =>
                      setNewColorHexes((prev) => prev.map((h, idx) => (idx === i ? e.target.value : h)))
                    }
                    className="h-10 w-14 rounded-xl border-2 border-potinho-bege bg-white"
                  />
                ))}
                <span
                  className="h-10 w-10 rounded-full ring-1 ring-potinho-cinza/40"
                  style={{ background: swatchBackground({ hex: newColorHexes[0], blend: newColorHexes.length >= 2 ? newColorHexes : undefined }) }}
                />
              </div>
              {addColorError && <p className="text-xs text-rose-500">{addColorError}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleAddColor}
                  disabled={addColorState === "saving"}
                  className="rounded-full bg-potinho-chocolate px-5 py-2 text-sm font-semibold lowercase text-potinho-bege hover:bg-potinho-texto disabled:opacity-40"
                >
                  {addColorState === "saving" ? "salvando…" : "salvar cor"}
                </button>
                <button
                  type="button"
                  onClick={() => setAddingColor(false)}
                  className="rounded-full border-2 border-potinho-bege px-5 py-2 text-sm font-semibold lowercase text-potinho-chocolate hover:bg-white"
                >
                  cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingColor(true)}
              className="self-start rounded-full border-2 border-potinho-bege px-5 py-2 text-sm font-semibold lowercase text-potinho-chocolate hover:bg-potinho-fundo"
            >
              + adicionar cor
            </button>
          )}
        </div>
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
