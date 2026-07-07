"use client";

import { useState } from "react";

/** Captura de e-mail "Avise-me" para cores esgotadas (demo: guarda em localStorage). */
export default function NotifyForm({ colorLabel }: { colorLabel: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    try {
      const key = "potinho-avise-me";
      const list = JSON.parse(localStorage.getItem(key) ?? "[]");
      list.push({ email, color: colorLabel, at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      // demo: segue mesmo sem storage
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p
        className="rounded-2xl bg-potinho-bege/60 px-5 py-4 text-sm font-medium text-potinho-chocolate"
        data-testid="notify-success"
      >
        prontinho! te avisamos assim que a cor {colorLabel} voltar. 🐾
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl bg-potinho-bege/40 p-5"
      data-testid="notify-form"
    >
      <p className="text-sm font-medium text-potinho-chocolate">
        a cor <strong>{colorLabel}</strong> está esgotada — deixe seu e-mail e avisamos quando
        voltar:
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="min-w-0 flex-1 rounded-full border-2 border-potinho-bege bg-white px-4 py-2.5 text-sm text-potinho-texto focus:border-potinho-chocolate focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-potinho-chocolate px-5 py-2.5 text-sm font-semibold lowercase text-potinho-bege hover:bg-potinho-texto"
        >
          avise-me
        </button>
      </div>
    </form>
  );
}
