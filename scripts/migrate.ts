// Usage: node --env-file-if-exists=.env.local scripts/migrate.ts
import { runMigrations } from "../lib/db/migrate.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

await runMigrations(url);
console.log("Migrations applied.");
