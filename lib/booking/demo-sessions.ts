import { kyivDateParts, kyivLocalToUtc } from "../time.ts";
import type { SessionWithAvailability } from "./service.ts";

// Sample dates shown while no database is connected. They are always in the
// next December still ahead of us, so the page never looks stale.
export function demoSessions(now: Date = new Date()): SessionWithAvailability[] {
  const today = kyivDateParts(now);
  const year = today.month === 12 && today.day > 20 ? today.year + 1 : today.year;

  const rows = [
    { day: 5, hour: 11, title: "РІЗДВЯНИЙ ВІНОК", durationMin: 120 },
    { day: 12, hour: 11, title: "РІЗДВЯНИЙ ВІНОК", durationMin: 120 },
    { day: 12, hour: 14, title: "УКРАЇНСЬКИЙ СОЛОМ’ЯНИЙ ПАВУК", durationMin: 0 },
    { day: 19, hour: 11, title: "РІЗДВЯНИЙ ВІНОК", durationMin: 120 },
    { day: 26, hour: 11, title: "РІЗДВЯНИЙ ВІНОК", durationMin: 120 },
  ];

  return rows.flatMap((row) => {
    const startsAt = kyivLocalToUtc(year, 12, row.day, row.hour, 0);
    if (!startsAt) return [];
    return [
      {
        id: `demo-${row.day}-${row.hour}`,
        title: row.title,
        location: "Matilda · провулок Чеховський, 4, Київ",
        startsAt,
        durationMin: row.durationMin,
        capacity: 10,
        priceKop: 290_000,
        status: "open" as const,
        createdAt: now,
        seatsTaken: 0,
        seatsLeft: 10,
      },
    ];
  });
}
