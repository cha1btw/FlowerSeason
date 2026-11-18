import { runMigrations } from "../lib/db/migrate.ts";

if (process.env.DATABASE_URL) {
  await runMigrations(process.env.DATABASE_URL);
  await import("./seed-december-2026.ts");
} else {
  console.log("DATABASE_URL is not configured; database preparation skipped.");
}
