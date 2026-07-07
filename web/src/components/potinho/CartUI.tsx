"use client";

import { useState } from "react";
import { formatBRL, getColor } from "@/lib/site-config";
import { useCart } from "./CartContext";
import { PawIcon } from "./Marquee";

/** Botão de carrinho fixo (sticky) + gaveta com checkout de demonstração. */
export default function CartUI() {
  const { items, isOpen, open, close, removeItem, clear } = useCart();
  const [confirmed, setConfirmed] = useState(false);

  const total = items.reduce((sum, i) => sum + i.priceCents, 0);

  function handleDemoCheckout() {
    setConfirmed(true);
    clear();
  }

  return (
    <>
      {/* Botão fixo */}
      <button
        type="button"
        onClick={open}
        aria-label={`abrir carrinho (${items.length} itens)`}
        data-testid="cart-button"
        className="fixed right-5 top-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-potinho-chocolate text-potinho-bege shadow-lg transition-transform hover:scale-105"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
          <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="17" cy="20" r="1.4" fill="currentColor" stroke="none" />
          <path d="M3 4h2.2l2.4 11.2a1.6 1.6 0 0 0 1.57 1.3h7.9a1.6 1.6 0 0 0 1.56-1.23L20.5 8H6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {items.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-400 text-xs font-bold text-white">
            {items.length}
          </span>
        )}
      </button>

      {/* Gaveta */}
      {isOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-label="carrinho">
          <div className="absolute inset-0 bg-potinho-texto/40 backdrop-blur-sm" onClick={close} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-potinho-fundo shadow-2xl">
            <header className="flex items-center justify-between border-b border-potinho-bege p-5">
              <h2 className="text-xl font-bold lowercase text-potinho-texto">seu carrinho</h2>
              <button
                type="button"
                onClick={close}
                aria-label="fechar carrinho"
                className="rounded-full p-2 text-potinho-chocolate hover:bg-potinho-bege"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              {confirmed && items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <PawIcon className="h-12 w-12 text-potinho-chocolate" />
                  <p className="text-lg font-semibold lowercase text-potinho-texto">
                    pedido demo confirmado!
                  </p>
                  <p className="text-sm text-potinho-texto/60">
                    isto é um checkout de demonstração — nenhum pagamento foi processado.
                  </p>
                </div>
              ) : items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <PawIcon className="h-12 w-12 text-potinho-cinza" />
                  <p className="text-sm text-potinho-texto/60">
                    seu carrinho está vazio — monte um potinho pro seu pet!
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-4">
                  {items.map((item) => {
                    const top = getColor(item.colorTopId);
                    const bottom = getColor(item.colorBottomId);
                    return (
                      <li
                        key={item.id}
                        className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
                      >
                        <div className="flex -space-x-1">
                          {[top, bottom].map((c) => (
                            <span
                              key={c.id}
                              className={`h-8 w-8 rounded-full ${c.light ? "ring-1 ring-potinho-cinza" : ""}`}
                              style={{ backgroundColor: c.hex }}
                            />
                          ))}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold uppercase tracking-wider text-potinho-texto">
                            {item.petName}
                          </p>
                          <p className="text-xs text-potinho-texto/60">
                            {item.sizeLabel} · {top.label.toLowerCase()} + {bottom.label.toLowerCase()}
                          </p>
                        </div>
                        <span className="font-bold text-potinho-chocolate">
                          {formatBRL(item.priceCents)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label="remover item"
                          className="rounded-full p-1.5 text-potinho-cinza hover:bg-potinho-bege hover:text-potinho-chocolate"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                          </svg>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <footer className="border-t border-potinho-bege p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm uppercase tracking-widest text-potinho-texto/60">
                    total
                  </span>
                  <span className="text-2xl font-bold text-potinho-chocolate">
                    {formatBRL(total)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDemoCheckout}
                  data-testid="demo-checkout"
                  className="w-full rounded-full bg-potinho-chocolate py-4 text-base font-semibold lowercase text-potinho-bege hover:bg-potinho-texto"
                >
                  finalizar pedido (demonstração)
                </button>
                <p className="mt-2 text-center text-xs text-potinho-texto/50">
                  sem processamento real de pagamento
                </p>
              </footer>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
