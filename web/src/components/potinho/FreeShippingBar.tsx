"use client";

import { useEffect, useState } from "react";
import { freeShipping } from "@/lib/site-config";
import type { UrgencyCountdownConfig } from "@/lib/urgency-countdown";

const STORAGE_KEY = "potinho-urgency-start";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor(totalSeconds / 3_600) % 24;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = totalSeconds % 60;
  const hms = [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
  return days > 0 ? `${days}d ${hms}` : hms;
}

/**
 * Gatilho de urgência psicológico: cada visitante ganha a própria contagem regressiva na
 * 1ª vez que abre o site, guardada no localStorage (não é um prazo real da loja). Ao zerar,
 * fica parado em 00:00:00 — não desativa nem esconde nada, é só pressão visual.
 */
function useUrgencyRemaining(config: UrgencyCountdownConfig): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!config.enabled) return;
    const durationMs = config.durationMinutes * 60_000;

    let start = Number(localStorage.getItem(STORAGE_KEY));
    if (!start) {
      start = Date.now();
      localStorage.setItem(STORAGE_KEY, String(start));
    }

    function tick() {
      setRemaining(Math.max(0, durationMs - (Date.now() - start)));
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [config.enabled, config.durationMinutes]);

  return remaining;
}

/**
 * Barra fixa no topo destacando a promoção de frete grátis (site-config.ts) e o contador de
 * urgência (configurável em /admin/configuracoes). Some no admin via CSS puro — regra
 * `body:has(#admin-root) .free-shipping-bar` em globals.css.
 * Começa um pouco maior (h-12) e encolhe pro tamanho padrão (h-9) ao rolar a página. O wrapper
 * fora do `fixed` reserva o mesmo espaço no fluxo normal, então o conteúdo da página nunca fica
 * por baixo dela nem precisa de um padding-top manual sincronizado à mão.
 */
export default function FreeShippingBar({ urgencyCountdown }: { urgencyCountdown: UrgencyCountdownConfig }) {
  const [scrolled, setScrolled] = useState(false);
  const remaining = useUrgencyRemaining(urgencyCountdown);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!freeShipping.enabled) return null;

  const heightClass = scrolled ? "h-9" : "h-12";

  return (
    <div className={`free-shipping-bar w-full ${heightClass} transition-[height] duration-300`}>
      <div
        className={`fixed inset-x-0 top-0 z-40 flex w-full items-center justify-center gap-2 bg-potinho-chocolate px-4 text-center text-xs font-normal lowercase tracking-wide text-potinho-bege transition-[height] duration-300 sm:text-sm ${heightClass}`}
      >
        <span>
          <span className="font-bold">frete grátis</span>&nbsp;a partir de {freeShipping.minQuantity} potinhos
        </span>
        {urgencyCountdown.enabled && remaining !== null && (
          <span className="whitespace-nowrap">
            · {urgencyCountdown.label}:{" "}
            <span className="font-bold tabular-nums">{formatRemaining(remaining)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
