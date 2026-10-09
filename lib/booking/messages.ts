import { formatUah, pluralSeats } from "../format.ts";
import { formatSessionDate, formatSessionTime, formatSessionWeekday } from "../time.ts";

export type Details = {
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

export const when = (startsAt: Date) =>
  `${formatSessionDate(startsAt)} (${formatSessionWeekday(startsAt)}) о ${formatSessionTime(startsAt)}`;

export function layout(title: string, lines: string[], statusUrl: string): string {
  const body = lines.map((line) => `<p style="margin:0 0 14px">${line}</p>`).join("");
  return `<!doctype html><html lang="uk"><body style="margin:0;background:#f9f9f7;color:#1a1a1a;font-family:Helvetica,Arial,sans-serif;line-height:1.6">
<div style="max-width:520px;margin:0 auto;padding:40px 24px">
<p style="margin:0 0 32px;font-size:11px;letter-spacing:.16em">CHRISTMAS BY FLOWER SEASON</p>
<h1 style="margin:0 0 24px;font-size:28px;font-weight:300">${title}</h1>
${body}
<p style="margin:28px 0 0"><a href="${escapeHtml(statusUrl)}" style="color:#1a1a1a">Деталі запису</a></p>
</div></body></html>`;
}

// Telegram HTML message for the owner about a new request.
// `esc` is escapeTelegramHtml, injected so this module stays free of Telegram specifics.
export function adminRequestMessage(
  d: Details,
  extra: { seatsLeft: number; emailSent: boolean },
  esc: (value: string) => string,
): string {
  return [
    "📝 <b>Нова заявка</b>",
    `${esc(when(d.startsAt))}`,
    `${esc(d.name)} · ${esc(d.phone)} · ${esc(d.email)}`,
    `${esc(pluralSeats(d.seats))} · до сплати ${esc(formatUah(d.amountKop))}`,
    `Вільно місць на цю дату: <b>${extra.seatsLeft}</b>`,
    "Надішліть клієнту посилання на оплату, а потім натисніть «Оплачено».",
    ...(extra.emailSent ? [] : ["⚠️ Лист клієнту не надіслано (перевірте email у заявці)."]),
  ].join("\n");
}
