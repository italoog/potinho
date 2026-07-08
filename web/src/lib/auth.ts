import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import * as schema from "@/db/schema";
import { getDb } from "@/db";
import { sendMagicLinkEmail } from "./email";
import { provisionNewUser } from "./account-provisioning";

/**
 * Auth (7.1, A1/A2): Better Auth com login por magic link (sem senha).
 * Admin = mesma conta + coluna `role`, promovida automaticamente no primeiro
 * login se o e-mail estiver em ADMIN_EMAILS (env, lista separada por vírgula).
 *
 * `getAuth()` é preguiçoso (mesmo padrão de `getDb()`, cache em globalThis):
 * `next build` avalia páginas/rotas em vários workers em paralelo, e um
 * `await getDb()` no topo do módulo faria cada worker tentar inicializar o
 * mesmo diretório PGlite ao mesmo tempo (corrida de arquivo).
 */
async function createAuth() {
  const db = await getDb();
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
    advanced: {
      database: { generateId: "uuid" },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 dias
      updateAge: 60 * 60 * 24, // renovação deslizante diária
    },
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "customer", input: false },
      },
    },
    plugins: [
      magicLink({
        expiresIn: 60 * 15, // 15 min, uso único (padrão do plugin)
        sendMagicLink: async ({ email, url }) => {
          await sendMagicLinkEmail(email, url);
        },
      }),
      nextCookies(),
    ],
    databaseHooks: {
      user: {
        create: {
          // A2/A3: promove a admin se aplicável e vincula pedidos guest feitos com o mesmo e-mail.
          after: async (user) => {
            await provisionNewUser(user.id, user.email);
          },
        },
      },
    },
  });
}

type Auth = Awaited<ReturnType<typeof createAuth>>;
const globalCache = globalThis as unknown as { __potinhoAuth?: Promise<Auth> };

export function getAuth(): Promise<Auth> {
  if (!globalCache.__potinhoAuth) {
    globalCache.__potinhoAuth = createAuth();
  }
  return globalCache.__potinhoAuth;
}
