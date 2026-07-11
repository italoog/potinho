"use client";

import { useState } from "react";

interface Props {
  colorId: string;
  colorLabel: string;
  onDone: () => void;
}

/** Mini-form "avise-me" para cor esgotada (6.4 AC1/AC2) — nota informativa + captura de e-mail. */
export default function NotifyColorForm({ colorId, colorLabel, onDone }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, colorId }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      setTimeout(onDone, 2500);
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="rounded-2xl bg-potinho-fundo px-4 py-3 text-xs text-potinho-texto/70">
        prontinho — avisamos você quando {colorLabel.toLowerCase()} voltar ao estoque 🐾
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-2xl bg-potinho-fundo px-4 py-3">
      <p className="text-xs font-medium text-potinho-texto/70">
        {colorLabel.toLowerCase()} está esgotada — deixe seu e-mail que avisamos quando voltar.
      </p>
      <div className="flex gap-2">
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu e-mail"
          data-testid="notify-color-email"
          className="min-w-0 flex-1 rounded-full border-2 border-potinho-bege bg-white px-4 py-2 text-sm text-potinho-texto placeholder:text-potinho-cinza focus:border-potinho-chocolate focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          data-testid="notify-color-submit"
          className="rounded-full bg-potinho-chocolate px-4 py-2 text-sm font-semibold lowercase text-potinho-bege transition-colors hover:bg-potinho-texto disabled:opacity-50"
        >
          avisar
        </button>
      </div>
      {status === "error" && <p className="text-xs text-rose-500">não deu certo — tente de novo.</p>}
    </form>
  );
}
