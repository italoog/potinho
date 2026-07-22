import { describe, expect, it, vi } from "vitest";

/**
 * requireAdminSession (defesa em profundidade, 6.3): toda rota/action do admin passa por aqui,
 * não só o layout/proxy. Sem teste, uma regressão aqui abriria o admin pra qualquer conta logada.
 */

const getSession = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuth: async () => ({ api: { getSession } }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { requireAdminSession } = await import("./admin-auth");

describe("requireAdminSession", () => {
  it("devolve null quando não há sessão", async () => {
    getSession.mockResolvedValue(null);
    expect(await requireAdminSession()).toBeNull();
  });

  it("devolve null quando a sessão existe mas o usuário não é admin", async () => {
    getSession.mockResolvedValue({ user: { role: "customer" } });
    expect(await requireAdminSession()).toBeNull();
  });

  it("devolve a sessão quando o usuário é admin", async () => {
    const session = { user: { role: "admin", email: "admin@potinho.com.br" } };
    getSession.mockResolvedValue(session);
    expect(await requireAdminSession()).toBe(session);
  });
});
