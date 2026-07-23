import { PawIcon } from "./Marquee";
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
    <div className="free-shipping-bar flex h-9 w-full items-center justify-center gap-1.5 bg-potinho-chocolate px-4 text-center text-xs font-normal lowercase tracking-wide text-potinho-bege sm:text-sm">
      <PawIcon className="h-4 w-4 shrink-0" />
      <span>
        <span className="font-bold">frete grátis</span> a partir de {freeShipping.minQuantity} potinhos
      </span>
    </div>
  );
}
