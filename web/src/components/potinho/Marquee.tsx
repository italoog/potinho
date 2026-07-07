import { marqueePhrases } from "@/lib/site-config";

/** Faixa rolante entre seções. Duplica o conteúdo para o loop ser contínuo. */
export default function Marquee({ inverted = false }: { inverted?: boolean }) {
  const items = [...marqueePhrases, ...marqueePhrases];
  return (
    <div
      aria-hidden
      className={`overflow-hidden py-4 ${
        inverted ? "bg-potinho-bege text-potinho-chocolate" : "bg-potinho-chocolate text-potinho-bege"
      }`}
    >
      <div className="potinho-marquee-track flex w-max items-center gap-8 whitespace-nowrap">
        {items.map((phrase, i) => (
          <span
            key={i}
            className="flex items-center gap-8 text-lg font-semibold lowercase tracking-wide"
          >
            {phrase}
            <PawIcon className="h-5 w-5 opacity-70" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function PawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <ellipse cx="7" cy="8.5" rx="2" ry="2.6" />
      <ellipse cx="12" cy="7" rx="2" ry="2.6" />
      <ellipse cx="17" cy="8.5" rx="2" ry="2.6" />
      <path d="M12 11.5c-3 0-5.5 2.2-5.5 4.6 0 1.6 1.2 2.4 2.6 2.4 1 0 1.9-.4 2.9-.4s1.9.4 2.9.4c1.4 0 2.6-.8 2.6-2.4 0-2.4-2.5-4.6-5.5-4.6Z" />
    </svg>
  );
}

export function BoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M7.5 6A2.5 2.5 0 0 0 5 8.5c0 .6.2 1.1.5 1.5-.3.4-.5.9-.5 1.5a2.5 2.5 0 0 0 4.4 1.6l5.2 0A2.5 2.5 0 0 0 19 11.5c0-.6-.2-1.1-.5-1.5.3-.4.5-.9.5-1.5a2.5 2.5 0 0 0-4.4-1.6l-5.2 0A2.5 2.5 0 0 0 7.5 6Z" />
    </svg>
  );
}
