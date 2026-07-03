"use client";

import * as THREE from "three";
import type { Font, PathCommand } from "opentype.js";

/**
 * Texto 3D extrudado a partir da fonte real (ADR-004):
 * opentype.js → THREE.ShapePath → ExtrudeGeometry. Cada letra sai como uma geometria
 * própria (plana) — NameText posiciona cada uma na superfície real via raycast individual,
 * em vez de uma curvatura matemática aproximada para a palavra toda.
 */

let fontCache: Map<string, Promise<Font>> | null = null;

export async function loadFont(url: string): Promise<Font> {
  if (!fontCache) fontCache = new Map();
  let cached = fontCache.get(url);
  if (!cached) {
    cached = (async () => {
      const opentype = await import("opentype.js");
      const buffer = await fetch(url).then((r) => {
        if (!r.ok) throw new Error(`Falha ao carregar fonte: ${url}`);
        return r.arrayBuffer();
      });
      return opentype.parse(buffer);
    })();
    fontCache.set(url, cached);
  }
  return cached;
}

export function fontSupportsChar(font: Font, char: string): boolean {
  return font.charToGlyphIndex(char) > 0;
}

function commandsToShapes(commands: PathCommand[]): THREE.Shape[] {
  const shapePath = new THREE.ShapePath();
  // opentype gera Y para baixo (convenção canvas) — invertemos para o espaço 3D
  for (const cmd of commands) {
    switch (cmd.type) {
      case "M":
        shapePath.moveTo(cmd.x, -cmd.y);
        break;
      case "L":
        shapePath.lineTo(cmd.x, -cmd.y);
        break;
      case "Q":
        shapePath.quadraticCurveTo(cmd.x1, -cmd.y1, cmd.x, -cmd.y);
        break;
      case "C":
        shapePath.bezierCurveTo(cmd.x1, -cmd.y1, cmd.x2, -cmd.y2, cmd.x, -cmd.y);
        break;
      case "Z":
        shapePath.currentPath?.closePath();
        break;
    }
  }
  return shapePath.toShapes();
}

export interface TextGeometryOptions {
  /** altura-alvo das maiúsculas em metros (vem do asset-manifest) */
  targetHeight: number;
  /** largura máxima em metros — o texto encolhe para caber */
  maxWidth: number;
  /** profundidade da extrusão em metros */
  depth: number;
}

export interface GlyphGeometry {
  geometry: THREE.BufferGeometry;
  /** centro horizontal do glifo, no referencial já centralizado da palavra (metros) */
  centerX: number;
}

/**
 * Uma geometria por glifo (não uma só para a palavra toda), todas na mesma escala e
 * centralizadas em torno de x=0 — cortar cada letra separadamente do corpo é bem mais
 * robusto pro CSG (V-02) do que uma única malha com várias letras, e permite posicionar
 * cada uma na superfície real via raycast individual (a peça não é um cilindro perfeito).
 */
export function buildTextGlyphGeometries(font: Font, text: string, opts: TextGeometryOptions): GlyphGeometry[] {
  if (!text) return [];
  const fontSize = 100; // unidades da fonte; escala aplicada depois

  const capHeight = ((font.tables.os2?.sCapHeight as number) || font.ascender * 0.72) * (fontSize / font.unitsPerEm);
  let scale = opts.targetHeight / capHeight;

  // mede a largura total do texto pra decidir o encolhimento — igual pra todas as letras
  const fullShapes = commandsToShapes(font.getPath(text, 0, 0, fontSize).commands);
  const measureGeometry = new THREE.ExtrudeGeometry(fullShapes, { depth: 1, bevelEnabled: false, curveSegments: 1 });
  measureGeometry.computeBoundingBox();
  const bb = measureGeometry.boundingBox!;
  const rawWidth = (bb.max.x - bb.min.x) * scale;
  if (rawWidth > opts.maxWidth) {
    scale *= opts.maxWidth / rawWidth;
  }
  const cx = (bb.min.x + bb.max.x) / 2;
  const cy = (bb.min.y + bb.max.y) / 2;
  measureGeometry.dispose();

  // font.forEachGlyph dá a posição de cada glifo já com kerning aplicado — é o que getPath(text)
  // usa por baixo dos panos. Somar advance width na mão (sem kerning) desalinha progressivamente
  // do bbox medido acima, e o desvio cresce letra a letra.
  const glyphs: GlyphGeometry[] = [];
  font.forEachGlyph(text, 0, 0, fontSize, undefined, (glyph, gx, gy, gFontSize) => {
    const shapes = commandsToShapes(glyph.getPath(gx, gy, gFontSize).commands);
    if (shapes.length === 0) return;

    const geometry = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false, curveSegments: 6 });
    geometry.translate(-cx, -cy, -0.5);
    geometry.scale(scale, scale, opts.depth);
    geometry.computeBoundingBox();
    const gbb = geometry.boundingBox!;
    glyphs.push({ geometry, centerX: (gbb.min.x + gbb.max.x) / 2 });
  });
  return glyphs;
}
