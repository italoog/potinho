import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { addProductVariant, removeProductVariant } from "@/lib/products";
import { storeFile } from "@/lib/storage";

const deleteBodySchema = z.object({
  productId: z.string().uuid(),
  ref: z.string().min(1),
});

const fieldsSchema = z.object({
  productId: z.string().uuid(),
  ref: z.string().min(1),
  label: z.string().min(1),
  dimensions: z.string().min(1),
  price: z.coerce.number().int().min(0),
  widthCm: z.coerce.number().positive(),
  heightCm: z.coerce.number().positive(),
  lengthCm: z.coerce.number().positive(),
  weightKg: z.coerce.number().positive(),
  /** Se não vier arquivo, reaproveita o modelo de um tamanho existente (mesmo padrão do seed) até o GLB real chegar. */
  fallbackModelUrl: z.string().min(1),
});

/** Cadastra um tamanho novo (9.5 extensão) — arquivo 3D é opcional no primeiro momento. */
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const form = await request.formData();
    const fields = fieldsSchema.parse({
      productId: form.get("productId"),
      ref: form.get("ref"),
      label: form.get("label"),
      dimensions: form.get("dimensions"),
      price: form.get("price"),
      widthCm: form.get("widthCm"),
      heightCm: form.get("heightCm"),
      lengthCm: form.get("lengthCm"),
      weightKg: form.get("weightKg"),
      fallbackModelUrl: form.get("fallbackModelUrl"),
    });

    const file = form.get("model");
    let modelUrl = fields.fallbackModelUrl;
    if (file instanceof File && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer());
      const stored = await storeFile(
        `models/comedouro-pet/${fields.ref}.glb`,
        buf,
        "model/gltf-binary",
      );
      modelUrl = stored.url;
    }

    await addProductVariant(fields.productId, {
      ref: fields.ref,
      label: fields.label,
      dimensions: fields.dimensions,
      modelUrl,
      price: fields.price,
      shipping: {
        widthCm: fields.widthCm,
        heightCm: fields.heightCm,
        lengthCm: fields.lengthCm,
        weightKg: fields.weightKg,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Cadastro de tamanho falhou:", err);
    const message =
      err instanceof z.ZodError ? "Dados inválidos" : err instanceof Error ? err.message : "Não foi possível salvar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Remove um tamanho (9.5 extensão). */
export async function DELETE(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const body = deleteBodySchema.parse(await request.json());
    await removeProductVariant(body.productId, body.ref);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Remoção de tamanho falhou:", err);
    const message =
      err instanceof z.ZodError ? "Dados inválidos" : err instanceof Error ? err.message : "Não foi possível remover";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
