import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const notifyAllForColor = vi.fn();
vi.mock("@/lib/admin-notify", () => ({ notifyAllForColor }));

const { POST } = await import("./route");

function req(body: unknown): Request {
  return new Request("http://localhost/api/admin/avise-me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/admin/avise-me", () => {
  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await POST(req({ colorId: "#123", colorLabel: "Azul" }));
    expect(res.status).toBe(404);
    expect(notifyAllForColor).not.toHaveBeenCalled();
  });

  it("rejeita body inválido (400)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const res = await POST(req({ colorId: "" }));
    expect(res.status).toBe(400);
  });

  it("notifica e devolve a contagem", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    notifyAllForColor.mockResolvedValue(7);
    const res = await POST(req({ colorId: "#3D6EB5", colorLabel: "Azul" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 7 });
    expect(notifyAllForColor).toHaveBeenCalledWith("#3D6EB5", "Azul");
  });
});
