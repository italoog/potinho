import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Storage plugável (ADR-003):
 * - envs STORAGE_* definidas → S3-compatível (R2)
 * - senão (dev) → filesystem em public/uploads (servido pelo Next)
 */

export interface StoredFile {
  /** URL pública para persistir no pedido */
  url: string;
}

function s3Configured(): boolean {
  return Boolean(
    process.env.STORAGE_ENDPOINT &&
      process.env.STORAGE_BUCKET &&
      process.env.STORAGE_ACCESS_KEY_ID &&
      process.env.STORAGE_SECRET_ACCESS_KEY,
  );
}

export async function storeFile(
  key: string,
  data: Buffer,
  contentType: string,
): Promise<StoredFile> {
  if (s3Configured()) {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint: process.env.STORAGE_ENDPOINT,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.STORAGE_BUCKET,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
    const base = process.env.NEXT_PUBLIC_ASSETS_BASE_URL ?? "";
    return { url: `${base}/${key}` };
  }

  const target = path.resolve(process.cwd(), "public/uploads", key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
  return { url: `/uploads/${key}` };
}

/** Decodifica um data URL de PNG com limite de tamanho (snapshot V-07) */
export function decodePngDataUrl(dataUrl: string, maxBytes = 3 * 1024 * 1024): Buffer {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("Snapshot inválido (esperado PNG base64)");
  const buf = Buffer.from(match[1], "base64");
  if (buf.byteLength > maxBytes) throw new Error("Snapshot excede o tamanho máximo");
  return buf;
}
