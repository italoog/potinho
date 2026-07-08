"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { type CartCheckoutItem, clearCart, readCart, writeCart } from "@/lib/cart-storage";

export interface CartEntry extends CartCheckoutItem {
  cartId: string;
}

interface CartState {
  items: CartEntry[];
  isOpen: boolean;
  addItem: (item: CartCheckoutItem) => void;
  removeItem: (cartId: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
}

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  // Só persiste depois que a hidratação inicial resolveu — senão o efeito de persistência
  // roda antes do rAF abaixo e grava [] por cima do carrinho real (setState assíncrono).
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readCart() as CartEntry[];
    if (stored.length === 0) {
      setHydrated(true);
      return;
    }
    const raf = requestAnimationFrame(() => {
      setItems(stored);
      setHydrated(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeCart(items);
  }, [items, hydrated]);

  const addItem = useCallback((item: CartCheckoutItem) => {
    setItems((prev) => [...prev, { ...item, cartId: crypto.randomUUID() }]);
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((cartId: string) => {
    setItems((prev) => prev.filter((i) => i.cartId !== cartId));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    clearCart();
  }, []);
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
