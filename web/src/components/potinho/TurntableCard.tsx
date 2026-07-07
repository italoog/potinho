"use client";

import { useCallback, useRef, useState } from "react";
import { getColor, type TurntableClip } from "@/lib/site-config";

/**
 * Card de produto com giro 360° em hover-to-play.
 * Desktop: play no mouseenter, pausa+reset no mouseleave.
 * Touch: primeiro toque dá play/pause.
 */
export default function TurntableCard({
  clip,
  onCustomize,
}: {
  clip: TurntableClip;
  onCustomize: (clip: TurntableClip) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const top = getColor(clip.colorTopId);
  const bottom = getColor(clip.colorBottomId);

  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play()
      .then(() => setPlaying(true))
      .catch(() => {
        // autoplay bloqueado: mantém o frame estático
      });
  }, []);

  const stop = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
    setPlaying(false);
  }, []);

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0_10px_40px_-18px_rgba(90,64,50,0.35)] transition-transform duration-300 hover:-translate-y-1"
      data-testid={`turntable-${clip.id}`}
    >
      <div
        className="relative aspect-square cursor-pointer overflow-hidden bg-potinho-fundo"
        onMouseEnter={play}
        onMouseLeave={stop}
        onTouchStart={(e) => {
          e.stopPropagation();
          if (playing) stop();
          else play();
        }}
      >
        <video
          ref={videoRef}
          src={clip.video}
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
        {clip.highlight && (
          <span className="absolute left-3 top-3 rounded-full bg-potinho-chocolate px-3 py-1 text-xs font-semibold lowercase text-potinho-bege">
            cores da potinho
          </span>
        )}
        <span
          className={`absolute bottom-3 right-3 rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-potinho-chocolate backdrop-blur transition-opacity ${
            playing ? "opacity-0" : "opacity-100"
          }`}
        >
          <span className="sm:hidden">toque · giro 360°</span>
          <span className="hidden sm:inline">passe o mouse · giro 360°</span>
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold lowercase text-potinho-texto">
            {top.label.toLowerCase()} + {bottom.label.toLowerCase()}
          </h3>
          <div className="flex -space-x-1">
            {[top, bottom].map((c) => (
              <span
                key={c.id}
                title={c.label}
                className={`h-6 w-6 rounded-full ${c.light ? "ring-1 ring-potinho-cinza" : ""}`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>
        <p className="text-sm text-potinho-texto/70">
          gravado com “{clip.petName.toLowerCase()}” — troque pelo nome do seu pet
        </p>
        <button
          type="button"
          onClick={() => onCustomize(clip)}
          className="mt-auto rounded-full bg-potinho-chocolate px-5 py-2.5 text-sm font-semibold lowercase text-potinho-bege transition-colors hover:bg-potinho-texto"
        >
          personalizar com essas cores
        </button>
      </div>
    </article>
  );
}
