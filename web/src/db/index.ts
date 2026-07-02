import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | undefined;

function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL não configurada — ver web/.env.example");
    }
    pool = new Pool({ connectionString: url, max: 5 });
  }
  return pool;
}

/** Instância lazy — não abre conexão no build/import, só no primeiro uso. */
export function getDb() {
  return drizzle(getPool(), { schema });
}

export * from "./schema";
