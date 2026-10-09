// Dates are stored in UTC; everything the owner types and the customer reads
// is Europe/Kyiv local time (UTC+2 in winter, UTC+3 in summer).
export const KYIV_TZ = "Europe/Kyiv";

const dateFormat = new Intl.DateTimeFormat("uk-UA", {
  timeZone: KYIV_TZ,
  day: "numeric",
  month: "long",
});
const weekdayFormat = new Intl.DateTimeFormat("uk-UA", {
  timeZone: KYIV_TZ,
  weekday: "long",
});
const timeFormat = new Intl.DateTimeFormat("uk-UA", {
  timeZone: KYIV_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: KYIV_TZ,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

export const formatSessionDate = (date: Date) => dateFormat.format(date);
export const formatSessionWeekday = (date: Date) => weekdayFormat.format(date);
export const formatSessionTime = (date: Date) => timeFormat.format(date);

type KyivParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export function kyivDateParts(date: Date): KyivParts {
  const parts = Object.fromEntries(
    partsFormat.formatToParts(date).map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  };
}

// Offset of Kyiv from UTC at the given instant, in milliseconds.
function kyivOffsetMs(utcMs: number): number {
  const p = kyivDateParts(new Date(utcMs));
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(utcMs / 60_000) * 60_000;
}

// Converts a wall-clock time in Kyiv to the UTC instant.
// Returns null for impossible input (31 February) and for times that do not
// exist because clocks jump forward (03:00-04:00 on the last Sunday of March).
// For the repeated hour in autumn the later occurrence is returned.
export function kyivLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date | null {
  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  if (Number.isNaN(wanted)) return null;

  let utcMs = wanted - kyivOffsetMs(wanted);
  const adjusted = wanted - kyivOffsetMs(utcMs);
  if (adjusted !== utcMs) utcMs = adjusted;

  const back = kyivDateParts(new Date(utcMs));
  if (
    back.year !== year ||
    back.month !== month ||
    back.day !== day ||
    back.hour !== hour ||
    back.minute !== minute
  ) {
    return null;
  }
  return new Date(utcMs);
}
