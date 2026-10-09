import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import {
  DEFAULT_TEMPLATES,
  TEMPLATE_KEYS,
  checkBody,
  checkSubject,
  composeEmail,
  emailFor,
  getTemplate,
  isCustomized,
  resetTemplate,
  saveTemplate,
  unknownPlaceholders,
} from "../lib/booking/email-templates.ts";
import { createDb, type Db } from "../lib/db/index.ts";
import { runMigrations } from "../lib/db/migrate.ts";
import { kyivLocalToUtc } from "../lib/time.ts";

const details = {
  name: 'Олена <script>alert("x")</script>',
  email: "olena@example.com",
  phone: "+380501234567",
  seats: 2,
  amountKop: 400_000,
  startsAt: kyivLocalToUtc(2026, 12, 20, 18, 0)!,
};
const old = kyivLocalToUtc(2026, 12, 20, 17, 0)!;
const URL = "https://site.test/workshops/booking/abc";

test("every default template only uses placeholders that exist", () => {
  for (const key of TEMPLATE_KEYS) {
    const t = DEFAULT_TEMPLATES[key];
    assert.deepEqual(unknownPlaceholders(t.subject, key), [], `${key} subject`);
    assert.deepEqual(unknownPlaceholders(t.body, key), [], `${key} body`);
  }
});

test("the request email states date, seats and the amount to pay, and escapes the name", () => {
  const email = composeEmail("request", DEFAULT_TEMPLATES.request, details, URL);
  assert.equal(email.to, "olena@example.com");
  assert.match(email.subject, /Заявку на майстер-клас 20 грудня отримано/);
  assert.match(email.html, /20 грудня \(неділя\) о 18:00, 2 місця/);
  assert.match(email.html, /До сплати: 4 000 ₴/);
  assert.match(email.html, /посилання на оплату/);
  assert.match(email.html, new RegExp(URL));
  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.text, /Деталі: https:\/\/site\.test/);
});

test("the paid email and the reminder carry the time in the subject", () => {
  assert.match(composeEmail("paid", DEFAULT_TEMPLATES.paid, details, URL).subject, /20 грудня о 18:00/);
  assert.match(composeEmail("reminder", DEFAULT_TEMPLATES.reminder, details, URL).subject, /20 грудня о 18:00/);
});

test("the reschedule email shows the old and the new time", () => {
  const email = composeEmail("reschedule", DEFAULT_TEMPLATES.reschedule, details, URL, old);
  assert.match(email.html, /Було: 20 грудня \(неділя\) о 17:00/);
  assert.match(email.html, /<strong>20 грудня \(неділя\) о 18:00, 2 місця<\/strong>/);
});

test("a paragraph that is just {summary} is bold, others are not", () => {
  const email = composeEmail("paid", DEFAULT_TEMPLATES.paid, details, URL);
  assert.match(email.html, /<strong>20 грудня/);
  assert.equal((email.html.match(/<strong>/g) ?? []).length, 1);
});

test("custom text replaces the default and keeps line breaks inside a paragraph", () => {
  const email = composeEmail(
    "paid",
    { subject: "Вітаємо, {name}!", body: "Привіт, {name}\nчекаємо {date}\n\nДо зустрічі" },
    { ...details, name: "Оля" },
    URL,
  );
  assert.equal(email.subject, "Вітаємо, Оля!");
  assert.match(email.html, /Привіт, Оля<br>чекаємо 20 грудня/);
  assert.match(email.html, /До зустрічі/);
});

test("typos in placeholders are caught before saving", () => {
  assert.deepEqual(unknownPlaceholders("{name} {nmae} {oldWhen}", "request"), ["nmae", "oldWhen"]);
  assert.deepEqual(unknownPlaceholders("{oldWhen}", "reschedule"), []);
  assert.equal(checkBody("paid", "Привіт, {nmae}").ok, false);
  assert.equal(checkSubject("paid", "Тема {date}").ok, true);
});

test("empty and oversized text is refused", () => {
  assert.equal(checkSubject("paid", "   ").ok, false);
  assert.equal(checkSubject("paid", "x".repeat(151)).ok, false);
  assert.equal(checkBody("paid", "x".repeat(1801)).ok, false);
  const folded = checkSubject("paid", "рядок\nз переносом");
  assert.ok(folded.ok);
  assert.equal(folded.value, "рядок з переносом");
});

const url = process.env.TEST_DATABASE_URL;

describe("stored email templates", { skip: !url && "TEST_DATABASE_URL is not set" }, () => {
  let db: Db;
  before(async () => {
    await runMigrations(url!);
    db = createDb(url!, 3);
  });
  after(async () => {
    await db.$client.end();
  });
  beforeEach(async () => {
    await db.execute(sql`truncate email_templates`);
  });

  test("without an edit the default is used", async () => {
    assert.deepEqual(await getTemplate(db, "paid"), DEFAULT_TEMPLATES.paid);
    assert.equal((await isCustomized(db)).size, 0);
  });

  test("editing the subject keeps the default body, and vice versa", async () => {
    await saveTemplate(db, "paid", { subject: "Нова тема" });
    let t = await getTemplate(db, "paid");
    assert.equal(t.subject, "Нова тема");
    assert.equal(t.body, DEFAULT_TEMPLATES.paid.body);

    await saveTemplate(db, "paid", { body: "Новий текст" });
    t = await getTemplate(db, "paid");
    assert.equal(t.subject, "Нова тема");
    assert.equal(t.body, "Новий текст");
    assert.deepEqual([...(await isCustomized(db))], ["paid"]);
  });

  test("an edit changes only its own email, and reset brings the default back", async () => {
    await saveTemplate(db, "reminder", { subject: "Чекаємо, {name}" });
    assert.deepEqual(await getTemplate(db, "paid"), DEFAULT_TEMPLATES.paid);

    const email = await emailFor(db, "reminder", { ...details, name: "Оля" }, URL);
    assert.equal(email.subject, "Чекаємо, Оля");

    await resetTemplate(db, "reminder");
    assert.deepEqual(await getTemplate(db, "reminder"), DEFAULT_TEMPLATES.reminder);
  });
});
