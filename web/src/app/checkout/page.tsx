"use client";

import { CartProvider } from "@/components/potinho/CartContext";
import CheckoutForm from "@/components/checkout/CheckoutForm";

/** /checkout (6.1) — o carrinho vive em sessionStorage, hidratado pelo mesmo CartProvider da home. */
export default function CheckoutPage() {
  return (
    <CartProvider>
      <main className="min-h-screen bg-potinho-fundo px-4 pb-10 pt-24 font-[family-name:var(--font-poppins)] text-potinho-texto sm:pb-16">
        <CheckoutForm />
      </main>
    </CartProvider>
  );
}
