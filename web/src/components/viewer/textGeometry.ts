"use client";

import * as THREE from "three";
import type { Font, PathCommand } from "opentype.js";

/**
 * Texto 3D extrudado a partir da fonte real (ADR-004):
 * opentype.js → THREE.ShapePath → ExtrudeGeometry, com curvatura cilíndrica
 * para acompanhar a superfície do produto (a gravação real é numa parede curva).
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

/** Curva a geometria em torno do eixo vertical do produto (raio em metros). */
function bendCylindrical(geometry: THREE.BufferGeometry, radius: number): void {
  const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const angle = x / radius;
    const r = radius + z;
    pos.setX(i, r * Math.sin(angle));
    pos.setZ(i, r * Math.cos(angle) - radius);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

export interface TextGeometryOptions {
  /** altura-alvo das maiúsculas em metros (vem do asset-manifest) */
  targetHeight: number;
  /** largura máxima em metros — o texto encolhe para caber */
  maxWidth: number;
  /** profundidade da extrusão em metros */
  depth: number;
  /** raio de curvatura da superfície (m); 0/undefined = plano */
  bendRadius?: number;
}

export function buildTextGeometry(
  font: Font,
  text: string,
  opts: TextGeometryOptions,
): THREE.BufferGeometry | null {
  if (!text) return null;
  const fontSize = 100; // unidades da fonte; escala aplicada depois
  const path = font.getPath(text, 0, 0, fontSize);
  const shapes = commandsToShapes(path.commands);
  if (shapes.length === 0) return null;

  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: 1, // será reescalado junto
    bevelEnabled: false,
    curveSegments: 6,
  });

  // Escala: altura de maiúscula ~ capHeight da fonte
  const capHeight = ((font.tables.os2?.sCapHeight as number) || font.ascender * 0.72) * (fontSize / font.unitsPerEm);
  let scale = opts.targetHeight / capHeight;

  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const rawWidth = (bb.max.x - bb.min.x) * scale;
  if (rawWidth > opts.maxWidth) {
    scale *= opts.maxWidth / rawWidth;
  }

  // Centraliza no origin (x e y), profundidade centrada em z
  const cx = (bb.min.x + bb.max.x) / 2;
  const cy = (bb.min.y + bb.max.y) / 2;
  geometry.translate(-cx, -cy, -0.5);
  geometry.scale(scale, scale, opts.depth);

  if (opts.bendRadius && opts.bendRadius > 0.01) {
    bendCylindrical(geometry, opts.bendRadius);
  }
  geometry.computeBoundingBox();
  return geometry;
}
