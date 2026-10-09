import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema.ts";

export type Db = PostgresJsDatabase<typeof schema> & { $client: Sql };
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export function createDb(url: string, max = 1): Db {
  // prepare: false keeps this compatible with pgbouncer-style pooled URLs (Neon).
  // max defaults to 1: a serverless invocation should hold at most one connection.
  const client = postgres(url, { max, prepare: false });
  return drizzle(client, { schema });
}

let cached: Db | undefined;

export function getDb(): Db {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not configured.");
    cached = createDb(url);
  }
  return cached;
}
