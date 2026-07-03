import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * Banco de dados com dois modos (ADR-002):
 * - DATABASE_URL definida → PostgreSQL (produção/staging/docker local)
 * - sem DATABASE_URL (dev) → PGlite persistido em .data/pglite,
 *   com migrations + seed automáticos — fluxo completo sem Docker.
 */

export type Db = NodePgDatabase<typeof schema>;

// globalThis: em dev o Next duplica módulos entre bundles (pages vs route handlers);
// um singleton de módulo criaria VÁRIAS instâncias PGlite no mesmo diretório.
const globalCache = globalThis as unknown as { __forja3dDb?: Promise<Db> };

async function createPgDb(url: string): Promise<Db> {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url, max: 5 });
  return drizzle(pool, { schema }) as Db;
}

async function createDevDb(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const path = await import("node:path");

  const dataDir = path.resolve(process.cwd(), ".data/pglite");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });

  // seed idempotente do produto-piloto
  const { comedouroPet } = await import("./seed-data");
  await db.insert(schema.products).values(comedouroPet).onConflictDoNothing();

  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  if (!globalCache.__forja3dDb) {
    const url = process.env.DATABASE_URL;
    globalCache.__forja3dDb = url ? createPgDb(url) : createDevDb();
  }
  return globalCache.__forja3dDb;
}

export * from "./schema";
