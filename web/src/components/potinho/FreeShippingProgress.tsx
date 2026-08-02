import { PartyPopper } from "lucide-react";
import { freeShipping } from "@/lib/site-config";
import { PawIcon } from "./Marquee";

/**
 * Gatilho de "falta pouco" pro frete grátis — carrinho e checkout (mesma promoção da
 * FreeShippingBar). Some com carrinho vazio (nada a comemorar ainda) e com a promo desligada.
 */
export default function FreeShippingProgress({ itemCount }: { itemCount: number }) {
  if (!freeShipping.enabled || itemCount === 0) return null;

  const remaining = Math.max(0, freeShipping.minQuantity - itemCount);
  const progress = Math.min(1, itemCount / freeShipping.minQuantity);
  const reached = remaining === 0;

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-potinho-fundo px-4 py-3.5" data-testid="free-shipping-progress">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-potinho-texto">
        {reached ? (
          <>
            <PartyPopper className="h-4 w-4 shrink-0 text-potinho-chocolate" />
            <span className="text-potinho-chocolate">frete grátis garantido!</span>
          </>
        ) : (
          <>
            falta <span className="text-potinho-chocolate">{remaining}</span>{" "}
            {remaining === 1 ? "potinho" : "potinhos"} pro frete grátis
            <PawIcon className="h-3.5 w-3.5 shrink-0 text-potinho-chocolate" />
          </>
        )}
      </p>
      <div className="h-3 w-full overflow-hidden rounded-full bg-potinho-bege">
        <div
          className="h-full rounded-full bg-potinho-chocolate transition-[width] duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
