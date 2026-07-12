"use client";

import Link from "next/link";
import { useState } from "react";
import { formatBRL } from "@/lib/money";
import { calculateTotalCents } from "@/lib/pricing";
import { useCart, type CartEntry } from "@/components/potinho/CartContext";
import { PawIcon } from "@/components/potinho/Marquee";

const BR_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

interface Address {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
}

const EMPTY_ADDRESS: Address = {
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  zip: "",
};

function colorLabel(item: CartEntry, paramKey: string): string | null {
  const param = item.paramSchema.find((p) => p.key === paramKey);
  if (!param || param.type !== "color") return null;
  const hex = item.configuration[paramKey];
  return param.options.find((o) => o.hex.toUpperCase() === hex?.toUpperCase())?.label ?? null;
}

function maskCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

interface ViaCepResponse {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

export default function CheckoutForm() {
  const { items, removeItem, clear } = useCart();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [consentLgpd, setConsentLgpd] = useState(false);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [shippingCents, setShippingCents] = useState<number | null>(null);
  const [shippingStatus, setShippingStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState("");
  const [couponStatus, setCouponStatus] = useState<"idle" | "loading" | "applied" | "error">("idle");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    productDiscountCents: number;
    shippingDiscountCents: number;
    /** Carrinho/frete no momento da aplicação — se mudar depois, o desconto salvo fica desatualizado (sem useEffect). */
    itemsLength: number;
    shippingCentsAtApply: number | null;
  } | null>(null);

  const itemsTotal = items.reduce((sum, i) => sum + calculateTotalCents(i, i.configuration), 0);
  const couponStale =
    appliedCoupon !== null &&
    (appliedCoupon.itemsLength !== items.length || appliedCoupon.shippingCentsAtApply !== shippingCents);
  const couponApplied = couponStatus === "applied" && appliedCoupon !== null && !couponStale;
  const productDiscountCents = couponApplied ? appliedCoupon!.productDiscountCents : 0;
  const shippingDiscountCents = couponApplied ? appliedCoupon!.shippingDiscountCents : 0;
  const shippingChargedCents = shippingCents !== null ? Math.max(0, shippingCents - shippingDiscountCents) : null;
  const total = itemsTotal - productDiscountCents + (shippingChargedCents ?? 0);

  async function handleApplyCoupon() {
    if (!couponInput.trim() || shippingCents === null) return;
    setCouponStatus("loading");
    setCouponError(null);
    try {
      const res = await fetch("/api/checkout/cupom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponCode: couponInput,
          items: items.map((i) => ({ productId: i.productId, configuration: i.configuration })),
          shippingCents,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Cupom inválido");
      setAppliedCoupon({
        code: couponInput.trim().toUpperCase(),
        productDiscountCents: data.productDiscountCents,
        shippingDiscountCents: data.shippingDiscountCents,
        itemsLength: items.length,
        shippingCentsAtApply: shippingCents,
      });
      setCouponStatus("applied");
    } catch (err) {
      setCouponStatus("error");
      setCouponError(err instanceof Error ? err.message : "Cupom inválido");
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponStatus("idle");
    setCouponInput("");
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
          items: items.map((i) => ({ productId: i.productId, size: i.configuration.size })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha na cotação");
      setShippingCents(data.shippingCents);
      setShippingStatus("done");
    } catch {
      setShippingStatus("error");
    }
  }

  async function handleCepBlur() {
    const digits = address.zip.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepStatus("loading");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data: ViaCepResponse = await res.json();
      if (data.erro) throw new Error("CEP não encontrado");
      setAddress((prev) => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
      setCepStatus("done");
      if (data.uf) await quoteShipping(digits, data.uf);
    } catch {
      setCepStatus("error");
    }
  }

  function setField<K extends keyof Address>(key: K, value: Address[K]) {
    setAddress((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            configuration: i.configuration,
            snapshotDataUrl: i.snapshotDataUrl,
          })),
          customer: { name, email, phone, address },
          consentLgpd: true,
          couponCode: couponApplied ? appliedCoupon!.code : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível concluir o pedido");
      clear();
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir o pedido");
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl bg-white p-10 text-center shadow-potinho-card">
        <PawIcon className="h-12 w-12 text-potinho-cinza" />
        <h1 className="text-xl font-bold lowercase text-potinho-texto">seu carrinho está vazio</h1>
        <p className="text-sm text-potinho-texto/60">monte um potinho pro seu pet antes de finalizar o pedido.</p>
        <Link
          href="/"
          className="rounded-full bg-potinho-chocolate px-8 py-4 text-base font-semibold lowercase text-potinho-bege transition-colors hover:bg-potinho-texto"
        >
          voltar pra home
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-3xl flex-col gap-6 rounded-3xl bg-white p-6 shadow-potinho-card sm:p-8"
    >
      <header>
        <h1 className="text-2xl font-bold lowercase text-potinho-texto">finalizar pedido</h1>
      </header>

      {/* Itens do carrinho */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
          seus itens
        </legend>
        {items.map((item) => {
          const sizeLabel =
            item.paramSchema.find((p) => p.type === "select")?.options.find(
              (o) => o.value === item.configuration.size,
            )?.label ?? "";
          const base = colorLabel(item, "color_base");
          const band = colorLabel(item, "color_band");
          return (
            <div key={item.cartId} className="flex items-center gap-4 rounded-2xl bg-potinho-fundo p-4">
              <div className="flex -space-x-1">
                {[item.configuration.color_base, item.configuration.color_band].map((hex, i) => (
                  <span
                    key={i}
                    className="h-8 w-8 rounded-full ring-1 ring-potinho-cinza/40"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold uppercase tracking-wider text-potinho-texto">
                  {item.configuration.pet_name}
                </p>
                <p className="text-xs text-potinho-texto/60">
                  {sizeLabel}
                  {base && band ? ` · ${base.toLowerCase()} + ${band.toLowerCase()}` : ""}
                </p>
              </div>
              <span className="font-bold text-potinho-chocolate">
                {formatBRL(calculateTotalCents(item, item.configuration))}
              </span>
              <button
                type="button"
                onClick={() => removeItem(item.cartId)}
                aria-label="remover item"
                data-testid="checkout-remove-item"
                className="rounded-full p-1.5 text-potinho-cinza hover:bg-potinho-bege hover:text-potinho-chocolate"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          );
        })}
      </fieldset>

      {/* Dados do cliente */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
          seus dados
        </legend>
        <input
          required
          type="text"
          placeholder="nome completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-5 py-3.5 text-base text-potinho-texto placeholder:text-potinho-cinza focus:border-potinho-chocolate focus:outline-none"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            required
            type="email"
            placeholder="e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-5 py-3.5 text-base text-potinho-texto placeholder:text-potinho-cinza focus:border-potinho-chocolate focus:outline-none"
          />
          <input
            required
            type="tel"
            placeholder="telefone / whatsapp"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-5 py-3.5 text-base text-potinho-texto placeholder:text-potinho-cinza focus:border-potinho-chocolate focus:outline-none"
          />
        </div>
      </fieldset>

      {/* Endereço */}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
          endereço de entrega
        </legend>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <input
            required
            type="text"
            inputMode="numeric"
            placeholder="cep"
            data-testid="checkout-cep"
            value={address.zip}
            onChange={(e) => setField("zip", maskCep(e.target.value))}
            onBlur={handleCepBlur}
            className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-5 py-3.5 text-base text-potinho-texto placeholder:text-potinho-cinza focus:border-potinho-chocolate focus:outline-none"
          />
          <input
            required
            type="text"
            placeholder="rua"
            value={address.street}
            onChange={(e) => setField("street", e.target.value)}
            className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-5 py-3.5 text-base text-potinho-texto placeholder:text-potinho-cinza focus:border-potinho-chocolate focus:outline-none"
          />
        </div>
        {cepStatus === "loading" && <p className="text-xs text-potinho-texto/50">buscando endereço…</p>}
        {cepStatus === "error" && <p className="text-xs text-rose-500">cep não encontrado — preencha manualmente</p>}
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <input
            required
            type="text"
            placeholder="número"
            value={address.number}
            onChange={(e) => setField("number", e.target.value)}
            className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-5 py-3.5 text-base text-potinho-texto placeholder:text-potinho-cinza focus:border-potinho-chocolate focus:outline-none"
          />
          <input
            type="text"
            placeholder="complemento"
            value={address.complement}
            onChange={(e) => setField("complement", e.target.value)}
            className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-5 py-3.5 text-base text-potinho-texto placeholder:text-potinho-cinza focus:border-potinho-chocolate focus:outline-none"
          />
        </div>
        <input
          required
          type="text"
          placeholder="bairro"
          value={address.neighborhood}
          onChange={(e) => setField("neighborhood", e.target.value)}
          className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-5 py-3.5 text-base text-potinho-texto placeholder:text-potinho-cinza focus:border-potinho-chocolate focus:outline-none"
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
          <input
            required
            type="text"
            placeholder="cidade"
            value={address.city}
            onChange={(e) => setField("city", e.target.value)}
            className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-5 py-3.5 text-base text-potinho-texto placeholder:text-potinho-cinza focus:border-potinho-chocolate focus:outline-none"
          />
          <select
            required
            value={address.state}
            onChange={(e) => setField("state", e.target.value)}
            className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-5 py-3.5 text-base text-potinho-texto focus:border-potinho-chocolate focus:outline-none"
          >
            <option value="">uf</option>
            {BR_STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* LGPD */}
      <label className="flex items-start gap-3 rounded-2xl bg-potinho-fundo px-4 py-3 text-xs leading-relaxed text-potinho-texto/70">
        <input
          required
          type="checkbox"
          checked={consentLgpd}
          onChange={(e) => setConsentLgpd(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          autorizo o uso dos meus dados para processar este pedido, conforme a{" "}
          <Link href="/privacidade" className="underline">
            política de privacidade
          </Link>
          .
        </span>
      </label>

      {/* Cupom de desconto */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
          cupom de desconto
        </legend>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="código do cupom"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            disabled={couponApplied}
            data-testid="checkout-coupon-input"
            className="flex-1 rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-5 py-3.5 text-base uppercase tracking-wider text-potinho-texto placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-potinho-cinza focus:border-potinho-chocolate focus:outline-none disabled:opacity-60"
          />
          {couponApplied ? (
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="rounded-full border-2 border-potinho-bege px-5 py-3.5 text-sm font-semibold lowercase text-potinho-chocolate transition-colors hover:bg-potinho-fundo"
            >
              remover
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={couponStatus === "loading" || !couponInput.trim() || shippingCents === null}
              data-testid="checkout-coupon-apply"
              className="rounded-full border-2 border-potinho-chocolate px-5 py-3.5 text-sm font-semibold lowercase text-potinho-chocolate transition-colors hover:bg-potinho-chocolate hover:text-potinho-bege disabled:cursor-not-allowed disabled:opacity-40"
            >
              {couponStatus === "loading" ? "aplicando…" : "aplicar"}
            </button>
          )}
        </div>
        {couponApplied && <p className="text-xs text-potinho-chocolate">cupom {appliedCoupon?.code} aplicado ✓</p>}
        {couponStale && <p className="text-xs text-rose-500">o carrinho mudou — aplique o cupom de novo</p>}
        {couponStatus === "error" && <p className="text-xs text-rose-500">{couponError}</p>}
        {couponStatus === "idle" && !appliedCoupon && shippingCents === null && (
          <p className="text-xs text-potinho-texto/50">informe o cep pra poder aplicar um cupom.</p>
        )}
      </fieldset>

      {/* Total + submit */}
      <div className="flex flex-col gap-4 border-t border-potinho-bege pt-5">
        <div className="flex items-center justify-between text-sm text-potinho-texto/70">
          <span>frete</span>
          <span>
            {shippingStatus === "loading"
              ? "calculando…"
              : shippingChargedCents !== null
                ? formatBRL(shippingChargedCents)
                : "informe o cep"}
          </span>
        </div>
        {couponApplied && productDiscountCents + shippingDiscountCents > 0 && (
          <div className="flex items-center justify-between text-sm text-potinho-chocolate">
            <span>desconto ({appliedCoupon!.code})</span>
            <span>-{formatBRL(productDiscountCents + shippingDiscountCents)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm uppercase tracking-widest text-potinho-texto/60">total</span>
          <span className="text-2xl font-bold text-potinho-chocolate">{formatBRL(total)}</span>
        </div>

        {error && <p className="text-sm text-rose-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !consentLgpd}
          data-testid="checkout-submit"
          className="w-full rounded-full bg-potinho-chocolate py-4 text-base font-semibold lowercase text-potinho-bege transition-colors enabled:hover:bg-potinho-texto disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "processando…" : "ir para o pagamento"}
        </button>
      </div>
    </form>
  );
}
