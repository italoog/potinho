"use client";

import { useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Font } from "opentype.js";
import type { AssetManifest } from "@/lib/asset-manifest";
import { buildTextGeometry, loadFont } from "./textGeometry";

interface NameTextProps {
  manifest: AssetManifest;
  text: string;
  color: string;
}

interface SurfaceAnchor {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  /** raio horizontal da superfície no ponto (curvatura cilíndrica) */
  radius: number;
}

/**
 * Renderiza o nome digitado na âncora `name_slot` (V-02).
 * A âncora do manifest fica DENTRO da parede (centroide da gravação negativa);
 * um raycast encontra a superfície externa real para o texto assentar nela.
 */
export default function NameText({ manifest, text, color }: NameTextProps) {
  const [font, setFont] = useState<Font | null>(null);
  const [surface, setSurface] = useState<SurfaceAnchor | null>(null);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    let alive = true;
    loadFont(manifest.fonts.webFile).then((f) => {
      if (alive) setFont(f);
    });
    return () => {
      alive = false;
    };
  }, [manifest.fonts.webFile]);

  // Raycast da posição externa em direção à âncora → ponto na parede real
  useEffect(() => {
    if (!manifest.anchor) return;
    let alive = true;
    let tries = 0;

    function probe() {
      if (!alive) return;
      const anchor = manifest.anchor!;
      const anchorPos = new THREE.Vector3(...anchor.position);
      const normal = new THREE.Vector3(...anchor.outwardNormal).normalize();
      const origin = anchorPos.clone().add(normal.clone().multiplyScalar(0.2));
      const raycaster = new THREE.Raycaster(origin, normal.clone().negate(), 0, 0.4);

      const targets: THREE.Object3D[] = [];
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh && o.name === "base_mesh") targets.push(o);
      });
      const hit = targets.length > 0 ? raycaster.intersectObjects(targets, false)[0] : undefined;

      if (hit) {
        const radius = Math.hypot(hit.point.x, hit.point.z);
        setSurface({
          position: hit.point.clone(),
          normal,
          radius,
        });
      } else if (tries++ < 90) {
        requestAnimationFrame(probe); // modelo ainda carregando
      }
    }
    probe();
    return () => {
      alive = false;
    };
  }, [manifest.anchor, scene]);

  const geometry = useMemo(() => {
    if (!font || !text || !manifest.anchor || !surface) return null;
    const [, sampleH, sampleW] = manifest.anchor.sampleTextSize;
    return buildTextGeometry(font, text, {
      targetHeight: sampleH,
      maxWidth: Math.max(sampleW, sampleH * 2) * 1.05,
      depth: Math.max(manifest.anchor.engraveDepthM, 0.0015),
      bendRadius: surface.radius,
    });
  }, [font, text, manifest.anchor, surface]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  const orientation = useMemo(() => {
    if (!surface) return null;
    const target = surface.position.clone().add(surface.normal);
    const m = new THREE.Matrix4();
    m.lookAt(target, surface.position, new THREE.Vector3(0, 1, 0));
    return {
      position: surface.position,
      quaternion: new THREE.Quaternion().setFromRotationMatrix(m),
    };
  }, [surface]);

  if (!geometry || !orientation) return null;

  return (
    <group position={orientation.position} quaternion={orientation.quaternion}>
      {/* metade da profundidade para dentro: texto em relevo raso, como a gravação real */}
      <mesh geometry={geometry} position={[0, 0, -0.0004]}>
        <meshStandardMaterial color={color} roughness={0.55} metalness={0} />
      </mesh>
    </group>
  );
}
