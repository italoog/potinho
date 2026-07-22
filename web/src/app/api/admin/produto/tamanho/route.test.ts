// @vitest-environment node
// jsdom's File e o File que o parser de multipart do fetch/undici produz são classes de realms
// diferentes — `instanceof File` (usado em route.ts) só bate em ambiente node puro.
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

const addProductVariant = vi.fn();
const removeProductVariant = vi.fn();
vi.mock("@/lib/products", () => ({ addProductVariant, removeProductVariant }));

const storeFile = vi.fn();
vi.mock("@/lib/storage", () => ({ storeFile }));

const { POST, DELETE } = await import("./route");

const productId = crypto.randomUUID();

function formFields(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    productId,
    ref: "20cm",
    label: "GG — 20cm",
    dimensions: "20x20x20cm",
    price: "19900",
    widthCm: "22",
    heightCm: "22",
    lengthCm: "22",
    weightKg: "1.5",
    fallbackModelUrl: "/models/comedouro-pet/15cm.glb",
    ...overrides,
  };
}

function formReq(fields: Record<string, string>, file?: File): Request {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  if (file) form.set("model", file);
  return new Request("http://localhost/api/admin/produto/tamanho", { method: "POST", body: form });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/admin/produto/tamanho", () => {
  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await POST(formReq(formFields()));
    expect(res.status).toBe(404);
    expect(addProductVariant).not.toHaveBeenCalled();
  });

  it("rejeita campos inválidos (400)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const res = await POST(formReq(formFields({ price: "-100" })));
    expect(res.status).toBe(400);
    expect(addProductVariant).not.toHaveBeenCalled();
  });

  it("sem arquivo: usa o fallbackModelUrl", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    addProductVariant.mockResolvedValue(undefined);
    const res = await POST(formReq(formFields()));
    expect(res.status).toBe(200);
    expect(storeFile).not.toHaveBeenCalled();
    expect(addProductVariant).toHaveBeenCalledWith(
      productId,
      expect.objectContaining({ ref: "20cm", modelUrl: "/models/comedouro-pet/15cm.glb" }),
    );
  });

  it("com arquivo: faz upload e usa a url armazenada", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    storeFile.mockResolvedValue({ url: "/uploads/models/comedouro-pet/20cm.glb" });
    addProductVariant.mockResolvedValue(undefined);

    // Magic number "glTF" (0x67,0x6C,0x54,0x46) exigido pelo check P3-2.
    const file = new File([new Uint8Array([0x67, 0x6c, 0x54, 0x46, 1, 2, 3])], "20cm.glb", { type: "model/gltf-binary" });
    const res = await POST(formReq(formFields(), file));
    expect(res.status).toBe(200);
    expect(storeFile).toHaveBeenCalledWith("models/comedouro-pet/20cm.glb", expect.any(Buffer), "model/gltf-binary");
    expect(addProductVariant).toHaveBeenCalledWith(
      productId,
      expect.objectContaining({ modelUrl: "/uploads/models/comedouro-pet/20cm.glb" }),
    );
  });

  it("rejeita arquivo que não é um GLB válido (P3-2)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const file = new File([new Uint8Array([1, 2, 3, 4])], "fake.glb", { type: "model/gltf-binary" });
    const res = await POST(formReq(formFields(), file));
    expect(res.status).toBe(400);
    expect(storeFile).not.toHaveBeenCalled();
    expect(addProductVariant).not.toHaveBeenCalled();
  });

  it("rejeita ref com caracteres inválidos / path traversal (P3-1)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const res = await POST(formReq(formFields({ ref: "../../evil" })));
    expect(res.status).toBe(400);
    expect(addProductVariant).not.toHaveBeenCalled();
  });

  it("repassa erro de domínio (ex.: ref duplicada)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    addProductVariant.mockRejectedValue(new Error("Já existe um tamanho com essa referência"));
    const res = await POST(formReq(formFields()));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Já existe um tamanho com essa referência");
  });
});

describe("DELETE /api/admin/produto/tamanho", () => {
  function jsonReq(body: unknown): Request {
    return new Request("http://localhost/api/admin/produto/tamanho", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("responde 404 sem sessão admin", async () => {
    requireAdminSession.mockResolvedValue(null);
    const res = await DELETE(jsonReq({ productId, ref: "20cm" }));
    expect(res.status).toBe(404);
    expect(removeProductVariant).not.toHaveBeenCalled();
  });

  it("remove o tamanho", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    removeProductVariant.mockResolvedValue(undefined);
    const res = await DELETE(jsonReq({ productId, ref: "20cm" }));
    expect(res.status).toBe(200);
    expect(removeProductVariant).toHaveBeenCalledWith(productId, "20cm");
  });

  it("rejeita ref com caracteres inválidos / path traversal (P3-1)", async () => {
    requireAdminSession.mockResolvedValue({ user: { email: "admin@potinho.com.br" } });
    const res = await DELETE(jsonReq({ productId, ref: "../../evil" }));
    expect(res.status).toBe(400);
    expect(removeProductVariant).not.toHaveBeenCalled();
  });
});
