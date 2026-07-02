import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { applyTransform, composeTransforms, parseTransform } from "./lib3mf";

const GLB_PATH = resolve(__dirname, "../public/models/comedouro-pet/15cm.glb");
const MANIFEST_PATH = resolve(__dirname, "../public/models/comedouro-pet/asset-manifest.json");

describe("transforms 3MF", () => {
  it("aplica translação e escala (convenção row-vector do 3MF)", () => {
    const t = parseTransform("1.033 0 0 0 1.033 0 0 0 1.2396 0 0 22.713");
    const [x, y, z] = applyTransform(t, 10, 0, 100);
    expect(x).toBeCloseTo(10.33);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(146.673);
  });

  it("composição aplica b antes de a", () => {
    const scale2 = parseTransform("2 0 0 0 2 0 0 0 2 0 0 0");
    const move1 = parseTransform("1 0 0 0 1 0 0 0 1 1 0 0");
    // primeiro move (+1 em x), depois escala (x2): (1,0,0) → (2,0,0) → ... ponto (0,0,0) → (1,0,0) → (2,0,0)
    const composed = composeTransforms(scale2, move1);
    expect(applyTransform(composed, 0, 0, 0)[0]).toBeCloseTo(2);
  });
});

describe("GLB do comedouro (artefato da story 1.1)", () => {
  it("existe e respeita o orçamento de ≤ 4 MB (V-06)", () => {
    expect(existsSync(GLB_PATH)).toBe(true);
    expect(statSync(GLB_PATH).size).toBeLessThan(4 * 1024 * 1024);
  });

  it("contém base_mesh, bowl_mesh e a âncora name_slot", async () => {
    const io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
    const doc = await io.read(GLB_PATH);
    const nodeNames = doc
      .getRoot()
      .listNodes()
      .map((n) => n.getName());
    expect(nodeNames).toContain("base_mesh");
    expect(nodeNames).toContain("bowl_mesh");
    expect(nodeNames).toContain("name_slot");
  });

  it("manifest tem âncora, fontes e dimensões coerentes com um produto de ~15-20cm", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
    expect(manifest.anchor.node).toBe("name_slot");
    expect(manifest.fonts.production).toBe("Impact");
    expect(manifest.fonts.web).toBe("Anton");
    const [w, h, d] = manifest.dimensions;
    expect(w).toBeGreaterThan(0.1);
    expect(w).toBeLessThan(0.3);
    expect(h).toBeGreaterThan(0.05);
    expect(d).toBeGreaterThan(0.1);
  });
});
