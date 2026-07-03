"use client";

import { useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Font } from "opentype.js";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import type { AssetManifest } from "@/lib/asset-manifest";
import { buildTextGlyphGeometries, loadFont, type GlyphGeometry } from "./textGeometry";

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
  /** direção horizontal (largura do texto) tangente à superfície no ponto de ancoragem */
  right: THREE.Vector3;
}

const UP_FALLBACK = new THREE.Vector3(0, 1, 0);

/**
 * Acha o ponto e a normal REAIS da casca em cada letra (raycast individual) em vez de uma
 * curvatura matemática única para a palavra toda — a peça não é um cilindro perfeito (afunila,
 * tem recortes de alça), então cada letra pode estar a uma distância/ângulo levemente diferente
 * da âncora central. Letras que caem num vão (alça) simplesmente não são cortadas. Cada letra já
 * sai com a transform "assada" nos próprios vértices (não precisa de Brush.position/quaternion
 * depois) — assim dá pra juntar todas numa geometria só e fazer UMA subtração booleana atômica,
 * em vez de N operações sequenciais (a lib de CSG experimental acumula imprecisão a cada
 * subtração feita em cima do resultado da anterior).
 */
function placeGlyphs(glyphs: GlyphGeometry[], anchor: SurfaceAnchor, targets: THREE.Object3D[]): THREE.BufferGeometry[] {
  const raycaster = new THREE.Raycaster();
  raycaster.near = 0;
  raycaster.far = 0.4;
  const placed: THREE.BufferGeometry[] = [];

  for (const { geometry, centerX } of glyphs) {
    const probeOrigin = anchor.position
      .clone()
      .addScaledVector(anchor.right, centerX)
      .addScaledVector(anchor.normal, 0.2);
    raycaster.set(probeOrigin, anchor.normal.clone().negate());
    const hit = raycaster.intersectObjects(targets, false)[0];
    if (!hit) {
      geometry.dispose();
      continue;
    }

    const localNormal =
      hit.face?.normal.clone().transformDirection(hit.object.matrixWorld).normalize() ?? anchor.normal;
    // mantém o "up" global, só reprojeta pra ficar perpendicular à normal local (Gram-Schmidt) —
    // evita que o texto rotacione em torno do próprio eixo entre uma letra e outra.
    const localUp = anchor.up
      .clone()
      .addScaledVector(localNormal, -anchor.up.dot(localNormal))
      .normalize();
    const upVector = localUp.lengthSq() > 0.5 ? localUp : UP_FALLBACK;

    const target = hit.point.clone().add(localNormal);
    const m = new THREE.Matrix4().lookAt(target, hit.point, upVector);
    m.setPosition(hit.point);
    geometry.applyMatrix4(m);
    placed.push(geometry);
  }
  return placed;
}

// Instância NOVA a cada corte (não reutilizar um Evaluator entre chamadas): o estado interno
// dele (buffers de atributo, BVH cacheada na própria geometria) não zera 100% entre operações
// mesmo com clear() — reaproveitar causava resultados inconsistentes de um nome pro outro
// (às vezes um corte simples de 2-3 letras saía sem gravar nada, sem erro nenhum no console).
function createEvaluator(): Evaluator {
  const evaluator = new Evaluator();
  evaluator.useGroups = false;
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
        const right = new THREE.Vector3().crossVectors(up, normal).normalize();
        setSurface({ position: hit.point.clone(), normal, up, right });
      } else if (tries++ < 90) {
        requestAnimationFrame(probe); // modelo ainda carregando
      }
    }
    probe();
    return () => {
      alive = false;
    };
  }, [manifest.anchor, scene]);

  // Uma geometria por letra (não uma só para a palavra toda — mais robusto pro CSG e permite
  // posicionar cada uma na superfície real via raycast individual em placeGlyphs).
  const glyphGeometries = useMemo(() => {
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
    const glyphs = buildTextGlyphGeometries(font, text, {
      targetHeight: sampleH,
      maxWidth,
      depth: cutDepth + outsideMargin,
    });
    if (glyphs.length === 0) return null;
    // desloca de [-D/2, D/2] (centrado) para [-cutDepth, +outsideMargin] (para dentro da peça)
    const shiftZ = (outsideMargin - cutDepth) / 2;
    glyphs.forEach((g) => g.geometry.translate(0, 0, shiftZ));
    return glyphs;
  }, [font, text, manifest.anchor]);

  useEffect(() => {
    return () => {
      glyphGeometries?.forEach((g) => g.geometry.dispose());
    };
  }, [glyphGeometries]);

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
      | { geometry: THREE.BufferGeometry; position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }
      | undefined;
    if (!pristine) {
      pristine = {
        geometry: targetMesh.geometry,
        position: targetMesh.position.clone(),
        quaternion: targetMesh.quaternion.clone(),
        scale: targetMesh.scale.clone(),
      };
      targetMesh.userData.pristine = pristine;
    }
    const pristineData = pristine;

    function restore() {
      targetMesh.geometry = pristineData.geometry;
      targetMesh.position.copy(pristineData.position);
      targetMesh.quaternion.copy(pristineData.quaternion);
      targetMesh.scale.copy(pristineData.scale);
      targetMesh.updateMatrix();
    }

    if (!glyphGeometries || !surface) {
      restore();
      return;
    }

    const targets: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh && o.name === "base_mesh") targets.push(o);
    });
    const placed = placeGlyphs(glyphGeometries, surface, targets);
    if (placed.length === 0) {
      restore();
      return;
    }

    // Congela a pose real (incluindo a desquantização) direto nos vértices, deixando a malha A
    // na identidade — é o padrão recomendado pela lib de CSG e evita descompasso de escala com
    // o cortador, que já está posicionado em coordenadas reais (via raycast). Também achata
    // os atributos intercalados/quantizados do glTF comprimido (ver toPlainFloat32Geometry).
    targetMesh.updateMatrixWorld(true);
    const baked = toPlainFloat32Geometry(pristineData.geometry).applyMatrix4(targetMesh.matrixWorld);

    // Junta todas as letras (já posicionadas na superfície real) numa geometria só e faz UMA
    // subtração booleana atômica — mais robusto que N subtrações em sequência, onde cada corte
    // atua em cima do resultado (já com pequenas imprecisões) do anterior.
    const mergedCutter = mergeGeometries(placed, false) as THREE.BufferGeometry;
    placed.forEach((g) => g.dispose());

    const baseBrush = new Brush(baked);
    const cutterBrush = new Brush(mergedCutter);
    cutterBrush.updateMatrixWorld(true);
    const result = createEvaluator().evaluate(baseBrush, cutterBrush, SUBTRACTION);
    baked.dispose();
    mergedCutter.dispose();

    targetMesh.geometry = result.geometry;
    targetMesh.position.set(0, 0, 0);
    targetMesh.quaternion.identity();
    targetMesh.scale.set(1, 1, 1);
    targetMesh.updateMatrix();

    return () => {
      restore();
      result.geometry.dispose();
    };
  }, [glyphGeometries, surface, scene]);

  return null;
}
