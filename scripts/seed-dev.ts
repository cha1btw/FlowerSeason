// Dev only: inserts a few sample dates so the booking page has something to show.
// Usage: node --env-file-if-exists=.env.local scripts/seed-dev.ts
import { createDb } from "../lib/db/index.ts";
import { sessions } from "../lib/db/schema.ts";
import { kyivLocalToUtc } from "../lib/time.ts";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed in production.");
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

const year = new Date().getFullYear();
const rows = [
  { day: 13, hour: 12, capacity: 8, priceKop: 180_000 },
  { day: 14, hour: 15, capacity: 8, priceKop: 180_000 },
  { day: 20, hour: 18, capacity: 2, priceKop: 200_000 },
].flatMap(({ day, hour, capacity, priceKop }) => {
  const startsAt = kyivLocalToUtc(year, 12, day, hour, 0);
  return startsAt ? [{ startsAt, capacity, priceKop }] : [];
});

const db = createDb(url);
await db.insert(sessions).values(rows);
await db.$client.end();
console.log(`Inserted ${rows.length} sample sessions.`);
