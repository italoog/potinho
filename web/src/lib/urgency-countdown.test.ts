import { beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";

let testDb: ReturnType<typeof drizzle<typeof schema>>;

vi.mock("@/db", async () => {
  const actual = await vi.importActual<typeof schema>("@/db/schema");
  return { ...actual, getDb: async () => testDb };
});

// revalidateTag/unstable_cache exigem contexto de request do Next — fora dele (aqui, testes unitários), viram no-op.
const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag,
  unstable_cache: (fn: unknown) => fn,
}));

const { getUrgencyCountdown, updateUrgencyCountdown } = await import("./urgency-countdown");

beforeAll(async () => {
  const client = new PGlite();
  testDb = drizzle(client, { schema });
  await migrate(testDb, { migrationsFolder: "./drizzle" });
});

describe("getUrgencyCountdown", () => {
  it("usa os defaults quando não há linha 'main' salva", async () => {
    expect(await getUrgencyCountdown()).toEqual({
      enabled: true,
      durationMinutes: 167,
      label: "oferta por tempo limitado",
    });
  });
});

describe("updateUrgencyCountdown (9.2 admin)", () => {
  it("grava a config e getUrgencyCountdown passa a refletir o novo valor", async () => {
    await updateUrgencyCountdown({ enabled: false, durationMinutes: 30, label: "última chance" });

    expect(await getUrgencyCountdown()).toEqual({
      enabled: false,
      durationMinutes: 30,
      label: "última chance",
    });
    expect(revalidateTag).toHaveBeenCalledWith("urgency-countdown", { expire: 0 });
  });

  it("upsert: uma 2ª chamada atualiza a mesma linha 'main', não duplica", async () => {
    await updateUrgencyCountdown({ enabled: true, durationMinutes: 60, label: "voltou" });

    expect(await getUrgencyCountdown()).toEqual({ enabled: true, durationMinutes: 60, label: "voltou" });
  });
});
