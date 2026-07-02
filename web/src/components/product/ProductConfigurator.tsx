"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { Product } from "@/lib/products";
import { formatBRL } from "@/lib/money";
import {
  selectConfiguration,
  selectIsComplete,
  selectTotalCents,
  usePersonalization,
} from "@/store/personalization";
import ProductViewer from "@/components/viewer/ProductViewer";
import PersonalizationForm from "./PersonalizationForm";

/**
 * Página de produto: visualizador + formulário dinâmico + preço ao vivo (C-03)
 * → leva a configuração para o checkout (Épico 3).
 */
export default function ProductConfigurator({ product }: { product: Product }) {
  const init = usePersonalization((s) => s.init);
  const total = usePersonalization(selectTotalCents);
  const isComplete = usePersonalization(selectIsComplete);

  useEffect(() => {
    init({
      basePrice: product.basePrice,
      variants: product.variants,
      paramSchema: product.paramSchema,
    });
  }, [init, product]);

  function goToCheckout() {
    const config = selectConfiguration(usePersonalization.getState());
    sessionStorage.setItem(
      "forja3d:checkout",
      JSON.stringify({ productId: product.id, slug: product.slug, configuration: config }),
    );
  }

  const textParam = product.paramSchema.find((p) => p.type === "text");
  const fontUrl = textParam ? "/fonts/Anton-Regular.ttf" : undefined;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-10">
      <div className="lg:sticky lg:top-6 lg:h-fit lg:flex-1">
        <ProductViewer />
      </div>

      <div className="flex flex-col gap-6 lg:w-96">
        <header>
          <h1 className="text-2xl font-bold text-zinc-900">{product.name}</h1>
          <p className="mt-1 text-sm leading-relaxed text-zinc-600">{product.description}</p>
        </header>

        <PersonalizationForm fontUrl={fontUrl} />

        <div className="sticky bottom-0 -mx-4 border-t border-zinc-200 bg-white/95 px-4 py-4 backdrop-blur lg:static lg:mx-0 lg:rounded-2xl lg:border lg:p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm text-zinc-600">Total</span>
            <span className="text-2xl font-bold text-zinc-900">
              {total !== null ? formatBRL(total) : "—"}
            </span>
          </div>
          <Link
            href={isComplete ? `/checkout/${product.slug}` : "#"}
            onClick={(e) => {
              if (!isComplete) {
                e.preventDefault();
                return;
              }
              goToCheckout();
            }}
            aria-disabled={!isComplete}
            className={`block w-full rounded-xl px-6 py-4 text-center text-base font-semibold transition-colors ${
              isComplete
                ? "bg-zinc-900 text-white hover:bg-zinc-700"
                : "cursor-not-allowed bg-zinc-200 text-zinc-400"
            }`}
          >
            {isComplete ? "Finalizar pedido" : "Complete a personalização"}
          </Link>
          <p className="mt-2 text-center text-xs text-zinc-500">
            Pagamento seguro via Stripe · o preço final é confirmado no servidor
          </p>
        </div>
      </div>
    </div>
  );
}
