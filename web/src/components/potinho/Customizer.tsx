"use client";

import { forwardRef, useState } from "react";
import type { Product } from "@/lib/products";
import type { ColorParam, SelectParam, TextParam } from "@/db/types";
import { calculateTotalCents } from "@/lib/pricing";
import { formatBRL } from "@/lib/money";
import { useCart } from "./CartContext";
import NotifyColorForm from "./NotifyColorForm";

export interface CustomizerSelection {
  colorBaseHex: string;
  colorBandHex: string;
}

interface Props {
  product: Product;
  selection: CustomizerSelection;
  onSelectionChange: (s: CustomizerSelection) => void;
  /** Nome do pet vive no pai para alimentar o preview 3D ao vivo. */
  petName: string;
  onPetNameChange: (name: string) => void;
}

/** Bloco de personalização: tamanho, 2 cores, nome do pet, preço e carrinho — dados do produto real. */
const Customizer = forwardRef<HTMLDivElement, Props>(function Customizer(
  { product, selection, onSelectionChange, petName, onPetNameChange },
  ref,
) {
  const { addItem } = useCart();
  const textParam = product.paramSchema.find((p) => p.type === "text") as TextParam;
  const colorBase = product.paramSchema.find(
    (p) => p.type === "color" && p.key === "color_base",
  ) as ColorParam;
  const colorBand = product.paramSchema.find(
    (p) => p.type === "color" && p.key === "color_band",
  ) as ColorParam;
  const sizeParam = product.paramSchema.find((p) => p.type === "select") as SelectParam;

  const [sizeValue, setSizeValue] = useState(sizeParam.options[sizeParam.options.length - 1].value);
  const [slot, setSlot] = useState<"base" | "band">("base");
  const [added, setAdded] = useState(false);
  const [notifyHex, setNotifyHex] = useState<string | null>(null);

  const trimmed = petName.trim();
  const nameOk = trimmed.length >= textParam.min && trimmed.length <= textParam.max;
  const canBuy = nameOk;

  const configuration = {
    pet_name: trimmed.toUpperCase(),
    color_base: selection.colorBaseHex,
    color_band: selection.colorBandHex,
    size: sizeValue,
  };
  const totalCents = calculateTotalCents(product, { size: sizeValue });

  function pickColor(hex: string) {
    const next =
      slot === "base"
        ? { ...selection, colorBaseHex: hex }
        : { ...selection, colorBandHex: hex };
    onSelectionChange(next);
    setSlot(slot === "base" ? "band" : "base");
  }

  function handleAdd() {
    if (!canBuy) return;
    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      basePrice: product.basePrice,
      variants: product.variants,
      paramSchema: product.paramSchema,
      configuration,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div
      ref={ref}
      className="flex flex-col gap-7 rounded-3xl bg-white p-6 shadow-potinho-card sm:p-8"
    >
      <header>
        <h3 className="text-2xl font-bold lowercase text-potinho-texto">monte o seu potinho</h3>
        <p className="mt-1 text-sm text-potinho-texto/70">
          comedouro elevado com tigela de inox removível, impresso em 3D sob medida.
        </p>
      </header>

      {/* Tamanho */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
          tamanho
        </legend>
        <div className="grid grid-cols-3 gap-3">
          {sizeParam.options.map((opt) => {
            const variant = product.variants.find((v) => v.ref === opt.variantRef);
            const price = calculateTotalCents(product, { size: opt.value });
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSizeValue(opt.value)}
                aria-pressed={sizeValue === opt.value}
                className={`flex flex-col items-center gap-0.5 rounded-2xl border-2 px-3 py-3 transition-colors ${
                  sizeValue === opt.value
                    ? "border-potinho-chocolate bg-potinho-fundo"
                    : "border-potinho-bege hover:border-potinho-cinza"
                }`}
              >
                <span className="text-sm font-semibold lowercase text-potinho-texto">{opt.label}</span>
                {variant && <span className="text-xs text-potinho-texto/60">{variant.dimensions}</span>}
                <span className="text-sm font-bold text-potinho-chocolate">{formatBRL(price)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Cores */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
          até 2 cores
        </legend>
        <div className="mb-3 flex gap-2">
          {(
            [
              ["base", "parte de cima", colorBase, selection.colorBaseHex],
              ["band", "base", colorBand, selection.colorBandHex],
            ] as const
          ).map(([key, label, param, hex]) => {
            const opt = param.options.find((o) => o.hex.toUpperCase() === hex.toUpperCase());
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSlot(key)}
                aria-pressed={slot === key}
                className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium lowercase transition-colors ${
                  slot === key
                    ? "border-potinho-chocolate bg-potinho-fundo text-potinho-texto"
                    : "border-potinho-bege text-potinho-texto/70"
                }`}
              >
                <span className="h-4 w-4 rounded-full ring-1 ring-potinho-cinza/40" style={{ backgroundColor: hex }} />
                {label}: {opt?.label.toLowerCase() ?? "—"}
              </button>
            );
          })}
        </div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-potinho-texto/50">
          {slot === "base" ? "escolha a cor de cima" : "escolha a cor da base"}
        </p>
        <div className="flex flex-wrap gap-2.5">
          {(slot === "base" ? colorBase.options : colorBand.options).map((c) => {
            const active =
              c.hex.toUpperCase() === selection.colorBaseHex.toUpperCase() ||
              c.hex.toUpperCase() === selection.colorBandHex.toUpperCase();
            if (c.soldOut) {
              return (
                <button
                  key={c.hex}
                  type="button"
                  title={`${c.label} — esgotada, clique para avisar quando voltar`}
                  aria-label={`${c.label} esgotada — avise-me quando voltar`}
                  onClick={() => setNotifyHex(c.hex)}
                  className="relative h-10 w-10 rounded-full opacity-40 ring-1 ring-potinho-cinza/30"
                  style={{ backgroundColor: c.hex }}
                >
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-potinho-texto text-[9px] font-bold text-white">
                    !
                  </span>
                </button>
              );
            }
            return (
              <button
                key={c.hex}
                type="button"
                title={c.label}
                onClick={() => pickColor(c.hex)}
                aria-pressed={active}
                className={`relative h-10 w-10 rounded-full ring-1 ring-potinho-cinza/30 transition-transform hover:scale-110 ${
                  active ? "outline outline-[3px] outline-offset-2 outline-potinho-chocolate" : ""
                }`}
                style={{ backgroundColor: c.hex }}
              />
            );
          })}
        </div>
        {notifyHex && (
          <div className="mt-3">
            <NotifyColorForm
              colorId={notifyHex}
              colorLabel={
                [...colorBase.options, ...colorBand.options].find((o) => o.hex === notifyHex)?.label ??
                "essa cor"
              }
              onDone={() => setNotifyHex(null)}
            />
          </div>
        )}
        <p className="mt-4 rounded-2xl bg-potinho-fundo px-4 py-3 text-xs leading-relaxed text-potinho-texto/70">
          as cores na tela são apenas uma referência de tom: cada aparelho exibe as cores de um
          jeito e cada lote de filamento pode ter pequenas variações. essas diferenças são naturais
          do processo de impressão 3D e não caracterizam defeito.
        </p>
      </fieldset>

      {/* Nome do pet */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
          nome do pet (gravado na peça)
        </legend>
        <input
          type="text"
          value={petName}
          onChange={(e) => onPetNameChange(e.target.value)}
          maxLength={textParam.max}
          placeholder="ex.: paçoca"
          className="w-full rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-5 py-3.5 text-lg font-semibold uppercase tracking-widest text-potinho-texto placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-potinho-cinza focus:border-potinho-chocolate focus:outline-none"
        />
        <p className="mt-2 text-xs text-potinho-texto/50">
          {textParam.min} a {textParam.max} caracteres · {trimmed.length}/{textParam.max}
        </p>
      </fieldset>

      {/* Preço + CTA */}
      <div className="flex flex-col gap-3 border-t border-potinho-bege pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="block text-xs uppercase tracking-widest text-potinho-texto/60">
            total
          </span>
          <span className="text-3xl font-bold text-potinho-chocolate">{formatBRL(totalCents)}</span>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canBuy}
          data-testid="add-to-cart"
          className="rounded-full bg-potinho-chocolate px-8 py-4 text-base font-semibold lowercase text-potinho-bege transition-all enabled:hover:bg-potinho-texto disabled:cursor-not-allowed disabled:opacity-40"
        >
          {added ? "adicionado ✓" : "adicionar ao carrinho"}
        </button>
      </div>
      {!nameOk && trimmed.length > 0 && (
        <p className="-mt-4 text-xs text-rose-500">
          o nome precisa ter entre {textParam.min} e {textParam.max} caracteres.
        </p>
      )}
    </div>
  );
});

export default Customizer;
