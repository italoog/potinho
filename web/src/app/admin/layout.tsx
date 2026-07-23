import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import DarkModeToggle from "@/components/admin/DarkModeToggle";

export const metadata = { title: "admin — potinho", robots: { index: false } };

const NAV = [
  { href: "/admin", label: "resumo" },
  { href: "/admin/pedidos", label: "pedidos" },
  { href: "/admin/pedidos/novo", label: "criar pedido" },
  { href: "/admin/produto", label: "produto" },
  { href: "/admin/cupons", label: "cupons" },
  { href: "/admin/avise-me", label: "avise-me" },
];

/**
 * Fundação do admin (9.1) — layout server-side checa role==="admin" e responde 404
 * pra quem está logado sem ser admin (AC2: não revela que a rota existe). Defesa em
 * profundidade: cada action/route do admin também confere a role (A8, seção 6.3).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") notFound();

  return (
    <div
      id="admin-root"
      className="min-h-screen bg-potinho-fundo font-[family-name:var(--font-poppins)] text-potinho-texto dark:bg-potinho-noite dark:text-potinho-bege"
    >
      {/* ponytail: script inline pra aplicar .dark antes do 1º paint (evita flash) — mesmo padrão de bibliotecas como next-themes */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{var t=localStorage.getItem('potinho-admin-theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.getElementById('admin-root').classList.add('dark')}catch(e){}",
        }}
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row">
        <nav className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-white p-2 shadow-potinho-card dark:bg-potinho-carvao lg:w-56 lg:flex-col lg:items-stretch">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-semibold lowercase text-potinho-texto/70 transition-colors hover:bg-potinho-fundo hover:text-potinho-chocolate dark:text-potinho-bege/70 dark:hover:bg-white/5 dark:hover:text-potinho-caramelo"
            >
              {item.label}
            </Link>
          ))}
          <div className="ml-auto lg:ml-0 lg:mt-2 lg:border-t lg:border-potinho-bege lg:pt-2 lg:dark:border-potinho-cinza/20">
            <DarkModeToggle />
          </div>
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
