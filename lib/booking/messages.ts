import { formatUah, pluralSeats } from "../format.ts";
import { formatSessionDate, formatSessionTime, formatSessionWeekday } from "../time.ts";
import type { Email } from "../email.ts";

type Details = {
  name: string;
  email: string;
  phone: string;
  seats: number;
  amountKop: number;
  startsAt: Date;
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const when = (startsAt: Date) =>
  `${formatSessionDate(startsAt)} (${formatSessionWeekday(startsAt)}) о ${formatSessionTime(startsAt)}`;

function layout(title: string, lines: string[], statusUrl: string): string {
  const body = lines.map((line) => `<p style="margin:0 0 14px">${line}</p>`).join("");
  return `<!doctype html><html lang="uk"><body style="margin:0;background:#f9f9f7;color:#1a1a1a;font-family:Helvetica,Arial,sans-serif;line-height:1.6">
<div style="max-width:520px;margin:0 auto;padding:40px 24px">
<p style="margin:0 0 32px;font-size:11px;letter-spacing:.16em">CHRISTMAS BY FLOWER SEASON</p>
<h1 style="margin:0 0 24px;font-size:28px;font-weight:300">${title}</h1>
${body}
<p style="margin:28px 0 0"><a href="${escapeHtml(statusUrl)}" style="color:#1a1a1a">Деталі запису</a></p>
</div></body></html>`;
}

export function confirmationEmail(d: Details, statusUrl: string): Email {
  const summary = `${when(d.startsAt)}, ${pluralSeats(d.seats)}, ${formatUah(d.amountKop)}`;
  return {
    to: d.email,
    subject: `Ви записані на майстер-клас ${formatSessionDate(d.startsAt)} о ${formatSessionTime(d.startsAt)}`,
    html: layout(
      "Ви записані.",
      [
        `${escapeHtml(d.name)}, дякуємо! Оплату отримано.`,
        `<strong>${escapeHtml(summary)}</strong>`,
        "Напередодні ми надішлемо нагадання.",
      ],
      statusUrl,
    ),
    text: `${d.name}, дякуємо! Оплату отримано.\n\n${summary}\n\nДеталі: ${statusUrl}`,
  };
}

export function reminderEmail(d: Details, statusUrl: string): Email {
  const summary = `${when(d.startsAt)}, ${pluralSeats(d.seats)}`;
  return {
    to: d.email,
    subject: `Нагадування: майстер-клас ${formatSessionDate(d.startsAt)} о ${formatSessionTime(d.startsAt)}`,
    html: layout(
      "Чекаємо на вас.",
      [
        `${escapeHtml(d.name)}, нагадуємо про ваш майстер-клас.`,
        `<strong>${escapeHtml(summary)}</strong>`,
      ],
      statusUrl,
    ),
    text: `${d.name}, нагадуємо про ваш майстер-клас.\n\n${summary}\n\nДеталі: ${statusUrl}`,
  };
}

export function rescheduleEmail(d: Details, oldStartsAt: Date, statusUrl: string): Email {
  const summary = `${when(d.startsAt)}, ${pluralSeats(d.seats)}`;
  return {
    to: d.email,
    subject: `Зміна часу майстер-класу: тепер ${formatSessionDate(d.startsAt)} о ${formatSessionTime(d.startsAt)}`,
    html: layout(
      "Змінився час.",
      [
        `${escapeHtml(d.name)}, ми змінили час майстер-класу, на який ви записані.`,
        `Було: ${escapeHtml(when(oldStartsAt))}`,
        `<strong>Тепер: ${escapeHtml(summary)}</strong>`,
        "Якщо новий час вам не підходить, напишіть нам: підберемо іншу дату або повернемо кошти.",
      ],
      statusUrl,
    ),
    text: `${d.name}, ми змінили час майстер-класу.\n\nБуло: ${when(oldStartsAt)}\nТепер: ${summary}\n\nЯкщо час не підходить, напишіть нам.\nДеталі: ${statusUrl}`,
  };
}

// Used both when one booking is cancelled and when the whole date is.
export function cancellationEmail(d: Details, statusUrl: string): Email {
  return {
    to: d.email,
    subject: `Запис на майстер-клас ${formatSessionDate(d.startsAt)} скасовано`,
    html: layout(
      "Запис скасовано.",
      [
        `${escapeHtml(d.name)}, ваш запис на майстер-клас ${escapeHtml(when(d.startsAt))} скасовано.`,
        "Щодо повернення коштів з вами зв’яжеться студія. Якщо маєте питання, напишіть нам у Telegram.",
      ],
      statusUrl,
    ),
    text: `${d.name}, ваш запис на майстер-клас ${when(d.startsAt)} скасовано.\n\nЩодо повернення коштів з вами зв’яжеться студія.\nДеталі: ${statusUrl}`,
  };
}

// Telegram HTML message for the owner. `esc` is escapeTelegramHtml, injected so
// this module stays free of Telegram specifics.
export function adminPaymentMessage(
  d: Details,
  extra: { seatsLeft: number; emailSent: boolean },
  esc: (value: string) => string,
): string {
  return [
    "💳 <b>Нова оплата</b>",
    `${esc(when(d.startsAt))}`,
    `${esc(d.name)} · ${esc(d.phone)} · ${esc(d.email)}`,
    `${esc(pluralSeats(d.seats))} · ${esc(formatUah(d.amountKop))}`,
    `Залишилось місць на цю дату: <b>${extra.seatsLeft}</b>`,
    ...(extra.emailSent ? [] : ["⚠️ Лист клієнту не надіслано, перевірте email вручну."]),
  ].join("\n");
}

export function adminAttentionMessage(
  d: Details,
  reason: string,
  esc: (value: string) => string,
): string {
  return [
    "🚨 <b>Потрібна ваша увага</b>",
    esc(reason),
    `${esc(when(d.startsAt))}`,
    `${esc(d.name)} · ${esc(d.phone)} · ${esc(d.email)}`,
    `${esc(pluralSeats(d.seats))} · ${esc(formatUah(d.amountKop))}`,
  ].join("\n");
}
