import { headers } from "next/headers";
import { getAuth } from "./auth";

/** Defesa em profundidade (seção 6.3): toda rota/action do admin confere role, não só o layout/proxy. */
export async function requireAdminSession() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") return null;
  return session;
}
