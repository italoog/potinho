"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { SizeId } from "@/lib/site-config";

export interface CartItem {
  id: string;
  sizeId: SizeId;
  sizeLabel: string;
  colorTopId: string;
  colorBottomId: string;
  petName: string;
  priceCents: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
}

const CartContext = createContext<CartState | null>(null);

const STORAGE_KEY = "potinho-cart-demo";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // lê SÍNCRONO (antes do effect de persistência gravar []), aplica ASSÍNCRONO
    // (setState direto no corpo do effect dispara renders em cascata — regra do lint)
    let stored: CartItem[] | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch {
      // carrinho demo: ignora storage corrompido
    }
    if (!stored?.length) return;
    const loaded = stored;
    const raf = requestAnimationFrame(() => setItems(loaded));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // quota/privado: segue sem persistir
    }
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, "id">) => {
    setItems((prev) => [...prev, { ...item, id: crypto.randomUUID() }]);
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ items, isOpen, addItem, removeItem, clear, open, close }),
    [items, isOpen, addItem, removeItem, clear, open, close],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return ctx;
}
