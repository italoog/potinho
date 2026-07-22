import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mkdir = vi.fn().mockResolvedValue(undefined);
const writeFile = vi.fn().mockResolvedValue(undefined);
vi.mock("node:fs/promises", () => ({ mkdir, writeFile, default: { mkdir, writeFile } }));

const { storeFile, decodePngDataUrl } = await import("./storage");

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

beforeEach(() => {
  mkdir.mockClear();
  writeFile.mockClear();
  delete process.env.STORAGE_ENDPOINT;
  delete process.env.STORAGE_BUCKET;
  delete process.env.STORAGE_ACCESS_KEY_ID;
  delete process.env.STORAGE_SECRET_ACCESS_KEY;
});

afterEach(() => vi.unstubAllGlobals());

describe("storeFile — sem S3 configurado (dev/filesystem)", () => {
  it("grava em public/uploads e devolve a url servida pelo Next", async () => {
    const result = await storeFile("snapshots/x.png", Buffer.from("abc"), "image/png");
    expect(result.url).toBe("/uploads/snapshots/x.png");
    expect(mkdir).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalled();
  });

  it("rejeita key com path traversal (P3-1)", async () => {
    await expect(storeFile("../../etc/passwd", Buffer.from("x"), "text/plain")).rejects.toThrow(/key inválida/);
    expect(writeFile).not.toHaveBeenCalled();
  });
});

describe("storeFile — com S3 configurado", () => {
  const sendMock = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    process.env.STORAGE_ENDPOINT = "https://s3.example.com";
    process.env.STORAGE_BUCKET = "potinho";
    process.env.STORAGE_ACCESS_KEY_ID = "key";
    process.env.STORAGE_SECRET_ACCESS_KEY = "secret";
    process.env.NEXT_PUBLIC_ASSETS_BASE_URL = "https://cdn.potinho.pet";
    vi.doMock("@aws-sdk/client-s3", () => ({
      S3Client: function S3Client() {
        return { send: sendMock };
      },
      PutObjectCommand: vi.fn(),
    }));
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ASSETS_BASE_URL;
    vi.doUnmock("@aws-sdk/client-s3");
  });

  it("envia pro S3 e devolve a url com o base configurado", async () => {
    const result = await storeFile("snapshots/y.png", Buffer.from("abc"), "image/png");
    expect(result.url).toBe("https://cdn.potinho.pet/snapshots/y.png");
    expect(sendMock).toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });
});

describe("decodePngDataUrl", () => {
  it("decodifica um PNG base64 válido", () => {
    const buf = decodePngDataUrl(`data:image/png;base64,${TINY_PNG_BASE64}`);
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it("rejeita formato que não é data URL de PNG", () => {
    expect(() => decodePngDataUrl("data:image/jpeg;base64,abc")).toThrow(/Snapshot inválido/);
  });

  it("rejeita snapshot maior que o limite", () => {
    const big = Buffer.alloc(10).toString("base64");
    expect(() => decodePngDataUrl(`data:image/png;base64,${big}`, 5)).toThrow(/excede o tamanho máximo/);
  });
});
