"use client";

import { useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Font } from "opentype.js";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import type { AssetManifest } from "@/lib/asset-manifest";
import { buildTextGeometry, loadFont, wrapAroundYAxis } from "./textGeometry";
import { createEngravingMaterial } from "./engravingMaterial";

interface NameTextProps {
  manifest: AssetManifest;
  text: string;
}

/**
 * three-bvh-csg constrói a BVH assumindo atributos planos (não intercalados). O glTF
 * comprimido (V-06, quantize()+meshopt()) carrega base_mesh com position/normal
 * intercalados em Int16 — sem converter, a subtração booleana silenciosamente devolve uma
 * geometria com o número certo de vértices mas todos em (0,0,0). `getX/Y/Z` já faz a
 * desquantização/leitura correta independente do formato de origem.
 */
function toPlainFloat32Geometry(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  (["position", "normal"] as const).forEach((name) => {
    const attr = source.getAttribute(name);
    if (!attr) return;
    const array = new Float32Array(attr.count * 3);
    for (let i = 0; i < attr.count; i++) {
      array[i * 3] = attr.getX(i);
      array[i * 3 + 1] = attr.getY(i);
      array[i * 3 + 2] = attr.getZ(i);
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(array, 3));
  });
  if (source.index) geometry.setIndex(source.index.clone());
  return geometry;
}

interface SurfaceAnchor {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  /** "para cima" real do texto (vem do manifest) — a parede afunila, não é o eixo Y do mundo */
  up: THREE.Vector3;
}

// Instância NOVA a cada corte (não reutilizar um Evaluator entre chamadas): o estado interno
// dele (buffers de atributo, BVH cacheada na própria geometria) não zera 100% entre operações
// mesmo com clear() — reaproveitar causava resultados inconsistentes de um nome pro outro
// (às vezes um corte simples de 2-3 letras saía sem gravar nada, sem erro nenhum no console).
// useGroups: as faces que vêm do cortador (paredes/fundo da gravação) ficam num group próprio
// com material mais escuro — sem isso a gravação fica da cor da casca e quase invisível.
function createEvaluator(): Evaluator {
  const evaluator = new Evaluator();
  evaluator.useGroups = true;
  evaluator.attributes = ["position", "normal"];
  return evaluator;
}

/**
 * Grava o nome na peça (V-02). No 3MF de origem o nome é um "negative_part" do Bambu:
 * material REMOVIDO da casca (gravação), não uma etiqueta em relevo colada por cima.
 * Por isso o corte é feito com uma subtração booleana (CSG) real no base_mesh — o resultado
 * usa o mesmo material/sombreamento da peça, igual a uma gravação física de verdade.
 */
export default function NameText({ manifest, text }: NameTextProps) {
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
        // "up" real do manifest: a parede afunila (não é vertical de verdade), o corte tem
        // que acompanhar essa inclinação em vez de ficar sempre perpendicular ao chão.
        const up = new THREE.Vector3(...anchor.up).normalize();
        setSurface({ position: hit.point.clone(), normal, up });
      } else if (tries++ < 90) {
        requestAnimationFrame(probe); // modelo ainda carregando
      }
    }
    probe();
    return () => {
      alive = false;
    };
  }, [manifest.anchor, scene]);

  // Palavra inteira numa única geometria plana, empurrada para DENTRO da parede (negativo),
  // com uma folga pequena para fora garantindo que a subtração atravesse a superfície.
  const flatGeometry = useMemo(() => {
    if (!font || !text || !manifest.anchor) return null;
    const [, sampleH, sampleW] = manifest.anchor.sampleTextSize;
    const maxWidth = Math.max(sampleW, sampleH * 2) * 1.05;
    // O 3MF original grava a 2mm (thickness do Text Tool do Bambu). 3mm é o menor valor
    // testado que a lib de CSG (three-bvh-csg, experimental) corta de forma confiável pra
    // qualquer tamanho de nome — ainda uma fração pequena da parede, mas um pouco mais que o
    // ideal. A peça impressa de verdade usa o 3MF original (gerador de produção — Épico 5),
    // não esta malha do preview: isso só afeta a visualização no navegador.
    const cutDepth = 0.003;
    const outsideMargin = 0.0006;
    const geometry = buildTextGeometry(font, text, {
      targetHeight: sampleH,
      maxWidth,
      depth: cutDepth + outsideMargin,
    });
    if (!geometry) return null;
    // desloca de [-D/2, D/2] (centrado) para [-cutDepth, +outsideMargin] (para dentro da peça)
    geometry.translate(0, 0, (outsideMargin - cutDepth) / 2);
    return geometry;
  }, [font, text, manifest.anchor]);

  useEffect(() => {
    return () => {
      flatGeometry?.dispose();
    };
  }, [flatGeometry]);

  // Aplica/desfaz a subtração booleana no base_mesh de verdade — sempre a partir da geometria
  // original (nunca acumula cortes de nomes anteriores).
  useEffect(() => {
    let mesh: THREE.Mesh | null = null;
    scene.traverse((o) => {
      if (!mesh && o instanceof THREE.Mesh && o.name === "base_mesh") mesh = o;
    });
    if (!mesh) return;
    const targetMesh: THREE.Mesh = mesh;

    // O glTF passa por quantize() no pipeline (V-06, orçamento de tamanho) — isso muda o node
    // de base_mesh de identidade para uma transform de "desquantização". Guardamos a pose
    // original completa (não só a geometria) pra restaurar direito depois do corte.
    let pristine = targetMesh.userData.pristine as
      | {
          geometry: THREE.BufferGeometry;
          material: THREE.Material | THREE.Material[];
          position: THREE.Vector3;
          quaternion: THREE.Quaternion;
          scale: THREE.Vector3;
        }
      | undefined;
    if (!pristine) {
      pristine = {
        geometry: targetMesh.geometry,
        material: targetMesh.material,
        position: targetMesh.position.clone(),
        quaternion: targetMesh.quaternion.clone(),
        scale: targetMesh.scale.clone(),
      };
      targetMesh.userData.pristine = pristine;
    }
    const pristineData = pristine;

    function restore() {
      targetMesh.geometry = pristineData.geometry;
      targetMesh.material = pristineData.material;
      targetMesh.position.copy(pristineData.position);
      targetMesh.quaternion.copy(pristineData.quaternion);
      targetMesh.scale.copy(pristineData.scale);
      targetMesh.updateMatrix();
    }

    if (!flatGeometry || !surface) {
      restore();
      return;
    }

    // Revoluciona a palavra em torno do eixo vertical real da peça, ancorada no ponto de hit
    // (ver wrapAroundYAxis) — não usa a outwardNormal do manifest para orientar, só o hit
    // (raio/ângulo/altura) e o up (inclinação da parede).
    const radius = Math.hypot(surface.position.x, surface.position.z);
    const theta0 = Math.atan2(surface.position.x, surface.position.z);
    const radialDir = new THREE.Vector3(surface.position.x, 0, surface.position.z).normalize();
    const cutter = flatGeometry.clone();
    wrapAroundYAxis(cutter, {
      radius,
      theta0,
      baseY: surface.position.y,
      cosTilt: surface.up.y,
      sinTilt: -surface.up.dot(radialDir),
    });

    // Material das faces do corte = cor da casca escurecida (sombra do rebaixo, como na peça
    // real). O Evaluator com useGroups distribui: triângulos vindos da casca → material dela;
    // triângulos vindos do cortador → material de gravação.
    const shellMaterial = (Array.isArray(pristineData.material) ? pristineData.material[0] : pristineData.material) as
      | THREE.MeshStandardMaterial
      | undefined;
    if (!shellMaterial || !(shellMaterial instanceof THREE.MeshStandardMaterial)) {
      cutter.dispose();
      restore();
      return;
    }
    const engravingMaterial = createEngravingMaterial(shellMaterial);

    // Congela a pose real (incluindo a desquantização) direto nos vértices, deixando a malha A
    // na identidade — é o padrão recomendado pela lib de CSG e evita descompasso de escala com
    // o cortador, que já está posicionado em coordenadas reais (via raycast). Também achata
    // os atributos intercalados/quantizados do glTF comprimido (ver toPlainFloat32Geometry).
    targetMesh.updateMatrixWorld(true);
    const baked = toPlainFloat32Geometry(pristineData.geometry).applyMatrix4(targetMesh.matrixWorld);

    const baseBrush = new Brush(baked, shellMaterial);
    const cutterBrush = new Brush(cutter, engravingMaterial);
    cutterBrush.updateMatrixWorld(true);
    const result = createEvaluator().evaluate(baseBrush, cutterBrush, SUBTRACTION);
    baked.dispose();
    cutter.dispose();

    targetMesh.geometry = result.geometry;
    targetMesh.material = result.material;
    targetMesh.position.set(0, 0, 0);
    targetMesh.quaternion.identity();
    targetMesh.scale.set(1, 1, 1);
    targetMesh.updateMatrix();

    return () => {
      restore();
      result.geometry.dispose();
      engravingMaterial.dispose();
    };
  }, [flatGeometry, surface, scene]);

  return null;
}
