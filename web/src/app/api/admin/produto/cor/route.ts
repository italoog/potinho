import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { addProductColor, removeProductColor } from "@/lib/products";

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const bodySchema = z.object({
  productId: z.string().uuid(),
  paramKey: z.string().min(1),
  label: z.string().min(1),
  hex,
  /** 2 a 4 hex — presente só quando a cor é uma mistura de filamentos. */
  blend: z.array(hex).min(2).max(4).optional(),
});

const deleteBodySchema = z.object({
  productId: z.string().uuid(),
  paramKey: z.string().min(1),
  hex,
});

/** Cadastra uma cor nova, comum ou misturada (9.5 extensão). */
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const body = bodySchema.parse(await request.json());
    await addProductColor(body.productId, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Cadastro de cor falhou:", err);
    const message =
      err instanceof z.ZodError ? "Dados inválidos" : err instanceof Error ? err.message : "Não foi possível salvar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Remove uma cor (9.5 extensão). */
export async function DELETE(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const body = deleteBodySchema.parse(await request.json());
    await removeProductColor(body.productId, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Remoção de cor falhou:", err);
    const message =
      err instanceof z.ZodError ? "Dados inválidos" : err instanceof Error ? err.message : "Não foi possível remover";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
