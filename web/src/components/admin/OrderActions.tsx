"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ORDER_STATUS_TRANSITIONS, STATUS_LABEL } from "@/lib/order-status";
import type { OrderStatus } from "@/db/types";

interface Props {
  orderId: string;
  currentStatus: OrderStatus;
  trackingCode: string | null;
  paymentProvider: string;
}

/** Ações do admin no detalhe do pedido (9.3 AC3/AC5) — mudar status e reenviar e-mail. */
export default function OrderActions({ orderId, currentStatus, trackingCode, paymentProvider }: Props) {
  const router = useRouter();
  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus];
  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const [tracking, setTracking] = useState(trackingCode ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "loading" | "error">("idle");
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  async function handleStatusSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nextStatus) return;
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/admin/pedidos/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, trackingCode: tracking || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao mudar status");
      setNextStatus("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao mudar status");
      setStatus("error");
      return;
    }
    setStatus("idle");
  }

  async function handleVerifyPayment() {
    setVerifyStatus("loading");
    setVerifyMessage(null);
    try {
      const res = await fetch(`/api/admin/pedidos/${orderId}/verificar-pagamento`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao verificar pagamento");
      setVerifyMessage(`status no Mercado Pago: ${data.status}`);
      setVerifyStatus("idle");
      router.refresh();
    } catch (err) {
      setVerifyMessage(err instanceof Error ? err.message : "Falha ao verificar pagamento");
      setVerifyStatus("error");
    }
  }

  async function handleResend() {
    setResendStatus("loading");
    try {
      const res = await fetch(`/api/admin/pedidos/${orderId}/reenviar-email`, { method: "POST" });
      if (!res.ok) throw new Error();
      setResendStatus("done");
      setTimeout(() => setResendStatus("idle"), 2500);
    } catch {
      setResendStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-potinho-card">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">ações</h2>

      {allowed.length > 0 ? (
        <form onSubmit={handleStatusSubmit} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-potinho-texto/60">novo status</label>
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
              className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm text-potinho-texto focus:border-potinho-chocolate focus:outline-none"
            >
              <option value="">selecione</option>
              {allowed.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          {nextStatus === "shipped" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-potinho-texto/60">código de rastreio</label>
              <input
                type="text"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                data-testid="admin-tracking-code"
                className="rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm text-potinho-texto focus:border-potinho-chocolate focus:outline-none"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={!nextStatus || status === "loading"}
            data-testid="admin-change-status"
            className="rounded-full bg-potinho-chocolate px-6 py-2.5 text-sm font-semibold lowercase text-potinho-bege hover:bg-potinho-texto disabled:opacity-40"
          >
            {status === "loading" ? "salvando…" : "atualizar status"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-potinho-texto/50">este pedido não tem mais transições disponíveis.</p>
      )}
      {error && <p className="text-sm text-rose-500">{error}</p>}

      {currentStatus === "pending" && paymentProvider === "mercadopago" && (
        <div className="border-t border-potinho-bege pt-4">
          <button
            type="button"
            onClick={handleVerifyPayment}
            disabled={verifyStatus === "loading"}
            className="rounded-full border-2 border-potinho-bege px-6 py-2.5 text-sm font-semibold lowercase text-potinho-chocolate hover:bg-potinho-fundo disabled:opacity-40"
          >
            {verifyStatus === "loading" ? "verificando…" : "verificar pagamento agora"}
          </button>
          {verifyMessage && (
            <p className={`mt-2 text-sm ${verifyStatus === "error" ? "text-rose-500" : "text-potinho-texto/60"}`}>
              {verifyMessage}
            </p>
          )}
        </div>
      )}

      <div className="border-t border-potinho-bege pt-4">
        <button
          type="button"
          onClick={handleResend}
          disabled={resendStatus === "loading"}
          className="rounded-full border-2 border-potinho-bege px-6 py-2.5 text-sm font-semibold lowercase text-potinho-chocolate hover:bg-potinho-fundo disabled:opacity-40"
        >
          {resendStatus === "done" ? "e-mail reenviado ✓" : "reenviar e-mail de confirmação"}
        </button>
      </div>
    </div>
  );
}
