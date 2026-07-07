"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import {
  getColor,
  heroVideo,
  macroVideo,
  turntableClips,
  type TurntableClip,
} from "@/lib/site-config";
import { CartProvider } from "./CartContext";
import CartUI from "./CartUI";
import Countdown from "./Countdown";
import Customizer, { type CustomizerSelection } from "./Customizer";
import Marquee, { BoneIcon, PawIcon } from "./Marquee";
import TurntableCard from "./TurntableCard";

// three.js só entra no bundle quando a home carrega no client (peso importa no celular)
const PotinhoViewer = dynamic(() => import("./PotinhoViewer"), {
  ssr: false,
  loading: () => (
    <div className="h-[46vh] min-h-72 w-full rounded-3xl bg-gradient-to-b from-white to-potinho-bege/60 lg:h-[62vh]" />
  ),
});

export default function PotinhoHome() {
  const [selection, setSelection] = useState<CustomizerSelection>({
    colorTopId: "bege",
    colorBottomId: "marrom",
  });
  const [petName, setPetName] = useState("");
  const customizerRef = useRef<HTMLDivElement>(null);

  const top = getColor(selection.colorTopId);
  const bottom = getColor(selection.colorBottomId);

  function customizeFromClip(clip: TurntableClip) {
    setSelection({ colorTopId: clip.colorTopId, colorBottomId: clip.colorBottomId });
    customizerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <CartProvider>
      <main className="min-h-screen bg-potinho-fundo font-[family-name:var(--font-poppins)] text-potinho-texto">
        <CartUI />

        {/* ===== HERO ===== */}
        <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={heroVideo.src}
            poster={heroVideo.poster}
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="absolute inset-0 bg-gradient-to-t from-potinho-texto/70 via-potinho-texto/20 to-potinho-texto/30" />

          <div className="potinho-fade-up relative z-10 flex flex-col items-center gap-6 px-6 text-center">
            <Image
              src="/brand/logo.png"
              alt="potinho — produtos para pets"
              width={120}
              height={120}
              priority
              className="h-24 w-24 rounded-full object-cover shadow-lg sm:h-28 sm:w-28"
            />
            <h1 className="text-5xl font-bold lowercase tracking-tight text-white drop-shadow-lg sm:text-7xl md:text-8xl">
              potinho
            </h1>
            <p className="max-w-xl text-base font-medium text-white/90 sm:text-xl">
              o comedouro elevado com o nome do seu pet, impresso em 3D e feito sob medida.
            </p>
            <Countdown />
            <a
              href="#produto"
              className="mt-2 rounded-full bg-white px-8 py-4 text-base font-semibold lowercase text-potinho-chocolate shadow-lg transition-transform hover:scale-105"
            >
              quero o meu 🐾
            </a>
          </div>
        </section>

        <Marquee />

        {/* ===== GRADE DE PRODUTO ===== */}
        <section id="produto" className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <PawIcon className="absolute left-4 top-10 h-10 w-10 rotate-[-15deg] text-potinho-bege" />
          <BoneIcon className="absolute right-6 top-24 h-12 w-12 rotate-12 text-potinho-bege" />

          <header className="mb-12 text-center">
            <h2 className="text-3xl font-bold lowercase text-potinho-chocolate sm:text-5xl">
              escolha as cores dele
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-potinho-texto/70">
              um único comedouro, do seu jeito: 3 tamanhos, 8 cores, e o nome gravado na peça.
              toque no card (ou passe o mouse) para ver o giro completo.
            </p>
          </header>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {turntableClips.map((clip) => (
              <TurntableCard key={clip.id} clip={clip} onCustomize={customizeFromClip} />
            ))}
          </div>

          {/* preview 3D à esquerda no desktop; no celular fica ACIMA do formulário */}
          <div className="mt-14 grid items-start gap-5 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
            <div className="flex flex-col gap-2 lg:sticky lg:top-24">
              <PotinhoViewer topHex={top.hex} bottomHex={bottom.hex} petName={petName} />
              <p className="text-center text-xs text-potinho-texto/55">
                prévia em tempo real: as cores e o nome que você escolher aparecem aqui na hora.
              </p>
            </div>

            <Customizer
              ref={customizerRef}
              selection={selection}
              onSelectionChange={setSelection}
              petName={petName}
              onPetNameChange={setPetName}
            />
          </div>

          <div className="mt-16 grid items-start gap-6 rounded-3xl bg-white/70 p-6 sm:p-8 lg:grid-cols-2 lg:gap-10">
            <div className="flex flex-col gap-4">
              <h3 className="text-3xl font-bold lowercase text-potinho-chocolate">
                do estoque pra casa dele
              </h3>
              <p className="text-potinho-texto/75">
                cada potinho é impresso sob demanda com as cores que você escolher e o nome do seu
                pet em relevo. a tigela de inox sai para lavar em segundos.
              </p>
              <Link
                href="/p/comedouro-pet"
                className="w-fit rounded-full border-2 border-potinho-chocolate px-6 py-3 text-sm font-semibold lowercase text-potinho-chocolate transition-colors hover:bg-potinho-chocolate hover:text-potinho-bege"
              >
                abrir a loja 3D →
              </Link>
            </div>
            <ul className="flex flex-col gap-3 text-sm font-medium text-potinho-texto/80">
              {[
                "altura ergonômica: postura mais confortável para comer",
                "tigela de inox removível e fácil de higienizar",
                "impressão 3D sob demanda, sem estoque parado",
                "nome do pet gravado em relevo — de verdade, na peça",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <PawIcon className="mt-0.5 h-4 w-4 shrink-0 text-potinho-chocolate" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Marquee inverted />

        {/* ===== PERSONALIZAÇÃO / MANIFESTO ===== */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="overflow-hidden rounded-3xl shadow-[0_20px_60px_-25px_rgba(90,64,50,0.5)]">
              <video
                className="aspect-video h-full w-full object-cover"
                src={macroVideo.src}
                poster={macroVideo.poster}
                autoPlay
                muted
                loop
                playsInline
              />
            </div>
            <div className="flex flex-col gap-5">
              <span className="w-fit rounded-full bg-potinho-bege px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-potinho-chocolate">
                personalização
              </span>
              <h2 className="text-3xl font-bold lowercase leading-tight text-potinho-chocolate sm:text-5xl">
                feito para o seu pet,
                <br />
                com o nome dele.
              </h2>
              <p className="text-lg text-potinho-texto/75">
                não é adesivo, não é pintura: o nome nasce junto com a peça, gravado em relevo na
                impressão. cada letra tem a textura de algo feito à mão — porque foi feito só para
                ele.
              </p>
              <a
                href="#produto"
                className="w-fit rounded-full bg-potinho-chocolate px-8 py-4 text-base font-semibold lowercase text-potinho-bege transition-colors hover:bg-potinho-texto"
              >
                gravar o nome do meu pet
              </a>
            </div>
          </div>
        </section>

        {/* ===== RODAPÉ ===== */}
        <footer className="bg-potinho-chocolate px-6 py-12 text-potinho-bege">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center">
            <Image
              src="/brand/logo.png"
              alt=""
              width={72}
              height={72}
              className="h-16 w-16 rounded-full object-cover"
            />
            <p className="text-2xl font-bold lowercase">potinho</p>
            <p className="max-w-md text-sm text-potinho-bege/80">
              produtos para pets, feitos com carinho e impressos sob medida no Brasil.
            </p>
            <div className="mt-2 flex gap-6 text-sm">
              <Link href="/p/comedouro-pet" className="hover:underline">
                loja 3D
              </Link>
              <Link href="/privacidade" className="hover:underline">
                privacidade
              </Link>
            </div>
            <p className="mt-4 text-xs text-potinho-bege/60">
              © {new Date().getFullYear()} potinho · site de demonstração — checkout sem
              processamento real
            </p>
          </div>
        </footer>
      </main>
    </CartProvider>
  );
}
