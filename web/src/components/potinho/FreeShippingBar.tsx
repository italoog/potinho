import { freeShipping } from "@/lib/site-config";

/**
 * Barra fixa no topo destacando a promoção de frete grátis (site-config.ts). Renderiza em
 * toda página (vem do root layout), mas fica escondida no admin via CSS puro — regra
 * `body:has(#admin-root)` em globals.css — sem usePathname()/"use client" nem risco de
 * mismatch de hidratação.
 */
export default function FreeShippingBar() {
  if (!freeShipping.enabled) return null;

  return (
    <div className="free-shipping-bar flex h-9 w-full items-center justify-center bg-potinho-chocolate px-4 text-center text-xs font-semibold lowercase tracking-wide text-potinho-bege sm:text-sm">
      🐾 frete grátis a partir de {freeShipping.minQuantity} potinhos
    </div>
  );
}
