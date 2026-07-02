import { z } from "zod";

/** Contrato gerado por scripts/convert-3mf-to-glb.ts — compartilhado com o Épico 5 */
export const assetManifestSchema = z.object({
  generatedAt: z.string(),
  source3mf: z.string(),
  variantRef: z.string(),
  units: z.literal("meters"),
  dimensions: z.tuple([z.number(), z.number(), z.number()]),
  meshes: z.array(z.object({ name: z.string(), originalName: z.string() })),
  anchor: z
    .object({
      node: z.string(),
      position: z.tuple([z.number(), z.number(), z.number()]),
      outwardNormal: z.tuple([z.number(), z.number(), z.number()]),
      up: z.tuple([z.number(), z.number(), z.number()]),
      sampleText: z.string().nullable(),
      sampleTextSize: z.tuple([z.number(), z.number(), z.number()]),
      engraveDepthM: z.number(),
    })
    .nullable(),
  fonts: z.object({
    production: z.string(),
    productionSize: z.number(),
    web: z.string(),
    webFile: z.string(),
  }),
});

export type AssetManifest = z.infer<typeof assetManifestSchema>;

/** URL do manifest ao lado do GLB: /models/<slug>/asset-manifest.json */
export function manifestUrlFor(modelUrl: string): string {
  return modelUrl.replace(/\/[^/]+\.glb$/, "/asset-manifest.json");
}

export async function fetchAssetManifest(modelUrl: string): Promise<AssetManifest> {
  const res = await fetch(manifestUrlFor(modelUrl));
  if (!res.ok) throw new Error(`asset-manifest.json não encontrado para ${modelUrl}`);
  return assetManifestSchema.parse(await res.json());
}
