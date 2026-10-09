import { kyivDateParts, kyivLocalToUtc } from "../time.ts";
import type { SessionWithAvailability } from "./service.ts";

// Sample dates shown while no database is connected. They are always in the
// next December still ahead of us, so the page never looks stale.
export function demoSessions(now: Date = new Date()): SessionWithAvailability[] {
  const today = kyivDateParts(now);
  const year = today.month === 12 && today.day > 20 ? today.year + 1 : today.year;

  const rows = [
    { day: 13, hour: 12, capacity: 8, left: 7, priceKop: 180_000 },
    { day: 14, hour: 15, capacity: 8, left: 8, priceKop: 180_000 },
    { day: 20, hour: 18, capacity: 2, left: 0, priceKop: 200_000 },
  ];

  return rows.flatMap((row) => {
    const startsAt = kyivLocalToUtc(year, 12, row.day, row.hour, 0);
    if (!startsAt) return [];
    return [
      {
        id: `demo-${row.day}`,
        startsAt,
        durationMin: 120,
        capacity: row.capacity,
        priceKop: row.priceKop,
        status: "open" as const,
        createdAt: now,
        seatsTaken: row.capacity - row.left,
        seatsLeft: row.left,
      },
    ];
  });
}
