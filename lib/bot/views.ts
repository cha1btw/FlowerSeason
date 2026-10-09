import type { Analytics, AdminSession } from "../booking/admin-service.ts";
import type { Booking } from "../db/schema.ts";
import { formatUah, pluralSeats } from "../format.ts";
import { escapeTelegramHtml as esc } from "../telegram.ts";
import { formatSessionDate, formatSessionTime, formatSessionWeekday } from "../time.ts";

// Telegram rejects messages over 4096 characters.
const LIMIT = 3900;

export function clip(text: string): string {
  return text.length <= LIMIT ? text : `${text.slice(0, LIMIT)}\n…`;
}

export const when = (startsAt: Date) =>
  `${formatSessionDate(startsAt)} (${formatSessionWeekday(startsAt)}), ${formatSessionTime(startsAt)}`;

const statusIcon = (s: AdminSession) => (s.status === "open" ? "🟢" : "🔒");

export function scheduleLine(s: AdminSession): string {
  return `${statusIcon(s)} ${formatSessionDate(s.startsAt)} ${formatSessionTime(s.startsAt)} · ✅${s.paidSeats} 🕓${s.requestedSeats} / ${s.capacity}`;
}

export function scheduleText(sessions: AdminSession[]): string {
  if (sessions.length === 0) {
    return "📅 <b>Розклад</b>\n\nМайбутніх дат немає. Натисніть «➕ Нова дата».";
  }
  return "📅 <b>Розклад</b>\nОберіть дату, щоб побачити учасників:";
}

export function participantLine(b: Booking): string {
  const flag = b.status === "requested" ? "🕓 " : b.status === "paid" ? "✅ " : "";
  return `${flag}${esc(b.name)} · ${esc(b.phone)} · ${esc(b.email)} · ${esc(pluralSeats(b.seats))}`;
}

export function sessionCardText(s: AdminSession, participants: Booking[]): string {
  const free = Math.max(0, s.capacity - s.paidSeats - s.requestedSeats);
  const header = [
    `<b>${esc(when(s.startsAt))}</b>`,
    `${s.status === "open" ? "🟢 Продаж відкрито" : s.status === "closed" ? "🔒 Продаж закрито" : "❌ Скасовано"}`,
    `Ціна: ${esc(formatUah(s.priceKop))} · Місць: ${s.capacity}`,
    `✅ Оплачено: <b>${s.paidSeats}</b> · 🕓 Чекають оплати: ${s.requestedSeats} · Вільно: ${free}`,
    `Виручка: ${esc(formatUah(s.revenueKop))}`,
  ].join("\n");

  const list =
    participants.length === 0
      ? "\nУчасників поки немає."
      : `\n\n<b>Учасники:</b>\n${participants.map((p, i) => `${i + 1}. ${participantLine(p)}`).join("\n")}`;

  return clip(header + list);
}

const RU_MONTH_DAY = (iso: string) => {
  const [, month, day] = iso.split("-");
  return `${day}.${month}`;
};

export function requestsText(rows: { booking: Booking; startsAt: Date }[]): string {
  if (rows.length === 0) {
    return "🕓 <b>Заявки</b>\n\nЗаявок, що чекають оплати, немає.";
  }
  return `🕓 <b>Заявки, що чекають оплати (${rows.length})</b>\nОберіть заявку:`;
}

export function analyticsText(a: Analytics, upcoming: AdminSession[]): string {
  const conversion =
    a.createdBookings === 0 ? 0 : Math.round((a.paidBookings / a.createdBookings) * 100);

  const lines = [
    "📊 <b>Аналітика</b>",
    "",
    `Отримано оплат: <b>${esc(formatUah(a.revenueKop))}</b>`,
    `Оплачено: ${a.paidBookings} записів · ${esc(pluralSeats(a.paidSeats))}`,
    `За 7 днів: ${esc(formatUah(a.last7DaysRevenueKop))} · ${esc(pluralSeats(a.last7DaysSeats))}`,
    `Чекають оплати: ${a.requestedBookings} заявок на ${esc(formatUah(a.requestedKop))}`,
    `Дійшли до оплати: ${conversion}% (${a.paidBookings} з ${a.createdBookings} заявок)`,
    `Скасовано: ${a.cancelledBookings}`,
  ];

  if (a.perDay.length > 0) {
    lines.push("", "<b>Оплати по днях:</b>");
    for (const d of a.perDay) {
      lines.push(`${RU_MONTH_DAY(d.day)} · ${esc(formatUah(d.revenueKop))} · ${d.seats} міс.`);
    }
  }

  if (upcoming.length > 0) {
    lines.push("", "<b>Заповнюваність найближчих дат:</b>");
    for (const s of upcoming.slice(0, 10)) {
      const taken = s.paidSeats + s.requestedSeats;
      const pct = Math.round((taken / s.capacity) * 100);
      lines.push(
        `${formatSessionDate(s.startsAt)} ${formatSessionTime(s.startsAt)} · ${taken}/${s.capacity} (${pct}%) · оплачено ${esc(formatUah(s.revenueKop))}`,
      );
    }
  }
  return clip(lines.join("\n"));
}
