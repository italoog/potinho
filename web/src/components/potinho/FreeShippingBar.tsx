"use client";

import { useEffect, useRef, useState } from "react";
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
 * Começa um pouco maior e encolhe ao rolar. Como o texto quebra linha em telas estreitas
 * (mobile é a maioria do tráfego), a altura não pode ser um valor fixo: o wrapper renderiza
 * o MESMO conteúdo duas vezes — uma via `visibility:hidden` no fluxo normal (só pra reservar
 * o espaço certo, inclusive quando quebra linha) e outra fixa por cima, visível. Como as duas
 * cópias têm exatamente as mesmas classes/conteúdo, elas sempre quebram linha juntas, sem
 * precisar medir altura via JS.
 */
export default function FreeShippingBar({ urgencyCountdown }: { urgencyCountdown: UrgencyCountdownConfig }) {
  const [scrolled, setScrolled] = useState(false);
  const remaining = useUrgencyRemaining(urgencyCountdown);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Botões fixos (carrinho, conta, voltar) ancoram em --fsb-h pra nunca ficar por baixo da
  // barra nem flutuar longe demais dela quando o texto quebra linha (CartUI.tsx, BackToStoreButton.tsx).
  useEffect(() => {
    const el = barRef.current;
    // Sem barra na tela (promoção desligada), a âncora tem que ser 0 — senão os botões
    // ficariam deslocados pelo fallback do CSS como se a barra existisse.
    if (!el) {
      document.documentElement.style.setProperty("--fsb-h", "0px");
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty("--fsb-h", `${entry.contentRect.height}px`);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!freeShipping.enabled) return null;

  const paddingClass = scrolled ? "py-2.5" : "py-4";
  const content = (
    <>
      <span>
        <span className="font-bold">frete grátis</span>&nbsp;a partir de {freeShipping.minQuantity} potinhos
      </span>
      {urgencyCountdown.enabled && remaining !== null && (
        <span>
          · {urgencyCountdown.label}: <span className="font-bold tabular-nums">{formatRemaining(remaining)}</span>
        </span>
      )}
    </>
  );
  const barClass = `flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-4 text-center text-xs font-normal lowercase leading-snug tracking-wide transition-[padding] duration-300 sm:text-sm ${paddingClass}`;

  return (
    <div className="free-shipping-bar w-full">
      <div aria-hidden className={`invisible ${barClass}`}>
        {content}
      </div>
      <div ref={barRef} className={`fixed inset-x-0 top-0 z-40 bg-potinho-chocolate text-potinho-bege ${barClass}`}>
        {content}
      </div>
    </div>
  );
}
