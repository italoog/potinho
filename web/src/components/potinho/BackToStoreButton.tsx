"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Botão fixo (canto esquerdo) pra voltar pra vitrine — some na própria home e no admin (tem nav própria). */
export default function BackToStoreButton() {
  const pathname = usePathname();
  if (pathname === "/" || pathname.startsWith("/admin")) return null;

  return (
    <Link
      href="/"
      aria-label="voltar pra vitrine"
      data-testid="back-to-store-button"
      className="fixed left-5 top-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-potinho-bege text-potinho-chocolate shadow-lg transition-transform hover:scale-105"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
        <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
