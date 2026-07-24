"use client";

import { useState } from "react";
import { calculateTotalCents } from "@/lib/pricing";
import { formatBRL } from "@/lib/money";
import type { Product } from "@/lib/products";
import type { ColorParam, SelectParam, TextParam } from "@/db/types";
import type { ShippingOption } from "@/lib/shipping";

interface ItemDraft {
  size: string;
  colorBase: string;
  colorBand: string;
  petName: string;
}

const BR_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const CARD_CLASS = "rounded-3xl bg-white p-6 shadow-potinho-card dark:bg-potinho-carvao";
const SECTION_LABEL_CLASS = "mb-1 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate dark:text-potinho-caramelo";
const FUNDO_INPUT_CLASS = "rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm dark:border-potinho-cinza/30 dark:bg-potinho-noite dark:text-potinho-bege";
const WHITE_INPUT_CLASS = "rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm dark:border-potinho-cinza/30 dark:bg-potinho-noite dark:text-potinho-bege";

interface ViaCepResponse {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

/** Criação manual de pedido pelo admin (9.4) — mesma validação/preço do checkout público. */
export default function NovoPedidoForm({ product }: { product: Product }) {
  const textParam = product.paramSchema.find((p) => p.type === "text") as TextParam;
  const colorBase = product.paramSchema.find((p) => p.type === "color" && p.key === "color_base") as ColorParam;
  const colorBand = product.paramSchema.find((p) => p.type === "color" && p.key === "color_band") as ColorParam;
  const sizeParam = product.paramSchema.find((p) => p.type === "select") as SelectParam;

  const emptyItem = (): ItemDraft => ({
    size: sizeParam.options[0].value,
    colorBase: colorBase.options[0].hex,
    colorBand: colorBand.options[0].hex,
    petName: "",
  });

  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState({
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zip: "",
  });
  const [shippingOverride, setShippingOverride] = useState("");
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingStatus, setShippingStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ orderId: string; paymentLink?: string } | null>(null);

  const itemsTotal = items.reduce(
    (sum, item) => sum + calculateTotalCents(product, { size: item.size }),
    0,
  );
  const shippingCents = shippingOverride ? Math.round(parseFloat(shippingOverride) * 100) : null;

  function updateItem(index: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  async function quoteShipping(cep: string, uf: string) {
    setShippingStatus("loading");
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cep,
          uf,
          items: items.map((item) => ({ productId: product.id, size: item.size })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha na cotação");
      setShippingOptions(data.options);
      setShippingStatus("done");
    } catch {
      setShippingStatus("error");
    }
  }

  async function handleCepBlur() {
    const digits = address.zip.replace(/\D/g, "");
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data: ViaCepResponse = await res.json();
      if (data.erro) return;
      setAddress((prev) => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
      if (data.uf) await quoteShipping(digits, data.uf);
    } catch {
      // ponytail: cep é opcional aqui (admin pode digitar endereço na mão) — só não auto-preenche/cota.
    }
  }

  async function submit(outcome: "paid" | "link") {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: product.id,
            configuration: {
              pet_name: item.petName.trim().toUpperCase(),
              color_base: item.colorBase,
              color_band: item.colorBand,
              size: item.size,
            },
          })),
          customer: { name, email, phone, address },
          shippingCentsOverride: shippingOverride ? Math.round(parseFloat(shippingOverride) * 100) : undefined,
          outcome,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível criar o pedido");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o pedido");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className={CARD_CLASS}>
        <p className="font-semibold text-potinho-chocolate dark:text-potinho-caramelo">pedido criado ✓</p>
        {result.paymentLink ? (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-sm text-potinho-texto/70 dark:text-potinho-bege/70">
              envie este link de pagamento pro cliente:
            </p>
            <input
              readOnly
              value={result.paymentLink}
              onFocus={(e) => e.currentTarget.select()}
              className={FUNDO_INPUT_CLASS}
            />
          </div>
        ) : (
          <p className="mt-2 text-sm text-potinho-texto/70 dark:text-potinho-bege/70">marcado como pago.</p>
        )}
        <a
          href={`/admin/pedidos/${result.orderId}`}
          className="mt-4 inline-block text-sm text-potinho-chocolate underline dark:text-potinho-caramelo"
        >
          ver pedido
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="sr-only">itens</legend>
        <div className={`flex flex-col gap-4 ${CARD_CLASS}`}>
        <p className={SECTION_LABEL_CLASS} aria-hidden>itens</p>
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-2 gap-3 rounded-2xl bg-potinho-fundo p-4 dark:bg-potinho-noite sm:grid-cols-4">
            <input
              type="text"
              placeholder="nome do pet"
              value={item.petName}
              onChange={(e) => updateItem(i, { petName: e.target.value })}
              className={`${WHITE_INPUT_CLASS} uppercase`}
            />
            <select
              value={item.size}
              onChange={(e) => updateItem(i, { size: e.target.value })}
              className={WHITE_INPUT_CLASS}
            >
              {sizeParam.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={item.colorBase}
              onChange={(e) => updateItem(i, { colorBase: e.target.value })}
              className={WHITE_INPUT_CLASS}
            >
              {colorBase.options.map((o) => (
                <option key={o.hex} value={o.hex}>
                  cima: {o.label}
                </option>
              ))}
            </select>
            <select
              value={item.colorBand}
              onChange={(e) => updateItem(i, { colorBand: e.target.value })}
              className={WHITE_INPUT_CLASS}
            >
              {colorBand.options.map((o) => (
                <option key={o.hex} value={o.hex}>
                  base: {o.label}
                </option>
              ))}
            </select>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                className="col-span-full text-left text-xs text-rose-500 hover:underline dark:text-rose-400"
              >
                remover item
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, emptyItem()])}
          className="self-start rounded-full border-2 border-potinho-bege px-5 py-2 text-sm font-semibold lowercase text-potinho-chocolate hover:bg-potinho-fundo dark:border-potinho-cinza/30 dark:text-potinho-caramelo dark:hover:bg-white/5"
        >
          + adicionar item
        </button>
        <p className="text-xs text-potinho-texto/50 dark:text-potinho-bege/50">
          {textParam.min} a {textParam.max} caracteres por nome de pet. total dos itens: {formatBRL(itemsTotal)}
        </p>
        </div>
      </fieldset>

      <fieldset>
        <legend className="sr-only">cliente</legend>
        <div className={`flex flex-col gap-3 ${CARD_CLASS}`}>
        <p className={SECTION_LABEL_CLASS} aria-hidden>cliente</p>
        <input
          type="text"
          placeholder="nome completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={FUNDO_INPUT_CLASS}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="email"
            placeholder="e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FUNDO_INPUT_CLASS}
          />
          <input
            type="tel"
            placeholder="telefone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={FUNDO_INPUT_CLASS}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <input
            type="text"
            placeholder="cep"
            value={address.zip}
            onChange={(e) => setAddress((a) => ({ ...a, zip: e.target.value }))}
            onBlur={handleCepBlur}
            className={FUNDO_INPUT_CLASS}
          />
          <input
            type="text"
            placeholder="rua"
            value={address.street}
            onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
            className={FUNDO_INPUT_CLASS}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <input
            type="text"
            placeholder="número"
            value={address.number}
            onChange={(e) => setAddress((a) => ({ ...a, number: e.target.value }))}
            className={FUNDO_INPUT_CLASS}
          />
          <input
            type="text"
            placeholder="complemento"
            value={address.complement}
            onChange={(e) => setAddress((a) => ({ ...a, complement: e.target.value }))}
            className={FUNDO_INPUT_CLASS}
          />
        </div>
        <input
          type="text"
          placeholder="bairro"
          value={address.neighborhood}
          onChange={(e) => setAddress((a) => ({ ...a, neighborhood: e.target.value }))}
          className={FUNDO_INPUT_CLASS}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
          <input
            type="text"
            placeholder="cidade"
            value={address.city}
            onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
            className={FUNDO_INPUT_CLASS}
          />
          <select
            value={address.state}
            onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
            className={FUNDO_INPUT_CLASS}
          >
            <option value="">uf</option>
            {BR_STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="sr-only">frete</legend>
        <div className={`flex flex-col gap-3 ${CARD_CLASS}`}>
        <p className={SECTION_LABEL_CLASS} aria-hidden>frete</p>
        {shippingStatus === "loading" && (
          <p className="text-xs text-potinho-texto/50 dark:text-potinho-bege/50">cotando fretes disponíveis…</p>
        )}
        {shippingStatus === "error" && (
          <p className="text-xs text-rose-500 dark:text-rose-400">
            não foi possível cotar automaticamente — informe um valor manualmente abaixo.
          </p>
        )}
        {shippingOptions.length > 0 && (
          <div className="flex flex-col gap-2">
            {shippingOptions.map((opt) => {
              const value = String(opt.priceCents / 100);
              const selected = shippingOverride === value;
              return (
                <label
                  key={opt.service}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 px-4 py-2.5 text-sm ${
                    selected
                      ? "border-potinho-chocolate dark:border-potinho-caramelo"
                      : "border-potinho-bege dark:border-potinho-cinza/30"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="shipping-option"
                      checked={selected}
                      onChange={() => setShippingOverride(value)}
                    />
                    {opt.service}
                  </span>
                  <span className="font-semibold text-potinho-chocolate dark:text-potinho-caramelo">
                    {formatBRL(opt.priceCents)}
                  </span>
                </label>
              );
            })}
          </div>
        )}
        <label className="flex flex-col gap-1 text-xs text-potinho-texto/50 dark:text-potinho-bege/50">
          ou informe outro valor (opcional)
          <input
            type="number"
            step="0.01"
            placeholder="valor em R$"
            value={shippingOverride}
            onChange={(e) => setShippingOverride(e.target.value)}
            className={FUNDO_INPUT_CLASS}
          />
        </label>
        </div>
      </fieldset>

      <div className={`flex flex-col gap-2 ${CARD_CLASS}`}>
        <div className="flex items-center justify-between text-sm text-potinho-texto/70 dark:text-potinho-bege/70">
          <span>frete</span>
          <span>{shippingCents !== null ? formatBRL(shippingCents) : "a definir"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm uppercase tracking-widest text-potinho-texto/60 dark:text-potinho-bege/60">total</span>
          <span className="text-2xl font-bold text-potinho-chocolate dark:text-potinho-caramelo">
            {formatBRL(itemsTotal + (shippingCents ?? 0))}
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-rose-500 dark:text-rose-400">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => submit("paid")}
          disabled={submitting}
          className="rounded-full bg-potinho-chocolate px-6 py-3 text-sm font-semibold lowercase text-potinho-bege hover:bg-potinho-texto disabled:opacity-40"
        >
          marcar como pago
        </button>
        <button
          type="button"
          onClick={() => submit("link")}
          disabled={submitting}
          className="rounded-full border-2 border-potinho-bege px-6 py-3 text-sm font-semibold lowercase text-potinho-chocolate hover:bg-potinho-fundo disabled:opacity-40 dark:border-potinho-cinza/30 dark:text-potinho-caramelo dark:hover:bg-white/5"
        >
          gerar link de pagamento
        </button>
      </div>
    </div>
  );
}
