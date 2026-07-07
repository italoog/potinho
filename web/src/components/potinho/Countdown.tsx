"use client";

import { useEffect, useState } from "react";
import { dropCountdown } from "@/lib/site-config";

interface Remaining {
  d: number;
  h: number;
  m: number;
  s: number;
}

function remainingUntil(target: number): Remaining | null {
  const diff = target - Date.now();
  if (diff <= 0) return null;
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor(diff / 3_600_000) % 24,
    m: Math.floor(diff / 60_000) % 60,
    s: Math.floor(diff / 1_000) % 60,
  };
}

export default function Countdown() {
  const [now, setNow] = useState<Remaining | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!dropCountdown.enabled) return;
    const target = new Date(dropCountdown.target).getTime();
    // primeiro tick assíncrono: setState direto no corpo do effect viola o lint de cascata
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      setNow(remainingUntil(target));
    });
    const t = setInterval(() => setNow(remainingUntil(target)), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, []);

  // Flag desativada ou drop já aconteceu → não renderiza nada.
  if (!dropCountdown.enabled || !mounted || !now) return null;

  const cells: Array<[number, string]> = [
    [now.d, "dias"],
    [now.h, "horas"],
    [now.m, "min"],
    [now.s, "seg"],
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/85">
        {dropCountdown.label}
      </span>
      <div className="flex gap-2 sm:gap-3">
        {cells.map(([value, label]) => (
          <div
            key={label}
            className="flex w-16 flex-col items-center rounded-2xl bg-white/15 px-2 py-2 backdrop-blur-md sm:w-20 sm:py-3"
          >
            <span className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
              {String(value).padStart(2, "0")}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-white/75 sm:text-xs">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
