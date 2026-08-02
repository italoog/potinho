import { describe, expect, it, vi } from "vitest";

const getSessionCookie = vi.fn();
vi.mock("better-auth/cookies", () => ({ getSessionCookie }));

const { proxy } = await import("./proxy");

function req(url: string): Request {
  return new Request(url);
}

describe("proxy (9.1 AC1 / 7.3 AC1 — protege /admin e /conta/pedidos)", () => {
  it("sem sessão: redireciona pra /conta", () => {
    getSessionCookie.mockReturnValue(null);
    const res = proxy(req("http://localhost/admin/pedidos") as never);
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toBe("http://localhost/conta");
  });

  it("com sessão: deixa passar (sem resposta, sem redirecionar)", () => {
    getSessionCookie.mockReturnValue("session-token");
    const res = proxy(req("http://localhost/admin/pedidos") as never);
    expect(res).toBeUndefined();
  });
});
