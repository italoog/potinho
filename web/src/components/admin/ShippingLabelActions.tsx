"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/money";

interface Props {
  orderId: string;
  recipientDocument: string | null;
  shippingOrderId: string | null;
  shippingLabelUrl: string | null;
  shippingLabelPriceCents: number | null;
  /** Valor dos produtos (sem frete) — sugestão de "valor declarado" pro seguro dos Correios. */
  suggestedDeclaredValueCents: number;
}

interface QuoteDraft {
  recipientDocument: string;
  service: "pac" | "sedex" | "mini";
  widthCm: string;
  heightCm: string;
  lengthCm: string;
  weightKg: string;
  declaredValue: string;
}

const INPUT_CLASS =
  "rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm disabled:opacity-60 dark:border-potinho-cinza/30 dark:bg-potinho-noite dark:text-potinho-bege";
const INPUT_CLASS_SM =
  "rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-3 py-2 text-sm disabled:opacity-60 dark:border-potinho-cinza/30 dark:bg-potinho-noite dark:text-potinho-bege";

/** Compra e impressão de etiqueta via SuperFrete (9.x) — cotação sem custo, compra gasta saldo real. */
export default function ShippingLabelActions({
  orderId,
  recipientDocument,
  shippingOrderId,
  shippingLabelUrl,
  shippingLabelPriceCents,
  suggestedDeclaredValueCents,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<QuoteDraft>({
    recipientDocument: recipientDocument ?? "",
    service: "pac",
    widthCm: "",
    heightCm: "",
    lengthCm: "",
    weightKg: "",
    declaredValue: String(suggestedDeclaredValueCents / 100),
  });
  const [quotedCents, setQuotedCents] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "quoting" | "buying" | "canceling" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const hasQuote = Boolean(shippingOrderId) && !shippingLabelUrl;
  const hasLabel = Boolean(shippingLabelUrl);

  async function handleQuote(e: React.FormEvent) {
    e.preventDefault();
    setStatus("quoting");
    setError(null);
    try {
      const res = await fetch(`/api/admin/pedidos/${orderId}/etiqueta/cotar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientDocument: draft.recipientDocument.replace(/\D/g, ""),
          service: draft.service,
          package: {
            widthCm: parseFloat(draft.widthCm),
            heightCm: parseFloat(draft.heightCm),
            lengthCm: parseFloat(draft.lengthCm),
            weightKg: parseFloat(draft.weightKg),
          },
          declaredValueCents: Math.round(parseFloat(draft.declaredValue) * 100),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível cotar a etiqueta");
      setQuotedCents(data.priceCents);
      setStatus("idle");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cotar a etiqueta");
      setStatus("error");
    }
  }

  async function handleBuy() {
    setStatus("buying");
    setError(null);
    try {
      const res = await fetch(`/api/admin/pedidos/${orderId}/etiqueta/comprar`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível comprar a etiqueta");
      setStatus("idle");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível comprar a etiqueta");
      setStatus("error");
    }
  }

  async function handleCancel() {
    if (!confirm("cancelar a etiqueta? o valor volta pro saldo da carteira SuperFrete.")) return;
    setStatus("canceling");
    setError(null);
    try {
      const res = await fetch(`/api/admin/pedidos/${orderId}/etiqueta/cancelar`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível cancelar");
      setQuotedCents(null);
      setStatus("idle");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cancelar");
      setStatus("error");
    }
  }

  if (hasLabel) {
    return (
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-potinho-card dark:bg-potinho-carvao">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-potinho-chocolate dark:text-potinho-caramelo">
          etiqueta de envio
        </h2>
        <p className="text-sm text-potinho-texto/70 dark:text-potinho-bege/70">
          comprada por {shippingLabelPriceCents !== null ? formatBRL(shippingLabelPriceCents) : "—"}.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href={shippingLabelUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-potinho-chocolate px-6 py-2.5 text-sm font-semibold lowercase text-potinho-bege hover:bg-potinho-texto"
          >
            abrir etiqueta (pdf)
          </a>
          <button
            type="button"
            onClick={handleCancel}
            disabled={status === "canceling"}
            className="rounded-full border-2 border-potinho-bege px-6 py-2.5 text-sm font-semibold lowercase text-rose-500 hover:bg-potinho-fundo disabled:opacity-40 dark:border-potinho-cinza/30 dark:text-rose-400 dark:hover:bg-white/5"
          >
            {status === "canceling" ? "cancelando…" : "cancelar etiqueta"}
          </button>
        </div>
        {error && <p className="text-sm text-rose-500 dark:text-rose-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-potinho-card dark:bg-potinho-carvao">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-potinho-chocolate dark:text-potinho-caramelo">
        etiqueta de envio
      </h2>
      <p className="text-xs text-potinho-texto/60 dark:text-potinho-bege/60">
        confira o peso e as dimensões da caixa de verdade (com embalagem) antes de cotar — o cadastro do
        produto guarda só uma estimativa.
      </p>

      <form onSubmit={handleQuote} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-potinho-texto/60 dark:text-potinho-bege/60">
            cpf/cnpj do destinatário
            <input
              required
              type="text"
              value={draft.recipientDocument}
              onChange={(e) => setDraft((d) => ({ ...d, recipientDocument: e.target.value }))}
              disabled={hasQuote}
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-potinho-texto/60 dark:text-potinho-bege/60">
            serviço
            <select
              value={draft.service}
              onChange={(e) => setDraft((d) => ({ ...d, service: e.target.value as QuoteDraft["service"] }))}
              disabled={hasQuote}
              className={INPUT_CLASS}
            >
              <option value="pac">PAC</option>
              <option value="sedex">SEDEX</option>
              <option value="mini">Mini Envios</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-potinho-texto/60 dark:text-potinho-bege/60">
            largura (cm)
            <input
              required
              type="number"
              step="0.1"
              value={draft.widthCm}
              onChange={(e) => setDraft((d) => ({ ...d, widthCm: e.target.value }))}
              disabled={hasQuote}
              className={INPUT_CLASS_SM}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-potinho-texto/60 dark:text-potinho-bege/60">
            altura (cm)
            <input
              required
              type="number"
              step="0.1"
              value={draft.heightCm}
              onChange={(e) => setDraft((d) => ({ ...d, heightCm: e.target.value }))}
              disabled={hasQuote}
              className={INPUT_CLASS_SM}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-potinho-texto/60 dark:text-potinho-bege/60">
            comprimento (cm)
            <input
              required
              type="number"
              step="0.1"
              value={draft.lengthCm}
              onChange={(e) => setDraft((d) => ({ ...d, lengthCm: e.target.value }))}
              disabled={hasQuote}
              className={INPUT_CLASS_SM}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-potinho-texto/60 dark:text-potinho-bege/60">
            peso (kg)
            <input
              required
              type="number"
              step="0.01"
              value={draft.weightKg}
              onChange={(e) => setDraft((d) => ({ ...d, weightKg: e.target.value }))}
              disabled={hasQuote}
              className={INPUT_CLASS_SM}
            />
          </label>
        </div>

        <label className="flex w-fit flex-col gap-1 text-xs text-potinho-texto/60 dark:text-potinho-bege/60">
          valor declarado (R$)
          <input
            required
            type="number"
            step="0.01"
            value={draft.declaredValue}
            onChange={(e) => setDraft((d) => ({ ...d, declaredValue: e.target.value }))}
            disabled={hasQuote}
            className={`w-40 ${INPUT_CLASS_SM}`}
          />
        </label>

        {error && <p className="text-sm text-rose-500 dark:text-rose-400">{error}</p>}

        {!hasQuote ? (
          <button
            type="submit"
            disabled={status === "quoting"}
            className="w-fit rounded-full bg-potinho-chocolate px-6 py-2.5 text-sm font-semibold lowercase text-potinho-bege hover:bg-potinho-texto disabled:opacity-40"
          >
            {status === "quoting" ? "cotando…" : "cotar etiqueta"}
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-potinho-fundo p-4 dark:bg-potinho-noite">
            <p className="text-sm text-potinho-texto dark:text-potinho-bege">
              {quotedCents !== null ? (
                <>
                  cotado:{" "}
                  <span className="font-bold text-potinho-chocolate dark:text-potinho-caramelo">
                    {formatBRL(quotedCents)}
                  </span>
                </>
              ) : (
                "cotação já registrada — confirme a compra ou cancele pra recotar."
              )}
            </p>
            <button
              type="button"
              onClick={handleBuy}
              disabled={status === "buying"}
              className="rounded-full bg-potinho-chocolate px-6 py-2.5 text-sm font-semibold lowercase text-potinho-bege hover:bg-potinho-texto disabled:opacity-40"
            >
              {status === "buying" ? "comprando…" : "confirmar compra"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={status === "canceling"}
              className="rounded-full border-2 border-potinho-bege px-6 py-2.5 text-sm font-semibold lowercase text-potinho-chocolate hover:bg-white disabled:opacity-40 dark:border-potinho-cinza/30 dark:text-potinho-caramelo dark:hover:bg-white/5"
            >
              cancelar cotação
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
