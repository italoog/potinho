"use client";

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { fetchAssetManifest, type AssetManifest } from "@/lib/asset-manifest";
import NameText from "@/components/viewer/NameText";
import { CameraRig, ColoredModel, LoadingOverlay } from "@/components/viewer/ProductViewer";

/** GLB do comedouro usado no preview da home (mesmo asset da loja 3D). */
const MODEL_URL = "/models/comedouro-pet/15cm.glb";

interface Props {
  /** Cor da parte de cima (corpo da peça, onde o nome é gravado). */
  topHex: string;
  /** Cor da base (faixa inferior). */
  bottomHex: string;
  /** Nome do pet — gravado ao vivo na peça. */
  petName: string;
}

/**
 * Preview 3D ao vivo do "monte o seu potinho": toda troca de cor ou letra digitada
 * reflete imediatamente na peça. Reusa as peças do visualizador da loja (/p/{slug}),
 * mas dirigido por props em vez do store de personalização.
 */
export default function PotinhoViewer({ topHex, bottomHex, petName }: Props) {
  const [manifest, setManifest] = useState<AssetManifest | null>(null);
  const [debouncedName, setDebouncedName] = useState("");

  // parte de cima = base_mesh (corpo, recebe a gravação) · base = bowl_mesh (faixa inferior)
  const colors = useMemo(
    () => ({ base_mesh: topHex, bowl_mesh: bottomHex }),
    [topHex, bottomHex],
  );

  // Debounce leve: cores trocam na hora; o corte CSG do nome espera a digitação assentar
  useEffect(() => {
    const t = setTimeout(() => setDebouncedName(petName.trim().toUpperCase()), 120);
    return () => clearTimeout(t);
  }, [petName]);

  // O Canvas R3F não pode participar da hidratação SSR (mesmo padrão do ProductViewer)
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    let alive = true;
    fetchAssetManifest(MODEL_URL)
      .then((m) => alive && setManifest(m))
      .catch(() => alive && setManifest(null));
    useGLTF.preload(MODEL_URL);
    return () => {
      alive = false;
    };
  }, []);

  const frame =
    "relative h-[46vh] min-h-72 w-full overflow-hidden rounded-3xl bg-gradient-to-b from-white to-potinho-bege/60 shadow-[0_10px_50px_-20px_rgba(90,64,50,0.4)] lg:h-[62vh]";

  if (!mounted) return <div className={frame} />;

  return (
    <div className={`${frame} touch-none`}>
      <Canvas
        camera={{ position: [0.28, 0.18, 0.28], fov: 40, near: 0.01, far: 10 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <CameraRig manifest={manifest} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[2, 4, 3]} intensity={1.4} />
          <directionalLight position={[-3, 2, -2]} intensity={0.9} />
          <ColoredModel url={MODEL_URL} colors={colors} />
          {manifest?.anchor && debouncedName && (
            <NameText manifest={manifest} text={debouncedName} />
          )}
          <ContactShadows position={[0, 0.001, 0]} opacity={0.35} scale={0.8} blur={2.2} far={0.4} />
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
      <LoadingOverlay />
      <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/80 px-3 py-1 text-xs text-potinho-texto/70 backdrop-blur">
        arraste para girar · pinça para zoom
      </span>
    </div>
  );
}
