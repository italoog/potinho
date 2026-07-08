"use client";

import { useState } from "react";
import { PawIcon } from "@/components/potinho/Marquee";

/** Form de login por magic link (7.2 AC1) — sem senha, mesma resposta pra e-mail com ou sem conta. */
export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/conta/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.status === 429) {
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl bg-white p-10 text-center shadow-potinho-card">
        <PawIcon className="h-12 w-12 text-potinho-cinza" />
        <h1 className="text-xl font-bold lowercase text-potinho-texto">link enviado</h1>
        <p className="text-sm text-potinho-texto/60">
          olha seu e-mail — mandamos um link pra você entrar. ele expira em 15 minutos.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl bg-white p-10 text-center shadow-potinho-card"
    >
      <PawIcon className="h-12 w-12 text-potinho-cinza" />
      <h1 className="text-xl font-bold lowercase text-potinho-texto">minha conta</h1>
      <p className="text-sm text-potinho-texto/60">
        entrar ou criar conta — sem senha, a gente manda um link.
      </p>
      <input
        required
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="seu e-mail"
        data-testid="conta-email"
        className="w-full rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-5 py-3.5 text-base text-potinho-texto placeholder:text-potinho-cinza focus:border-potinho-chocolate focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        data-testid="conta-entrar"
        className="w-full rounded-full bg-potinho-chocolate px-8 py-4 text-base font-semibold lowercase text-potinho-bege transition-colors enabled:hover:bg-potinho-texto disabled:cursor-not-allowed disabled:opacity-40"
      >
        {status === "loading" ? "enviando…" : "quero entrar"}
      </button>
      {status === "error" && (
        <p className="text-xs text-rose-500">muitas tentativas — espere um pouco e tente de novo.</p>
      )}
    </form>
  );
}
