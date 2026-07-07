"use client";

import { forwardRef, useState } from "react";
import {
  formatBRL,
  getColor,
  petNameRules,
  sizes,
  stockColors,
  type SizeId,
} from "@/lib/site-config";
import { useCart } from "./CartContext";
import NotifyForm from "./NotifyForm";

export interface CustomizerSelection {
  colorTopId: string;
  colorBottomId: string;
}

interface Props {
  selection: CustomizerSelection;
  onSelectionChange: (s: CustomizerSelection) => void;
  /** Nome do pet vive no pai para alimentar o preview 3D ao vivo. */
  petName: string;
  onPetNameChange: (name: string) => void;
}

/** Bloco de personalização: tamanho, 2 cores, nome do pet, preço e carrinho. */
const Customizer = forwardRef<HTMLDivElement, Props>(function Customizer(
  { selection, onSelectionChange, petName, onPetNameChange },
  ref,
) {
  const { addItem } = useCart();
  const [sizeId, setSizeId] = useState<SizeId>("G");
  const [slot, setSlot] = useState<"top" | "bottom">("top");
  const [added, setAdded] = useState(false);

  const size = sizes.find((s) => s.id === sizeId)!;
  const top = getColor(selection.colorTopId);
  const bottom = getColor(selection.colorBottomId);
  const soldOutSelected = [top, bottom].filter((c) => c.soldOut);

  const trimmed = petName.trim();
  const nameOk = trimmed.length >= petNameRules.min && trimmed.length <= petNameRules.max;
  const canBuy = nameOk && soldOutSelected.length === 0;

  function pickColor(id: string) {
    const next =
      slot === "top"
        ? { ...selection, colorTopId: id }
        : { ...selection, colorBottomId: id };
    onSelectionChange(next);
    setSlot(slot === "top" ? "bottom" : "top");
  }

  function handleAdd() {
    if (!canBuy) return;
    addItem({
      sizeId,
      sizeLabel: `${size.label} (${size.dimensions})`,
      colorTopId: top.id,
      colorBottomId: bottom.id,
      petName: trimmed.toUpperCase(),
      priceCents: size.priceCents,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div
      ref={ref}
      className="flex flex-col gap-7 rounded-3xl bg-white p-6 shadow-[0_10px_50px_-20px_rgba(90,64,50,0.4)] sm:p-8"
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
          {sizes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSizeId(s.id)}
              aria-pressed={sizeId === s.id}
              className={`flex flex-col items-center gap-0.5 rounded-2xl border-2 px-3 py-3 transition-colors ${
                sizeId === s.id
                  ? "border-potinho-chocolate bg-potinho-fundo"
                  : "border-potinho-bege hover:border-potinho-cinza"
              }`}
            >
              <span className="text-sm font-semibold lowercase text-potinho-texto">{s.label}</span>
              <span className="text-xs text-potinho-texto/60">{s.dimensions}</span>
              <span className="text-sm font-bold text-potinho-chocolate">
                {formatBRL(s.priceCents)}
              </span>
            </button>
          ))}
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
              ["top", "parte de cima", top],
              ["bottom", "base", bottom],
            ] as const
          ).map(([key, label, color]) => (
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
              <span
                className={`h-4 w-4 rounded-full ${color.light ? "ring-1 ring-potinho-cinza" : ""}`}
                style={{ backgroundColor: color.hex }}
              />
              {label}: {color.label.toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2.5">
          {stockColors.map((c) => {
            const active = c.id === top.id || c.id === bottom.id;
            return (
              <button
                key={c.id}
                type="button"
                title={c.soldOut ? `${c.label} (esgotada)` : c.label}
                onClick={() => pickColor(c.id)}
                aria-pressed={active}
                className={`relative h-10 w-10 rounded-full transition-transform hover:scale-110 ${
                  c.light ? "ring-1 ring-potinho-cinza" : ""
                } ${active ? "outline outline-[3px] outline-offset-2 outline-potinho-chocolate" : ""}`}
                style={{ backgroundColor: c.hex }}
              >
                {c.soldOut && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/60 text-[9px] font-bold uppercase text-potinho-texto">
                    esg.
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-4 rounded-2xl bg-potinho-fundo px-4 py-3 text-xs leading-relaxed text-potinho-texto/70">
          as cores na tela são apenas uma referência de tom: cada aparelho exibe as cores de um
          jeito e cada lote de filamento pode ter pequenas variações. essas diferenças são naturais
          do processo de impressão 3D e não caracterizam defeito.
        </p>
      </fieldset>

      {/* Avise-me para cor esgotada */}
      {soldOutSelected.length > 0 && (
        <NotifyForm
          colorLabel={soldOutSelected.map((c) => c.label.toLowerCase()).join(" e ")}
        />
      )}

      {/* Nome do pet */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
          nome do pet (gravado na peça)
        </legend>
        <input
          type="text"
          value={petName}
          onChange={(e) => onPetNameChange(e.target.value)}
          maxLength={petNameRules.max}
          placeholder="ex.: paçoca"
          className="w-full rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-5 py-3.5 text-lg font-semibold uppercase tracking-widest text-potinho-texto placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-potinho-cinza focus:border-potinho-chocolate focus:outline-none"
        />
        <p className="mt-2 text-xs text-potinho-texto/50">
          {petNameRules.min} a {petNameRules.max} caracteres · {trimmed.length}/{petNameRules.max}
        </p>
      </fieldset>

      {/* Preço + CTA */}
      <div className="flex flex-col gap-3 border-t border-potinho-bege pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="block text-xs uppercase tracking-widest text-potinho-texto/60">
            total
          </span>
          <span className="text-3xl font-bold text-potinho-chocolate">
            {formatBRL(size.priceCents)}
          </span>
          {size.provisional && (
            <span className="mt-0.5 block text-xs text-potinho-texto/55">
              valor previsto para o tamanho {size.label.toLowerCase()} — confirmamos antes do
              lançamento.
            </span>
          )}
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
          o nome precisa ter entre {petNameRules.min} e {petNameRules.max} caracteres.
        </p>
      )}
    </div>
  );
});

export default Customizer;
