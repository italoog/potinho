import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const updateUrgencyCountdown = vi.fn();
vi.mock("@/lib/urgency-countdown", () => ({ updateUrgencyCountdown }));

const { PATCH } = await import("./route");

function req(body: unknown): Request {
  return new Request("http://localhost/api/admin/configuracoes/urgencia", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("PATCH /api/admin/configuracoes/urgencia", () => {
  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await PATCH(req({ enabled: true, durationMinutes: 60, label: "oferta" }));
    expect(res.status).toBe(404);
    expect(updateUrgencyCountdown).not.toHaveBeenCalled();
  });

  it("rejeita body inválido (400)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const res = await PATCH(req({ enabled: true, durationMinutes: 0, label: "" }));
    expect(res.status).toBe(400);
    expect(updateUrgencyCountdown).not.toHaveBeenCalled();
  });

  it("salva a config válida", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const res = await PATCH(req({ enabled: false, durationMinutes: 120, label: "última chance" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(updateUrgencyCountdown).toHaveBeenCalledWith({
      enabled: false,
      durationMinutes: 120,
      label: "última chance",
    });
  });

  it("devolve 400 quando updateUrgencyCountdown falha", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    updateUrgencyCountdown.mockRejectedValue(new Error("db indisponível"));
    const res = await PATCH(req({ enabled: true, durationMinutes: 60, label: "oferta" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Não foi possível salvar" });
  });
});
