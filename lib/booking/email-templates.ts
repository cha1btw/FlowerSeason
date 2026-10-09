import { eq } from "drizzle-orm";
import type { Db } from "../db/index.ts";
import type { Email } from "../email.ts";
import { emailTemplates } from "../db/schema.ts";
import { formatUah, pluralSeats } from "../format.ts";
import { formatSessionDate, formatSessionTime, kyivLocalToUtc, kyivDateParts } from "../time.ts";
import { escapeHtml, layout, when, type Details } from "./messages.ts";

// The emails the system sends to customers by itself. The owner can read and
// change the subject and the text of each from the Telegram bot; the heading,
// the design and the "booking details" link stay fixed.
export const TEMPLATE_KEYS = ["request", "paid", "reminder", "reschedule", "cancelled"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export type Template = { subject: string; body: string };

export const TEMPLATE_INFO: Record<
  TemplateKey,
  { label: string; when: string; heading: string; extraPlaceholder?: string }
> = {
  request: {
    label: "Заявку отримано",
    when: "одразу після заявки клієнта",
    heading: "Заявку отримано.",
  },
  paid: {
    label: "Оплату підтверджено",
    when: "коли ви натискаєте «Оплачено»",
    heading: "Ви записані.",
  },
  reminder: {
    label: "Нагадування",
    when: "за добу-півтори до майстер-класу",
    heading: "Чекаємо на вас.",
  },
  reschedule: {
    label: "Зміна часу",
    when: "коли ви змінюєте дату або час",
    heading: "Змінився час.",
    extraPlaceholder: "oldWhen",
  },
  cancelled: {
    label: "Скасування",
    when: "коли ви скасовуєте запис або дату",
    heading: "Запис скасовано.",
  },
};

// What each placeholder turns into. {summary} is date, time and seats in one line.
export const PLACEHOLDERS: Record<string, string> = {
  name: "ім’я клієнта",
  date: "дата, напр. 20 грудня",
  time: "час, напр. 18:00",
  when: "дата, день тижня й час",
  seats: "кількість місць, напр. 2 місця",
  amount: "сума до сплати",
  summary: "дата, день тижня, час і місця одним рядком",
  oldWhen: "попередній час (тільки в листі про зміну часу)",
};

export const DEFAULT_TEMPLATES: Record<TemplateKey, Template> = {
  request: {
    subject: "Заявку на майстер-клас {date} отримано",
    body: [
      "{name}, дякуємо! Місце закріплено за вами.",
      "{summary}",
      "До сплати: {amount}",
      "Найближчим часом ми зв’яжемося з вами й надішлемо посилання на оплату. Після оплати запис буде підтверджено.",
    ].join("\n\n"),
  },
  paid: {
    subject: "Ви записані на майстер-клас {date} о {time}",
    body: [
      "{name}, дякуємо! Оплату отримано.",
      "{summary}",
      "Напередодні ми надішлемо нагадання.",
    ].join("\n\n"),
  },
  reminder: {
    subject: "Нагадування: майстер-клас {date} о {time}",
    body: ["{name}, нагадуємо про ваш майстер-клас.", "{summary}"].join("\n\n"),
  },
  reschedule: {
    subject: "Зміна часу майстер-класу: тепер {date} о {time}",
    body: [
      "{name}, ми змінили час майстер-класу, на який ви записані.",
      "Було: {oldWhen}",
      "{summary}",
      "Якщо новий час вам не підходить, напишіть нам: підберемо іншу дату або повернемо кошти.",
    ].join("\n\n"),
  },
  cancelled: {
    subject: "Запис на майстер-клас {date} скасовано",
    body: [
      "{name}, ваш запис на майстер-клас {when} скасовано.",
      "Якщо ви вже сплатили, студія зв’яжеться з вами щодо повернення коштів. Якщо маєте питання, напишіть нам у Telegram.",
    ].join("\n\n"),
  },
};

export const MAX_SUBJECT = 150;
export const MAX_BODY = 1800;

export type Vars = Record<string, string>;

export function varsFor(d: Details, oldStartsAt?: Date): Vars {
  const seats = pluralSeats(d.seats);
  return {
    name: d.name,
    date: formatSessionDate(d.startsAt),
    time: formatSessionTime(d.startsAt),
    when: when(d.startsAt),
    seats,
    amount: formatUah(d.amountKop),
    summary: `${when(d.startsAt)}, ${seats}`,
    oldWhen: oldStartsAt ? when(oldStartsAt) : "",
  };
}

const PLACEHOLDER = /\{(\w+)\}/g;

// Placeholders in `text` that do not exist (typos like {nmae}); the editor
// refuses such text so a customer never sees a raw "{nmae}".
export function unknownPlaceholders(text: string, key: TemplateKey): string[] {
  const allowed = Object.keys(PLACEHOLDERS).filter(
    (name) => name !== "oldWhen" || TEMPLATE_INFO[key].extraPlaceholder === "oldWhen",
  );
  return [...text.matchAll(PLACEHOLDER)]
    .map((m) => m[1])
    .filter((name) => !allowed.includes(name));
}

export function allowedPlaceholders(key: TemplateKey): string[] {
  return Object.keys(PLACEHOLDERS).filter(
    (name) => name !== "oldWhen" || TEMPLATE_INFO[key].extraPlaceholder === "oldWhen",
  );
}

const fill = (text: string, vars: Vars) =>
  text.replace(PLACEHOLDER, (match, name: string) => (name in vars ? vars[name] : match));

export type Checked = { ok: true; value: string } | { ok: false; error: string };

function checkText(
  key: TemplateKey,
  value: string,
  max: number,
  what: string,
): Checked {
  if (!value) return { ok: false, error: `${what} не може бути порожнім.` };
  if (value.length > max) {
    return { ok: false, error: `${what} задовгий: ${value.length} символів, максимум ${max}.` };
  }
  const unknown = [...new Set(unknownPlaceholders(value, key))];
  if (unknown.length > 0) {
    return {
      ok: false,
      error: `Невідомі підстановки: ${unknown.map((n) => `{${n}}`).join(", ")}. Доступні: ${allowedPlaceholders(key).map((n) => `{${n}}`).join(", ")}.`,
    };
  }
  return { ok: true, value };
}

export const checkSubject = (key: TemplateKey, input: string): Checked =>
  checkText(key, input.replace(/\s+/g, " ").trim(), MAX_SUBJECT, "Тема");

export const checkBody = (key: TemplateKey, input: string): Checked =>
  checkText(key, input.replace(/\r/g, "").trim(), MAX_BODY, "Текст");

// A paragraph that is just {summary} is shown in bold, like the key fact of the email.
export function composeEmail(
  key: TemplateKey,
  template: Template,
  d: Details,
  statusUrl: string,
  oldStartsAt?: Date,
): Email {
  const vars = varsFor(d, oldStartsAt);
  const paragraphs = template.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const html = paragraphs.map((paragraph) => {
    const text = escapeHtml(fill(paragraph, vars)).replaceAll("\n", "<br>");
    return paragraph === "{summary}" ? `<strong>${text}</strong>` : text;
  });

  return {
    to: d.email,
    subject: fill(template.subject, vars).replace(/\s+/g, " ").trim(),
    html: layout(TEMPLATE_INFO[key].heading, html, statusUrl),
    text: `${paragraphs.map((p) => fill(p, vars)).join("\n\n")}\n\nДеталі: ${statusUrl}`,
  };
}

// --- storage --------------------------------------------------------------

export async function getTemplate(db: Db, key: TemplateKey): Promise<Template> {
  const [row] = await db.select().from(emailTemplates).where(eq(emailTemplates.key, key));
  return row ? { subject: row.subject, body: row.body } : DEFAULT_TEMPLATES[key];
}

export async function isCustomized(db: Db): Promise<Set<string>> {
  const rows = await db.select({ key: emailTemplates.key }).from(emailTemplates);
  return new Set(rows.map((r) => r.key));
}

export async function saveTemplate(
  db: Db,
  key: TemplateKey,
  patch: Partial<Template>,
): Promise<Template> {
  const next = { ...(await getTemplate(db, key)), ...patch };
  await db
    .insert(emailTemplates)
    .values({ key, ...next })
    .onConflictDoUpdate({
      target: emailTemplates.key,
      set: { subject: next.subject, body: next.body, updatedAt: new Date() },
    });
  return next;
}

export async function resetTemplate(db: Db, key: TemplateKey): Promise<void> {
  await db.delete(emailTemplates).where(eq(emailTemplates.key, key));
}

// Loads the owner's text (or the default) and builds the email for one guest.
export async function emailFor(
  db: Db,
  key: TemplateKey,
  d: Details,
  statusUrl: string,
  oldStartsAt?: Date,
): Promise<Email> {
  return composeEmail(key, await getTemplate(db, key), d, statusUrl, oldStartsAt);
}

// A made-up guest for previews in the bot: always the next 20 December, 18:00.
export function sampleDetails(now: Date = new Date()): { details: Details; old: Date } {
  const today = kyivDateParts(now);
  const year = today.month === 12 && today.day > 20 ? today.year + 1 : today.year;
  const startsAt = kyivLocalToUtc(year, 12, 20, 18, 0) ?? now;
  const old = kyivLocalToUtc(year, 12, 20, 17, 0) ?? now;
  return {
    details: {
      name: "Олена",
      email: "olena@example.com",
      phone: "+380501234567",
      seats: 2,
      amountKop: 360_000,
      startsAt,
    },
    old,
  };
}
