import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";
import LoginForm from "@/components/conta/LoginForm";
import MinhasCompras from "@/components/conta/MinhasCompras";

export const metadata = { title: "minha conta — potinho", robots: { index: false } };

/** /conta (7.2 + 7.3) — form de login quando deslogado, lista de pedidos quando logado. */
export default async function ContaPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <main className="min-h-screen bg-potinho-fundo px-4 py-10 font-[family-name:var(--font-poppins)] text-potinho-texto sm:py-16">
      {session ? (
        <MinhasCompras
          userName={session.user.name || session.user.email.split("@")[0]}
          orders={await getOrdersForUser(session.user.id)}
        />
      ) : (
        <LoginForm />
      )}
    </main>
  );
}
