import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const addProductColor = vi.fn();
const removeProductColor = vi.fn();
vi.mock("@/lib/products", () => ({ addProductColor, removeProductColor }));

const { POST, DELETE } = await import("./route");

const productId = crypto.randomUUID();

function req(method: string, body: unknown): Request {
  return new Request("http://localhost/api/admin/produto/cor", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/admin/produto/cor", () => {
  const validBody = { productId, paramKey: "color_base", label: "Azul", hex: "#3D6EB5" };

  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await POST(req("POST", validBody));
    expect(res.status).toBe(404);
    expect(addProductColor).not.toHaveBeenCalled();
  });

  it("rejeita hex fora do formato (400)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const res = await POST(req("POST", { ...validBody, hex: "azul" }));
    expect(res.status).toBe(400);
  });

  it("cadastra a cor", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    addProductColor.mockResolvedValue(undefined);
    const res = await POST(req("POST", validBody));
    expect(res.status).toBe(200);
    expect(addProductColor).toHaveBeenCalledWith(productId, validBody);
  });

  it("aceita blend de 2 a 4 cores", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    addProductColor.mockResolvedValue(undefined);
    const res = await POST(req("POST", { ...validBody, blend: ["#3D6EB5", "#E88BB1"] }));
    expect(res.status).toBe(200);
  });

  it("repassa erro de domínio", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    addProductColor.mockRejectedValue(new Error("Já existe uma cor com essa combinação"));
    const res = await POST(req("POST", validBody));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Já existe uma cor com essa combinação");
  });
});

describe("DELETE /api/admin/produto/cor", () => {
  const validBody = { productId, paramKey: "color_base", hex: "#3D6EB5" };

  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await DELETE(req("DELETE", validBody));
    expect(res.status).toBe(404);
    expect(removeProductColor).not.toHaveBeenCalled();
  });

  it("remove a cor", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    removeProductColor.mockResolvedValue(undefined);
    const res = await DELETE(req("DELETE", validBody));
    expect(res.status).toBe(200);
    expect(removeProductColor).toHaveBeenCalledWith(productId, validBody);
  });
});
