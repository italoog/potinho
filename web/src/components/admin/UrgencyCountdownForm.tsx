"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UrgencyCountdownConfig } from "@/lib/urgency-countdown";

const CARD_CLASS = "rounded-3xl bg-white p-6 shadow-potinho-card dark:bg-potinho-carvao";
const SECTION_LABEL_CLASS = "mb-1 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate dark:text-potinho-caramelo";
const FIELD_LABEL_CLASS = "flex flex-col gap-1 text-xs text-potinho-texto/60 dark:text-potinho-bege/60";
const FUNDO_INPUT_CLASS = "rounded-2xl border-2 border-potinho-bege bg-potinho-fundo px-4 py-2.5 text-sm dark:border-potinho-cinza/30 dark:bg-potinho-noite dark:text-potinho-bege";
const SOLID_BUTTON_CLASS = "rounded-full bg-potinho-chocolate px-5 py-2 text-sm font-semibold lowercase text-potinho-bege hover:bg-potinho-texto disabled:opacity-40";

/**
 * Contador de urgência da FreeShippingBar (gatilho psicológico, não bloqueia nada quando zera).
 * Cada visitante tem a própria contagem, guardada no localStorage do navegador dele —
 * aqui só se configura a duração de cada contagem e o texto exibido.
 */
export default function UrgencyCountdownForm({ config }: { config: UrgencyCountdownConfig }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(config.enabled);
  const [hours, setHours] = useState(String(Math.floor(config.durationMinutes / 60)));
  const [minutes, setMinutes] = useState(String(config.durationMinutes % 60));
  const [label, setLabel] = useState(config.label);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveState("saving");
    setError(null);
    try {
      const durationMinutes = Math.max(1, (parseInt(hours || "0", 10) || 0) * 60 + (parseInt(minutes || "0", 10) || 0));
      const res = await fetch("/api/admin/configuracoes/urgencia", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, durationMinutes, label }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível salvar");
      setSaveState("saved");
      router.refresh();
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Não foi possível salvar");
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${CARD_CLASS} flex flex-col gap-4`}>
      <div>
        <h2 className={SECTION_LABEL_CLASS}>contador de urgência (barra de frete grátis)</h2>
        <p className="text-xs text-potinho-texto/60 dark:text-potinho-bege/60">
          quando a pessoa abre o site pela 1ª vez, começa uma contagem regressiva salva no navegador dela
          (localStorage). ao zerar, o contador só para em 00:00:00 — não desativa nem esconde nada.
        </p>
      </div>

      <label className="flex items-center gap-3 text-sm text-potinho-texto dark:text-potinho-bege">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-5 w-5 shrink-0 rounded accent-potinho-chocolate"
        />
        contador ativo
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className={FIELD_LABEL_CLASS}>
          horas
          <input
            type="number"
            min={0}
            max={168}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className={FUNDO_INPUT_CLASS}
          />
        </label>
        <label className={FIELD_LABEL_CLASS}>
          minutos
          <input
            type="number"
            min={0}
            max={59}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className={FUNDO_INPUT_CLASS}
          />
        </label>
        <label className={`${FIELD_LABEL_CLASS} sm:col-span-1`}>
          texto exibido
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={60}
            className={FUNDO_INPUT_CLASS}
          />
        </label>
      </div>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saveState === "saving"} className={SOLID_BUTTON_CLASS}>
          {saveState === "saving" ? "salvando…" : "salvar"}
        </button>
        {saveState === "saved" && <span className="text-sm text-potinho-chocolate dark:text-potinho-caramelo">salvo ✓</span>}
      </div>
    </form>
  );
}
