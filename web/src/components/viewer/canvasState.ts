"use client";

import type { RootState } from "@react-three/fiber";

/**
 * Referência ao estado do Canvas R3F — usada pelo snapshot (V-07)
 * e exposta em window.__forja3d em dev para depuração.
 */
let canvasState: RootState | null = null;

export function setCanvasState(state: RootState): void {
  canvasState = state;
  if (process.env.NODE_ENV !== "production") {
    (window as unknown as Record<string, unknown>).__forja3d = state;
  }
}

export function getCanvasState(): RootState | null {
  return canvasState;
}
