"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "potinho-admin-theme";

function applyTheme(dark: boolean) {
  document.getElementById("admin-root")?.classList.toggle("dark", dark);
}

/** Alterna dark mode só da área admin (9.6) — escopo via #admin-root, nunca afeta a loja. */
export default function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.getElementById("admin-root")?.classList.contains("dark") ?? false);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "ativar modo claro" : "ativar modo escuro"}
      data-testid="admin-dark-mode-toggle"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-potinho-texto/60 transition-colors hover:bg-potinho-fundo hover:text-potinho-chocolate dark:text-potinho-bege/60 dark:hover:bg-white/5 dark:hover:text-potinho-caramelo"
    >
      {dark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4.5 w-4.5">
          <circle cx="12" cy="12" r="4.5" strokeLinecap="round" />
          <path
            strokeLinecap="round"
            d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4.5 w-4.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" />
        </svg>
      )}
    </button>
  );
}
