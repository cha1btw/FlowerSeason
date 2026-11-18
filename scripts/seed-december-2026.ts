import { and, eq } from "drizzle-orm";
import { createDb } from "../lib/db/index.ts";
import { sessions, siteSettings } from "../lib/db/schema.ts";
import { kyivLocalToUtc } from "../lib/time.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const db = createDb(url);
const rows = [
  { day: 5, hour: 11, title: "РІЗДВЯНИЙ ВІНОК", durationMin: 120 },
  { day: 12, hour: 11, title: "РІЗДВЯНИЙ ВІНОК", durationMin: 120 },
  { day: 12, hour: 14, title: "УКРАЇНСЬКИЙ СОЛОМ’ЯНИЙ ПАВУК", durationMin: 0 },
  { day: 19, hour: 11, title: "РІЗДВЯНИЙ ВІНОК", durationMin: 120 },
  { day: 26, hour: 11, title: "РІЗДВЯНИЙ ВІНОК", durationMin: 120 },
];
const [seeded] = await db.select().from(siteSettings).where(eq(siteSettings.key, "december-2026"));
if (!seeded) for (const row of rows) {
  const startsAt = kyivLocalToUtc(2026, 12, row.day, row.hour, 0);
  if (!startsAt) throw new Error(`Invalid date: ${row.day}`);
  const [existing] = await db.select({ id: sessions.id }).from(sessions)
    .where(and(eq(sessions.startsAt, startsAt), eq(sessions.title, row.title)));
  if (!existing) await db.insert(sessions).values({
    startsAt, title: row.title, durationMin: row.durationMin,
    capacity: 10, priceKop: 290_000,
    location: "Matilda · провулок Чеховський, 4, Київ",
  });
}
if (!seeded) await db.insert(siteSettings).values({ key: "december-2026", value: "1" }).onConflictDoNothing();
await db.$client.end();
console.log("December 2026 sessions are ready.");
