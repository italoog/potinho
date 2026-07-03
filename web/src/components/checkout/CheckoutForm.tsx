"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductParamSchema, Variant } from "@/db/types";
import { calculateTotalCents } from "@/lib/pricing";
import { formatBRL } from "@/lib/money";

interface CheckoutProduct {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  variants: Variant[];
  paramSchema: ProductParamSchema;
}

interface StoredCheckout {
  productId: string;
  slug: string;
  configuration: Record<string, string>;
  snapshotDataUrl?: string;
}

/** Dados do cliente + consentimento LGPD (P-01) → POST /api/checkout → Stripe */
export default function CheckoutForm({ product }: { product: CheckoutProduct }) {
  const router = useRouter();
  // inicialização lazy: sessionStorage só existe no client (hidratação pós-SSR)
  const [stored] = useState<StoredCheckout | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const parsed = JSON.parse(sessionStorage.getItem("forja3d:checkout") ?? "") as StoredCheckout;
      return parsed.productId === product.id ? parsed : null;
    } catch {
      return null;
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!stored) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-zinc-600">Sua personalização não foi encontrada.</p>
        <Link href={`/p/${product.slug}`} className="mt-3 inline-block font-medium text-zinc-900 underline">
          Voltar e personalizar
        </Link>
      </div>
    );
  }

  const itemTotal = calculateTotalCents(product, stored.configuration);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          configuration: stored!.configuration,
          snapshotDataUrl: stored!.snapshotDataUrl,
          consentLgpd: data.get("consent") === "on",
          customer: {
            name: data.get("name"),
            email: data.get("email"),
            phone: data.get("phone"),
            address: {
              street: data.get("street"),
              number: data.get("number"),
              complement: data.get("complement") || undefined,
              neighborhood: data.get("neighborhood"),
              city: data.get("city"),
              state: data.get("state"),
              zip: data.get("zip"),
            },
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha ao criar o pedido");
      sessionStorage.removeItem("forja3d:checkout");
      router.push(json.url);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 outline-none transition-colors focus:border-zinc-900";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-zinc-900">Resumo</h2>
        {stored.snapshotDataUrl && (
          // preview local do snapshot (data URL) — <img> é intencional
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={stored.snapshotDataUrl}
            alt="Seu produto personalizado"
            className="mb-3 w-full rounded-xl"
          />
        )}
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-600">{product.name}</dt>
            <dd className="font-medium text-zinc-900">{formatBRL(itemTotal)}</dd>
          </div>
          {Object.entries(stored.configuration).map(([k, v]) => (
            <div key={k} className="flex justify-between text-zinc-500">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
          <div className="flex justify-between pt-2 text-zinc-600">
            <dt>Frete</dt>
            <dd>calculado no pagamento</dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-zinc-900">Seus dados</h2>
        <input name="name" required minLength={2} placeholder="Nome completo" className={inputCls} autoComplete="name" />
        <input name="email" required type="email" placeholder="E-mail" className={inputCls} autoComplete="email" />
        <input name="phone" required minLength={8} placeholder="WhatsApp / telefone" className={inputCls} autoComplete="tel" inputMode="tel" />
      </section>

      <section className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-zinc-900">Entrega</h2>
        <input name="zip" required pattern="\d{5}-?\d{3}" placeholder="CEP (00000-000)" className={inputCls} autoComplete="postal-code" inputMode="numeric" />
        <div className="grid grid-cols-3 gap-3">
          <input name="street" required placeholder="Rua" className={`${inputCls} col-span-2`} autoComplete="address-line1" />
          <input name="number" required placeholder="Nº" className={inputCls} />
        </div>
        <input name="complement" placeholder="Complemento (opcional)" className={inputCls} autoComplete="address-line2" />
        <input name="neighborhood" required placeholder="Bairro" className={inputCls} />
        <div className="grid grid-cols-3 gap-3">
          <input name="city" required placeholder="Cidade" className={`${inputCls} col-span-2`} autoComplete="address-level2" />
          <input name="state" required maxLength={2} minLength={2} placeholder="UF" className={`${inputCls} uppercase`} autoComplete="address-level1" />
        </div>
      </section>

      <label className="flex items-start gap-3 text-sm text-zinc-600">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4" />
        <span>
          Concordo com o uso dos meus dados para processar este pedido, conforme a{" "}
          <Link href="/privacidade" className="underline">
            política de privacidade
          </Link>
          . (LGPD)
        </span>
      </label>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-zinc-900 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {submitting ? "Processando…" : "Ir para o pagamento"}
      </button>
      <p className="-mt-3 text-center text-xs text-zinc-500">
        Pagamento processado pela Stripe — seus dados de cartão não passam por nós.
      </p>
    </form>
  );
}
