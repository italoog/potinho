import Link from "next/link";
import HeroCube from "@/components/home/HeroCube";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 px-6 py-16 font-sans">
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">Forja3D</h1>
        <p className="mt-2 max-w-md text-lg text-zinc-600">
          Produtos impressos em 3D, personalizados por você — veja o resultado ao vivo antes de
          comprar.
        </p>
      </header>
      <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-sm">
        <HeroCube />
        <p className="mt-2 text-center text-sm text-zinc-500">
          Arraste para girar · pinça para zoom
        </p>
      </div>
      <Link
        href="/p/comedouro-pet"
        className="rounded-full bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700"
      >
        Ver produto: Comedouro Pet Personalizado
      </Link>
    </div>
  );
}
