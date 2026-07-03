"use client";

import { getCanvasState } from "./canvasState";

/**
 * Snapshot PNG da configuração atual (V-07).
 * Requer preserveDrawingBuffer: true no Canvas (já configurado).
 * Reduz para no máx. 800px no maior lado antes de enviar.
 */
export function captureSnapshot(maxSize = 800): string | null {
  const state = getCanvasState();
  if (!state) return null;
  const source = state.gl.domElement;
  // força um frame com o buffer preservado
  state.gl.render(state.scene, state.camera);

  const scale = Math.min(1, maxSize / Math.max(source.width, source.height));
  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // fundo claro (o canvas 3D é transparente)
  ctx.fillStyle = "#f4f4f5";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}
