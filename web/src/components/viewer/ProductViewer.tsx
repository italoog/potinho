"use client";

import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import type { AssetManifest } from "@/lib/asset-manifest";
import { darkenHex, isEngravingMaterial } from "./engravingMaterial";

/**
 * Peças reaproveitadas pelo preview 3D ao vivo da home (PotinhoViewer) — a página de
 * produto standalone (/p/[slug]) foi removida, a home é o único ponto de compra.
 */

/** Aplica cores da paleta às malhas nomeadas (V-03) sem recriar materiais a cada frame */
export function ColoredModel({ url, colors }: { url: string; colors: Record<string, string> }) {
  const { scene } = useGLTF(url);

  const prepared = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = (obj.material as THREE.Material).clone();
      }
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    prepared.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const hex = colors[obj.name];
      if (!hex) return;
      // Com nome gravado, o mesh vira multi-material (casca + faces internas da gravação,
      // que ficam num tom escurecido da mesma cor — sombra do rebaixo).
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue;
        material.color.set(isEngravingMaterial(material) ? darkenHex(hex) : hex);
      }
    });
  }, [prepared, colors]);

  return <primitive object={prepared} />;
}

/** Overlay CSS FORA do Canvas — <Html> como fallback de Suspense quebra o root R3F */
export function LoadingOverlay() {
  const { active } = useProgress();
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
      <span className="text-sm">Carregando 3D…</span>
    </div>
  );
}

/** Posiciona a câmera de frente para a gravação do nome quando o manifest carrega */
export function CameraRig({ manifest }: { manifest: AssetManifest | null }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as { target?: THREE.Vector3; update?: () => void } | null;
  const applied = useRef(false);

  useEffect(() => {
    // espera manifest E controls prontos — OrbitControls registra async no store
    if (!manifest?.anchor || !controls?.target || applied.current) return;
    applied.current = true;
    // Direção RADIAL da âncora (a peça é de revolução centrada na origem) — a outwardNormal
    // do manifest desvia ~16° da radial e deixava a câmera de viés em relação ao nome gravado.
    const [ax, , az] = manifest.anchor.position;
    const len = Math.hypot(ax, az) || 1;
    const nx = ax / len;
    const nz = az / len;
    const height = manifest.dimensions[1];
    const dist = Math.max(...manifest.dimensions) * 2.1;
    camera.position.set(nx * dist, height * 1.1, nz * dist);
    const target = new THREE.Vector3(0, height * 0.5, 0);
    controls.target.copy(target);
    controls.update?.();
  }, [manifest, camera, controls]);

  return null;
}
