"use client";

import { useState } from "react";
import { calculateTotalCents } from "@/lib/pricing";
import { formatBRL } from "@/lib/money";
import type { Product } from "@/lib/products";
import type { ColorParam, SelectParam, TextParam } from "@/db/types";

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ orderId: string; paymentLink?: string } | null>(null);

  const itemsTotal = items.reduce(
    (sum, item) => sum + calculateTotalCents(product, { size: item.size }),
    0,
  );

  function updateItem(index: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
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
      <div className="rounded-3xl bg-white p-6 shadow-potinho-card">
        <p className="font-semibold text-potinho-chocolate">pedido criado ✓</p>
        {result.paymentLink ? (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-sm text-potinho-texto/70">envie este link de pagamento pro cliente:</p>
            <input
              readOnly
              value={result.paymentLink}
              onFocus={(e) => e.currentTarget.select()}
              className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm"
            />
          </div>
        ) : (
          <p className="mt-2 text-sm text-potinho-texto/70">marcado como pago.</p>
        )}
        <a href={`/admin/pedidos/${result.orderId}`} className="mt-4 inline-block text-sm text-potinho-chocolate underline">
          ver pedido
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="sr-only">itens</legend>
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-potinho-card">
        <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate" aria-hidden>itens</p>
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-2 gap-3 rounded-2xl bg-potinho-fundo p-4 sm:grid-cols-4">
            <input
              type="text"
              placeholder="nome do pet"
              value={item.petName}
              onChange={(e) => updateItem(i, { petName: e.target.value })}
              className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm uppercase"
            />
            <select
              value={item.size}
              onChange={(e) => updateItem(i, { size: e.target.value })}
              className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
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
              className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
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
              className="rounded-2xl border-2 border-potinho-bege bg-white px-3 py-2 text-sm"
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
                className="col-span-full text-left text-xs text-rose-500 hover:underline"
              >
                remover item
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, emptyItem()])}
          className="self-start rounded-full border-2 border-potinho-bege px-5 py-2 text-sm font-semibold lowercase text-potinho-chocolate hover:bg-potinho-fundo"
        >
          + adicionar item
        </button>
        <p className="text-xs text-potinho-texto/50">
          {textParam.min} a {textParam.max} caracteres por nome de pet. total dos itens: {formatBRL(itemsTotal)}
        </p>
        </div>
      </fieldset>

      <fieldset>
        <legend className="sr-only">cliente</legend>
        <div className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-potinho-card">
        <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate" aria-hidden>cliente</p>
        <input
          type="text"
          placeholder="nome completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="email"
            placeholder="e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm"
          />
          <input
            type="tel"
            placeholder="telefone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <input
            type="text"
            placeholder="cep"
            value={address.zip}
            onChange={(e) => setAddress((a) => ({ ...a, zip: e.target.value }))}
            className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm"
          />
          <input
            type="text"
            placeholder="rua"
            value={address.street}
            onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
            className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <input
            type="text"
            placeholder="número"
            value={address.number}
            onChange={(e) => setAddress((a) => ({ ...a, number: e.target.value }))}
            className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm"
          />
          <input
            type="text"
            placeholder="complemento"
            value={address.complement}
            onChange={(e) => setAddress((a) => ({ ...a, complement: e.target.value }))}
            className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm"
          />
        </div>
        <input
          type="text"
          placeholder="bairro"
          value={address.neighborhood}
          onChange={(e) => setAddress((a) => ({ ...a, neighborhood: e.target.value }))}
          className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm"
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
          <input
            type="text"
            placeholder="cidade"
            value={address.city}
            onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
            className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm"
          />
          <select
            value={address.state}
            onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
            className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm"
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
        <div className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-potinho-card">
        <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate" aria-hidden>frete</p>
        <input
          type="number"
          step="0.01"
          placeholder="deixe em branco pra cotar automaticamente"
          value={shippingOverride}
          onChange={(e) => setShippingOverride(e.target.value)}
          className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm"
        />
        </div>
      </fieldset>

      {error && <p className="text-sm text-rose-500">{error}</p>}

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
          className="rounded-full border-2 border-potinho-bege px-6 py-3 text-sm font-semibold lowercase text-potinho-chocolate hover:bg-potinho-fundo disabled:opacity-40"
        >
          gerar link de pagamento
        </button>
      </div>
    </div>
  );
}
