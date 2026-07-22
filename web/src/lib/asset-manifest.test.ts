import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAssetManifest, manifestUrlFor } from "./asset-manifest";

const validManifest = {
  generatedAt: "2026-01-01T00:00:00Z",
  source3mf: "assets/models/comedouro-pet/15cm.3mf",
  variantRef: "15cm",
  units: "meters",
  dimensions: [0.15, 0.15, 0.15],
  meshes: [{ name: "body", originalName: "Body_001" }],
  anchor: {
    node: "name_slot",
    position: [0, 0, 0],
    outwardNormal: [0, 1, 0],
    up: [0, 0, 1],
    sampleText: "THOR",
    sampleTextSize: [0.05, 0.02, 0.001],
    engraveDepthM: 0.001,
  },
  fonts: { production: "Impact", productionSize: 12, web: "Anton", webFile: "/fonts/anton.woff2" },
};

afterEach(() => vi.unstubAllGlobals());

describe("manifestUrlFor", () => {
  it("troca o nome do arquivo .glb por asset-manifest.json no mesmo diretório", () => {
    expect(manifestUrlFor("/models/comedouro-pet/15cm.glb")).toBe("/models/comedouro-pet/asset-manifest.json");
  });
});

describe("fetchAssetManifest", () => {
  it("busca e valida o manifest contra o schema zod", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => validManifest }));
    const result = await fetchAssetManifest("/models/comedouro-pet/15cm.glb");
    expect(result.variantRef).toBe("15cm");
    expect(result.anchor?.sampleText).toBe("THOR");
  });

  it("lança erro quando o manifest não é encontrado (404)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(fetchAssetManifest("/models/comedouro-pet/15cm.glb")).rejects.toThrow(/não encontrado/);
  });

  it("lança erro de validação quando o JSON não bate com o contrato", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ generatedAt: "x" }) }));
    await expect(fetchAssetManifest("/models/comedouro-pet/15cm.glb")).rejects.toThrow();
  });

  it("aceita anchor nulo (peça sem ponto de gravação ainda mapeado)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...validManifest, anchor: null }) }),
    );
    const result = await fetchAssetManifest("/models/comedouro-pet/15cm.glb");
    expect(result.anchor).toBeNull();
  });
});
