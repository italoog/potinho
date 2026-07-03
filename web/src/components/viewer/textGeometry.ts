"use client";

import * as THREE from "three";
import type { Font, PathCommand } from "opentype.js";

/**
 * Texto 3D extrudado a partir da fonte real (ADR-004):
 * opentype.js → THREE.ShapePath → ExtrudeGeometry, com curvatura cilíndrica para
 * acompanhar a parede do produto (a gravação real é numa superfície curva).
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

export interface WrapParams {
  /** raio horizontal do ponto de ancoragem até o eixo vertical da peça */
  radius: number;
  /** ângulo central da âncora em torno do eixo (atan2(x, z) do ponto de hit) */
  theta0: number;
  /** altura do centro do texto (y do ponto de hit) */
  baseY: number;
  /** inclinação da parede (do `up` do manifest): componente vertical */
  cosTilt: number;
  /** inclinação da parede: componente radial (positivo = afunila subindo) */
  sinTilt: number;
}

/**
 * Revoluciona o texto plano em torno do eixo vertical REAL da peça (x=0, z=0 — a malha é
 * centrada na origem), direto em coordenadas do mundo: x do texto vira COMPRIMENTO DE ARCO
 * a partir do ângulo central da âncora, y acompanha a inclinação da parede, z (profundidade)
 * vira offset ao longo da normal inclinada. Centralização e espaçamento uniformes por
 * construção, para qualquer quantidade de caracteres — abordagens anteriores (eixo derivado
 * da outwardNormal do manifest, que desvia ~16° da radial verdadeira; ou raycast por letra
 * com offset tangente) deslocavam a palavra e derrubavam as letras das pontas pra fora.
 */
export function wrapAroundYAxis(geometry: THREE.BufferGeometry, params: WrapParams): void {
  const { radius, theta0, baseY, cosTilt, sinTilt } = params;
  const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const angle = theta0 + x / radius;
    const r = radius - y * sinTilt + z * cosTilt;
    const h = baseY + y * cosTilt + z * sinTilt;
    pos.setXYZ(i, r * Math.sin(angle), h, r * Math.cos(angle));
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
}

/**
 * Palavra inteira numa única geometria plana (kerning nativo do font.getPath), centrada no
 * origin em x/y e com profundidade centrada em z. Multi-ilha num único corte booleano é
 * confiável desde que o Evaluator seja recriado por operação (ver NameText).
 */
export function buildTextGeometry(font: Font, text: string, opts: TextGeometryOptions): THREE.BufferGeometry | null {
  if (!text) return null;
  const fontSize = 100; // unidades da fonte; escala aplicada depois
  const shapes = commandsToShapes(font.getPath(text, 0, 0, fontSize).commands);
  if (shapes.length === 0) return null;

  const geometry = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false, curveSegments: 6 });

  // Escala: altura de maiúscula ~ capHeight da fonte
  const capHeight = ((font.tables.os2?.sCapHeight as number) || font.ascender * 0.72) * (fontSize / font.unitsPerEm);
  let scale = opts.targetHeight / capHeight;

  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const rawWidth = (bb.max.x - bb.min.x) * scale;
  if (rawWidth > opts.maxWidth) {
    scale *= opts.maxWidth / rawWidth;
  }

  const cx = (bb.min.x + bb.max.x) / 2;
  const cy = (bb.min.y + bb.max.y) / 2;
  geometry.translate(-cx, -cy, -0.5);
  geometry.scale(scale, scale, opts.depth);
  geometry.computeBoundingBox();
  return geometry;
}
