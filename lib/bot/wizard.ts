import { kyivLocalToUtc } from "../time.ts";

type YMD = { year: number; month: number; day: number };

function isRealDate({ year, month, day }: YMD): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
  );
}

// "20.12", "20/12", "20-12-2026", "20 12 26". Without a year, the next
// occurrence of that day counts: typing "05.01" in December means January.
export function parseDate(input: string, today: YMD): YMD | null {
  const match = input.trim().match(/^(\d{1,2})[./\-\s](\d{1,2})(?:[./\-\s](\d{2}|\d{4}))?$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year: number;

  if (match[3]) {
    year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  } else {
    year = today.year;
    const isPast =
      month < today.month || (month === today.month && day < today.day);
    if (isPast) year += 1;
  }

  const result = { year, month, day };
  return isRealDate(result) ? result : null;
}

// "18:00", "18.00", "9:30", "1800".
export function parseTime(input: string): { hour: number; minute: number } | null {
  const match = input.trim().match(/^(\d{1,2})[:.\s]?(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function parseCapacity(input: string): number | null {
  if (!/^\d{1,3}$/.test(input.trim())) return null;
  const value = Number(input.trim());
  return value >= 1 && value <= 50 ? value : null;
}

// "1800", "1800.50", "1 800" -> kopecks. Whole hryvnias up to 100 000.
export function parsePriceKop(input: string): number | null {
  const match = input.trim().replace(/\s/g, "").match(/^(\d{1,6})(?:[.,](\d{1,2}))?$/);
  if (!match) return null;
  const kop = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0") || 0);
  return kop >= 100 && kop <= 100_000 * 100 ? kop : null;
}

export type StartResult =
  | { ok: true; startsAt: Date }
  | { ok: false; reason: "nonexistent" | "past" };

export function combineStart(
  date: YMD,
  time: { hour: number; minute: number },
  now: Date,
): StartResult {
  const startsAt = kyivLocalToUtc(date.year, date.month, date.day, time.hour, time.minute);
  if (!startsAt) return { ok: false, reason: "nonexistent" };
  if (startsAt.getTime() <= now.getTime()) return { ok: false, reason: "past" };
  return { ok: true, startsAt };
}

// "21.12 18:00", "21.12.2026 18:00". The date part reuses parseDate's rules.
export function parseDateTime(
  input: string,
  today: YMD,
): { date: YMD; time: { hour: number; minute: number } } | null {
  const parts = input.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const time = parseTime(parts[parts.length - 1]);
  const date = parseDate(parts.slice(0, -1).join(" "), today);
  return date && time ? { date, time } : null;
}

// Minutes, 30 to 480 (8 hours).
export function parseDuration(input: string): number | null {
  if (!/^\d{2,3}$/.test(input.trim())) return null;
  const value = Number(input.trim());
  return value >= 30 && value <= 480 ? value : null;
}
