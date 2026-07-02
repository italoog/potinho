"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, useGLTF } from "@react-three/drei";
import { useShallow } from "zustand/react/shallow";
import * as THREE from "three";
import type { Variant } from "@/db/types";
import { fetchAssetManifest, type AssetManifest } from "@/lib/asset-manifest";
import {
  selectActiveVariant,
  selectCustomText,
  selectMeshColors,
  usePersonalization,
} from "@/store/personalization";
import NameText from "./NameText";
import { setCanvasState } from "./canvasState";

/** Aplica cores da paleta às malhas nomeadas (V-03) sem recriar materiais a cada frame */
function ColoredModel({ url, colors }: { url: string; colors: Record<string, string> }) {
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
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        const hex = colors[obj.name];
        if (hex) obj.material.color.set(hex);
      }
    });
  }, [prepared, colors]);

  return <primitive object={prepared} />;
}

function LoadingSkeleton() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-zinc-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
        <span className="text-sm">Carregando 3D…</span>
      </div>
    </Html>
  );
}

/** Posiciona a câmera de frente para a gravação do nome quando o manifest carrega */
function CameraRig({ manifest }: { manifest: AssetManifest | null }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as { target?: THREE.Vector3; update?: () => void } | null;
  const applied = useRef(false);

  useEffect(() => {
    // espera manifest E controls prontos — OrbitControls registra async no store
    if (!manifest?.anchor || !controls?.target || applied.current) return;
    applied.current = true;
    const [nx, , nz] = manifest.anchor.outwardNormal;
    const height = manifest.dimensions[1];
    const dist = Math.max(...manifest.dimensions) * 2.1;
    camera.position.set(nx * dist, height * 1.1, nz * dist);
    const target = new THREE.Vector3(0, height * 0.5, 0);
    controls.target.copy(target);
    controls.update?.();
  }, [manifest, camera, controls]);

  return null;
}

function SceneContent({ variant, manifest }: { variant: Variant; manifest: AssetManifest | null }) {
  const colors = usePersonalization(useShallow(selectMeshColors));
  const customTextValue = usePersonalization((s) => selectCustomText(s)?.value ?? "");
  const [debouncedText, setDebouncedText] = useState("");

  // Debounce leve: mantém a percepção < 500ms (V-02) sem gerar geometria a cada tecla
  useEffect(() => {
    const t = setTimeout(() => setDebouncedText(customTextValue), 120);
    return () => clearTimeout(t);
  }, [customTextValue]);

  const nameColor = colors["name_text"] ?? "#F4F4F4";

  return (
    <>
      <CameraRig manifest={manifest} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 4, 3]} intensity={1.4} />
      <directionalLight position={[-3, 2, -2]} intensity={0.9} />
      <ColoredModel url={variant.modelUrl} colors={colors} />
      {manifest?.anchor && debouncedText && (
        <NameText manifest={manifest} text={debouncedText} color={nameColor} />
      )}
      <ContactShadows position={[0, 0.001, 0]} opacity={0.35} scale={0.8} blur={2.2} far={0.4} />
    </>
  );
}

export default function ProductViewer() {
  const variant = usePersonalization(selectActiveVariant);
  const [manifest, setManifest] = useState<AssetManifest | null>(null);

  useEffect(() => {
    if (!variant) return;
    let alive = true;
    fetchAssetManifest(variant.modelUrl)
      .then((m) => alive && setManifest(m))
      .catch(() => alive && setManifest(null));
    return () => {
      alive = false;
    };
  }, [variant]);

  useEffect(() => {
    if (variant) useGLTF.preload(variant.modelUrl);
  }, [variant]);

  if (!variant) return null;

  return (
    <div className="relative h-[55vh] min-h-80 w-full touch-none rounded-2xl bg-gradient-to-b from-zinc-100 to-zinc-200">
      <Canvas
        camera={{ position: [0.28, 0.18, 0.28], fov: 40, near: 0.01, far: 10 }}
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        onCreated={setCanvasState}
      >
        <Suspense fallback={<LoadingSkeleton />}>
          <SceneContent variant={variant} manifest={manifest} />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={0.18}
          maxDistance={0.6}
          maxPolarAngle={Math.PI / 2 + 0.15}
          target={[0, 0.07, 0]}
        />
      </Canvas>
      <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-zinc-500">
        Arraste para girar · pinça para zoom
      </span>
    </div>
  );
}
