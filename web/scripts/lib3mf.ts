/**
 * Parser mínimo de 3MF (Bambu Studio) — extrai malhas e transforms.
 * 3MF: unidade mm, Z-up, transform = 12 números (4x3, convenção row-vector).
 */
import { unzipSync } from "fflate";

export interface Mesh3mf {
  positions: Float32Array; // xyz intercalado
  indices: Uint32Array;
}

/** p' = [x y z 1] * M (4x3 row-major) */
export type Transform3mf = number[]; // 12 números

export const IDENTITY_3MF: Transform3mf = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];

export function parseTransform(attr: string | undefined): Transform3mf {
  if (!attr) return IDENTITY_3MF;
  const nums = attr.trim().split(/\s+/).map(Number);
  if (nums.length !== 12 || nums.some((n) => Number.isNaN(n))) {
    throw new Error(`Transform 3MF inválida: "${attr}"`);
  }
  return nums;
}

export function applyTransform(t: Transform3mf, x: number, y: number, z: number): [number, number, number] {
  return [
    x * t[0] + y * t[3] + z * t[6] + t[9],
    x * t[1] + y * t[4] + z * t[7] + t[10],
    x * t[2] + y * t[5] + z * t[8] + t[11],
  ];
}

/** Só a parte linear (rotação+escala), sem translação — para transformar direções/eixos locais, não pontos. */
export function transformDirection(t: Transform3mf, x: number, y: number, z: number): [number, number, number] {
  return [x * t[0] + y * t[3] + z * t[6], x * t[1] + y * t[4] + z * t[7], x * t[2] + y * t[5] + z * t[8]];
}

/** a ∘ b: aplica b primeiro, depois a (p * b * a na convenção row-vector) */
export function composeTransforms(a: Transform3mf, b: Transform3mf): Transform3mf {
  const r = new Array<number>(12);
  for (let col = 0; col < 3; col++) {
    r[0 + col] = b[0] * a[0 + col] + b[1] * a[3 + col] + b[2] * a[6 + col];
    r[3 + col] = b[3] * a[0 + col] + b[4] * a[3 + col] + b[5] * a[6 + col];
    r[6 + col] = b[6] * a[0 + col] + b[7] * a[3 + col] + b[8] * a[6 + col];
    r[9 + col] = b[9] * a[0 + col] + b[10] * a[3 + col] + b[11] * a[6 + col] + a[9 + col];
  }
  return r;
}

const VERTEX_RE = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
const TRIANGLE_RE = /<triangle\s+v1="([^"]+)"\s+v2="([^"]+)"\s+v3="([^"]+)"/g;

/** Extrai a malha de um <object id="..."> dentro de um arquivo .model */
export function parseMeshFromModelXml(xml: string, objectId: string): Mesh3mf {
  const objStart = xml.indexOf(`<object id="${objectId}"`);
  if (objStart === -1) throw new Error(`Object id=${objectId} não encontrado`);
  const objEnd = xml.indexOf("</object>", objStart);
  const section = xml.slice(objStart, objEnd);

  const positions: number[] = [];
  const indices: number[] = [];
  let m: RegExpExecArray | null;
  VERTEX_RE.lastIndex = 0;
  while ((m = VERTEX_RE.exec(section))) {
    positions.push(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  TRIANGLE_RE.lastIndex = 0;
  while ((m = TRIANGLE_RE.exec(section))) {
    indices.push(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  if (positions.length === 0 || indices.length === 0) {
    throw new Error(`Malha vazia para object id=${objectId}`);
  }
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}

export interface Archive3mf {
  /** conteúdo textual por caminho interno */
  files: Map<string, string>;
}

export function open3mf(buffer: Uint8Array): Archive3mf {
  const raw = unzipSync(buffer);
  const files = new Map<string, string>();
  const decoder = new TextDecoder();
  for (const [path, data] of Object.entries(raw)) {
    if (path.endsWith(".model") || path.endsWith(".xml") || path.endsWith(".config") || path.endsWith(".rels")) {
      files.set(path, decoder.decode(data));
    }
  }
  return { files };
}

/** mm Z-up (3MF) → m Y-up (glTF): (x,y,z) → (x, z, -y) * 0.001 */
export function toGltfSpace(x: number, y: number, z: number): [number, number, number] {
  return [x * 0.001, z * 0.001, -y * 0.001];
}
