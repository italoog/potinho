import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import type { Font, PathCommand } from "opentype.js";
import { buildTextGeometry, fontSupportsChar, loadFont, wrapAroundYAxis } from "./textGeometry";

/** Retângulo fechado (M/L/L/L/Z) — path simples o bastante pro ExtrudeGeometry triangular sem erro. */
const SQUARE_COMMANDS: PathCommand[] = [
  { type: "M", x: 0, y: 0 },
  { type: "L", x: 100, y: 0 },
  { type: "L", x: 100, y: 100 },
  { type: "L", x: 0, y: 100 },
  { type: "Z" },
] as unknown as PathCommand[];

function fakeFont(commands: PathCommand[] = SQUARE_COMMANDS): Font {
  return {
    ascender: 800,
    unitsPerEm: 1000,
    tables: {},
    getPath: () => ({ commands }),
  } as unknown as Font;
}

describe("fontSupportsChar", () => {
  it("true quando o glyph existe (índice > 0)", () => {
    const font = { charToGlyphIndex: () => 5 } as unknown as Font;
    expect(fontSupportsChar(font, "A")).toBe(true);
  });

  it("false pro glyph .notdef (índice 0)", () => {
    const font = { charToGlyphIndex: () => 0 } as unknown as Font;
    expect(fontSupportsChar(font, "🐾")).toBe(false);
  });
});

describe("wrapAroundYAxis", () => {
  it("revoluciona os vértices em torno do eixo Y, mantendo o raio esperado", () => {
    // 1 triângulo (3 vértices) — computeVertexNormals() precisa de pelo menos 1 face válida.
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));

    wrapAroundYAxis(geometry, { radius: 10, theta0: 0, baseY: 5, cosTilt: 1, sinTilt: 0 });

    const pos = geometry.getAttribute("position");
    // x=y=z=0 → angle=theta0=0, r=radius=10, h=baseY=5 → (10*sin(0), 5, 10*cos(0)) = (0, 5, 10)
    expect(pos.getX(0)).toBeCloseTo(0);
    expect(pos.getY(0)).toBeCloseTo(5);
    expect(pos.getZ(0)).toBeCloseTo(10);
  });
});

describe("loadFont", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("busca a fonte, faz o parse com opentype.js e cacheia por url (2ª chamada não refaz o fetch)", async () => {
    const buffer = new ArrayBuffer(4);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => buffer });
    vi.stubGlobal("fetch", fetchMock);

    const parsedFont = { unitsPerEm: 1000 } as Font;
    vi.doMock("opentype.js", () => ({ parse: vi.fn().mockReturnValue(parsedFont) }));
    // @ts-expect-error -- import com query string (cache-busting do Vite) não tem tipos
    const { loadFont: freshLoadFont } = await import("./textGeometry?fresh1");

    const first = await freshLoadFont("/fonts/anton.ttf");
    const second = await freshLoadFont("/fonts/anton.ttf");

    expect(first).toBe(parsedFont);
    expect(second).toBe(parsedFont);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("propaga erro quando o fetch da fonte falha (resposta não-ok)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(loadFont("/fonts/inexistente.ttf")).rejects.toThrow("Falha ao carregar fonte");
  });
});

describe("buildTextGeometry", () => {
  it("null pra texto vazio (sem gerar geometria à toa)", () => {
    expect(buildTextGeometry(fakeFont(), "", { targetHeight: 0.02, maxWidth: 1, depth: 0.002 })).toBeNull();
  });

  it("constrói a geometria extrudada, escalada pra targetHeight e centrada na origem", () => {
    const geometry = buildTextGeometry(fakeFont(), "THOR", {
      targetHeight: 57.6, // capHeight = 800*0.72*(100/1000) = 57.6 → escala 1:1 antes do clamp de largura
      maxWidth: 1000,
      depth: 0.002,
    });
    expect(geometry).not.toBeNull();
    geometry!.computeBoundingBox();
    const bb = geometry!.boundingBox!;
    // translate(-cx,-cy,-0.5) centraliza x/y na origem
    expect((bb.max.x + bb.min.x) / 2).toBeCloseTo(0);
    expect((bb.max.y + bb.min.y) / 2).toBeCloseTo(0);
  });

  it("encolhe a escala quando a largura bruta passa do maxWidth", () => {
    const geometry = buildTextGeometry(fakeFont(), "THOR", {
      targetHeight: 57.6,
      maxWidth: 10, // bem menor que a largura natural (100 * escala 1) → força o clamp
      depth: 0.002,
    });
    geometry!.computeBoundingBox();
    const bb = geometry!.boundingBox!;
    expect(bb.max.x - bb.min.x).toBeLessThanOrEqual(10.001);
  });

  it("null quando o path não gera nenhum shape (glyph vazio)", () => {
    const font = fakeFont([]);
    expect(buildTextGeometry(font, "  ", { targetHeight: 0.02, maxWidth: 1, depth: 0.002 })).toBeNull();
  });
});
