"use client";

import * as THREE from "three";

/**
 * A gravação real aparece mais ESCURA que a casca (sombra do rebaixo — ver foto de referência
 * do produto impresso). O preview não tem ambient occlusion, então simulamos: as faces internas
 * do corte CSG recebem um material próprio com a cor da casca escurecida.
 */

export function darkenHex(hex: string, factor = 0.2): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#4a4a4a";
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 0xff) * (1 - factor));
  const g = Math.round(((n >> 8) & 0xff) * (1 - factor));
  const b = Math.round((n & 0xff) * (1 - factor));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Marca o material das faces internas da gravação para o ColoredModel manter a cor sincronizada. */
export function isEngravingMaterial(material: THREE.Material): boolean {
  return material.userData.engraving === true;
}

export function createEngravingMaterial(base: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  const material = base.clone();
  material.color.set(darkenHex(`#${base.color.getHexString()}`));
  material.userData.engraving = true;
  return material;
}
