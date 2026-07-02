/**
 * Pipeline de onboarding de produto: 3MF (Bambu Studio) → GLB otimizado para web.
 *
 * Uso: npx tsx scripts/convert-3mf-to-glb.ts <arquivo.3mf> <outDir> <variantRef>
 * Ex.:  npx tsx scripts/convert-3mf-to-glb.ts "../ARQUIVO....3mf" public/models/comedouro-pet 15cm
 *
 * Saídas:
 *  - {outDir}/{variantRef}.glb           — malhas nomeadas + node vazio `name_slot`
 *  - {outDir}/asset-manifest.json        — contrato consumido pelo visualizador (Épico 1)
 *                                           e pelo gerador de produção (Épico 5)
 *
 * O 3MF de PRODUÇÃO nunca é alterado — este script só lê.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { quantize, meshopt } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import {
  applyTransform,
  composeTransforms,
  open3mf,
  parseMeshFromModelXml,
  parseTransform,
  toGltfSpace,
  type Mesh3mf,
  type Transform3mf,
} from "./lib3mf";

interface NamedPart {
  name: string;
  mesh: Mesh3mf;
  /** transform 3MF (local → mundo montado) */
  transform: Transform3mf;
}

function transformToGltfPositions(mesh: Mesh3mf, t: Transform3mf): Float32Array {
  const out = new Float32Array(mesh.positions.length);
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const [wx, wy, wz] = applyTransform(t, mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]);
    const [gx, gy, gz] = toGltfSpace(wx, wy, wz);
    out[i] = gx;
    out[i + 1] = gy;
    out[i + 2] = gz;
  }
  return out;
}

/** Normais suaves ponderadas por área, calculadas APÓS a transform (há escala não uniforme). */
function computeNormals(positions: Float32Array, indices: Uint32Array): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    const abx = positions[b] - positions[a], aby = positions[b + 1] - positions[a + 1], abz = positions[b + 2] - positions[a + 2];
    const acx = positions[c] - positions[a], acy = positions[c + 1] - positions[a + 1], acz = positions[c + 2] - positions[a + 2];
    const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    for (const v of [a, b, c]) {
      normals[v] += nx;
      normals[v + 1] += ny;
      normals[v + 2] += nz;
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= len;
    normals[i + 1] /= len;
    normals[i + 2] /= len;
  }
  return normals;
}

function centroidOf(positions: Float32Array): [number, number, number] {
  let x = 0, y = 0, z = 0;
  const n = positions.length / 3;
  for (let i = 0; i < positions.length; i += 3) {
    x += positions[i];
    y += positions[i + 1];
    z += positions[i + 2];
  }
  return [x / n, y / n, z / n];
}

function bboxOf(positions: Float32Array) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], positions[i + k]);
      max[k] = Math.max(max[k], positions[i + k]);
    }
  }
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

async function main() {
  const [inputArg, outDirArg, variantRef] = process.argv.slice(2);
  if (!inputArg || !outDirArg || !variantRef) {
    console.error("Uso: tsx scripts/convert-3mf-to-glb.ts <arquivo.3mf> <outDir> <variantRef>");
    process.exit(1);
  }
  const inputPath = resolve(inputArg);
  const outDir = resolve(outDirArg);
  mkdirSync(outDir, { recursive: true });

  console.log(`📦 Lendo ${inputPath}`);
  const archive = open3mf(new Uint8Array(readFileSync(inputPath)));

  const settings = archive.files.get("Metadata/model_settings.config");
  const rootModel = archive.files.get("3D/3dmodel.model");
  if (!settings || !rootModel) throw new Error("3MF sem model_settings.config ou 3dmodel.model");

  // --- Transforms de montagem (visão montada do produto, não a de impressão) ---
  const assembleRe = /<assemble_item object_id="(\d+)"[^>]*transform="([^"]+)"/g;
  const assembleByObject = new Map<string, Transform3mf>();
  let am: RegExpExecArray | null;
  while ((am = assembleRe.exec(settings))) {
    assembleByObject.set(am[1], parseTransform(am[2]));
  }
  if (assembleByObject.size === 0) throw new Error("Sem <assemble> no 3MF — abrir no Bambu e salvar o projeto montado");

  // --- Componentes de cada objeto (arquivo .model externo + transform local) ---
  const objectRe = /<object id="(\d+)"[^>]*type="model">([\s\S]*?)<\/object>/g;
  const componentRe = /<component p:path="([^"]+)" objectid="(\d+)"[^>]*?(?:transform="([^"]+)")?\s*\/>/g;

  // Nomes e partes negativas vêm do model_settings.config
  const partMetaRe = /<part id="(\d+)" subtype="([^"]+)">\s*<metadata key="name" value="([^"]+)"\/>/g;
  const partInfo = new Map<string, { subtype: string; name: string }>();
  let pm: RegExpExecArray | null;
  while ((pm = partMetaRe.exec(settings))) {
    partInfo.set(pm[1], { subtype: pm[2], name: pm[3] });
  }

  const textInfoMatch = settings.match(/<text_info text="([^"]*)" font_name="([^"]*)"[^>]*font_size="([^"]*)"[^>]*thickness="([^"]*)"/);

  const parts: NamedPart[] = [];
  let textAnchor: { positions: Float32Array } | null = null;

  let om: RegExpExecArray | null;
  while ((om = objectRe.exec(rootModel))) {
    const objectId = om[1];
    const body = om[2];
    const assemble = assembleByObject.get(objectId);
    if (!assemble) continue; // objeto fora da montagem

    componentRe.lastIndex = 0;
    let cm: RegExpExecArray | null;
    while ((cm = componentRe.exec(body))) {
      const [, path, componentObjectId, transformAttr] = cm;
      const modelXml = archive.files.get(path.replace(/^\//, ""));
      if (!modelXml) throw new Error(`Arquivo de malha não encontrado: ${path}`);
      const local = parseTransform(transformAttr);
      const world = composeTransforms(assemble, local);
      const mesh = parseMeshFromModelXml(modelXml, componentObjectId);
      const info = partInfo.get(componentObjectId);

      if (info?.subtype === "negative_part") {
        // Parte negativa = texto gravado (Text Tool). Vira a âncora `name_slot`, não malha.
        textAnchor = { positions: transformToGltfPositions(mesh, world) };
        continue;
      }
      parts.push({ name: info?.name ?? `part_${componentObjectId}`, mesh, transform: world });
    }
  }

  if (parts.length === 0) throw new Error("Nenhuma malha encontrada");
  console.log(`🧩 Partes: ${parts.map((p) => `${p.name} (${p.mesh.indices.length / 3} tris)`).join(", ")}`);
  if (textAnchor) console.log(`🔤 Texto gravado detectado: "${textInfoMatch?.[1]}" fonte=${textInfoMatch?.[2]} size=${textInfoMatch?.[3]}`);

  // Nomes canônicos: primeira parte (corpo que recebe o nome) = base_mesh; demais = part_N ou nome original
  const meshNameMap: Record<string, string> = {};
  parts.forEach((p, i) => {
    const canonical = i === 0 ? "base_mesh" : i === 1 ? "bowl_mesh" : `part_${i}`;
    meshNameMap[canonical] = p.name;
    p.name = canonical;
  });

  // --- Monta o glTF ---
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene("product");

  const overallPositions: Float32Array[] = [];
  for (const part of parts) {
    const positions = transformToGltfPositions(part.mesh, part.transform);
    overallPositions.push(positions);
    const normals = computeNormals(positions, part.mesh.indices);

    const posAccessor = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(positions as Float32Array<ArrayBuffer>)
      .setBuffer(buffer);
    const normAccessor = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(normals as Float32Array<ArrayBuffer>)
      .setBuffer(buffer);
    const idxAccessor = doc
      .createAccessor()
      .setType("SCALAR")
      .setArray(part.mesh.indices as Uint32Array<ArrayBuffer>)
      .setBuffer(buffer);

    const material = doc
      .createMaterial(`${part.name}_mat`)
      .setBaseColorFactor([0.8, 0.8, 0.8, 1])
      .setRoughnessFactor(0.6)
      .setMetallicFactor(0);

    const prim = doc
      .createPrimitive()
      .setAttribute("POSITION", posAccessor)
      .setAttribute("NORMAL", normAccessor)
      .setIndices(idxAccessor)
      .setMaterial(material);

    const mesh = doc.createMesh(part.name).addPrimitive(prim);
    scene.addChild(doc.createNode(part.name).setMesh(mesh));
  }

  // --- Âncora name_slot: derivada do mesh real do texto de exemplo ---
  let anchorManifest: Record<string, unknown> | null = null;
  if (textAnchor) {
    const center = centroidOf(textAnchor.positions);
    const tb = bboxOf(textAnchor.positions);
    // Normal para fora: do eixo vertical do produto em direção ao texto (plano XZ)
    const allBbox = bboxOf(concat(overallPositions));
    const productCenter = [(allBbox.min[0] + allBbox.max[0]) / 2, 0, (allBbox.min[2] + allBbox.max[2]) / 2];
    let nx = center[0] - productCenter[0];
    let nz = center[2] - productCenter[2];
    const nLen = Math.hypot(nx, nz) || 1;
    nx /= nLen;
    nz /= nLen;

    const anchorNode = doc.createNode("name_slot").setTranslation([center[0], center[1], center[2]]);
    scene.addChild(anchorNode);

    anchorManifest = {
      node: "name_slot",
      position: center,
      outwardNormal: [nx, 0, nz],
      up: [0, 1, 0],
      // Caixa do texto de exemplo ("CHARLIE") — o visualizador ajusta o nome digitado a esta altura
      sampleText: textInfoMatch?.[1] ?? null,
      sampleTextSize: tb.size,
      engraveDepthM: textInfoMatch ? Number(textInfoMatch[4]) / 1000 : 0.002,
    };
  }

  // --- Otimização: quantização + compressão meshopt ---
  await MeshoptEncoder.ready;
  await doc.transform(quantize(), meshopt({ encoder: MeshoptEncoder }));

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
  });
  const glbPath = join(outDir, `${variantRef}.glb`);
  const glb = await io.writeBinary(doc);
  writeFileSync(glbPath, glb);
  console.log(`✅ GLB: ${glbPath} (${(glb.byteLength / 1024 / 1024).toFixed(2)} MB)`);

  // --- Manifest: contrato Épico 1 (visualizador) ↔ Épico 5 (produção) ---
  const allBbox = bboxOf(concat(overallPositions));
  const manifest = {
    generatedAt: new Date().toISOString(),
    source3mf: inputArg,
    variantRef,
    units: "meters",
    coordinateSystem: "gltf (Y-up)",
    dimensions: allBbox.size,
    meshes: parts.map((p) => ({ name: p.name, originalName: meshNameMap[p.name] })),
    anchor: anchorManifest,
    fonts: {
      /** Fonte do 3MF de produção (Bambu Text Tool) — usada pelo Épico 5 no servidor */
      production: textInfoMatch?.[2] ?? "Impact",
      productionSize: textInfoMatch ? Number(textInfoMatch[3]) : 28,
      /** Fonte web (licença livre, visualmente próxima) — disclaimer "representação aproximada" */
      web: "Anton",
      webFile: "/fonts/Anton-Regular.ttf",
    },
  };
  const manifestPath = join(outDir, "asset-manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✅ Manifest: ${manifestPath}`);
}

function concat(arrays: Float32Array[]): Float32Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

main().catch((err) => {
  console.error("❌ Conversão falhou:", err);
  process.exit(1);
});
