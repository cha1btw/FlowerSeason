// Drives the real bot with fake Telegram updates. Outgoing API calls are
// captured instead of being sent, so no network or token is needed.
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import type { Bot } from "grammy";
import { createBooking, markPaid } from "../lib/booking/service.ts";
import { createBot } from "../lib/bot/index.ts";
import { createDb, type Db } from "../lib/db/index.ts";
import { runMigrations } from "../lib/db/migrate.ts";
import { sessions } from "../lib/db/schema.ts";
import { formatSessionDate, formatSessionTime } from "../lib/time.ts";

const url = process.env.TEST_DATABASE_URL;
const ADMIN = 111;
const STRANGER = 999;

type Call = { method: string; payload: Record<string, unknown> };

describe("telegram bot", { skip: !url && "TEST_DATABASE_URL is not set" }, () => {
  let db: Db;
  let bot: Bot;
  let calls: Call[];
  let updateId = 1;

  before(async () => {
    await runMigrations(url!);
    db = createDb(url!, 5);
  });
  after(async () => {
    await db.$client.end();
  });

  beforeEach(async () => {
    await db.execute(sql`truncate bookings, sessions, bot_drafts`);
    process.env.ADMIN_TELEGRAM_IDS = String(ADMIN);
    calls = [];

    bot = createBot(db, "123:TEST");
    bot.botInfo = {
      id: 1,
      is_bot: true,
      first_name: "Test",
      username: "test_bot",
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
      can_connect_to_business: false,
      has_main_web_app: false,
    } as typeof bot.botInfo;
    bot.api.config.use(async (_prev, method, payload) => {
      calls.push({ method, payload: payload as Record<string, unknown> });
      return { ok: true, result: true } as never;
    });
  });

  const chat = (id: number) => ({ id, type: "private" as const, first_name: "T" });
  const from = (id: number) => ({ id, is_bot: false, first_name: "T" });

  async function say(text: string, userId = ADMIN) {
    const isCommand = text.startsWith("/");
    await bot.handleUpdate({
      update_id: updateId++,
      message: {
        message_id: updateId,
        date: Math.floor(Date.now() / 1000),
        chat: chat(userId),
        from: from(userId),
        text,
        ...(isCommand
          ? { entities: [{ type: "bot_command" as const, offset: 0, length: text.split(" ")[0].length }] }
          : {}),
      },
    });
  }

  async function tap(data: string, userId = ADMIN) {
    await bot.handleUpdate({
      update_id: updateId++,
      callback_query: {
        id: String(updateId),
        from: from(userId),
        chat_instance: "x",
        data,
        message: {
          message_id: 5,
          date: Math.floor(Date.now() / 1000),
          chat: chat(userId),
          text: "old",
        },
      },
    });
  }

  const texts = () =>
    calls
      .filter((c) => c.method === "sendMessage" || c.method === "editMessageText")
      .map((c) => String(c.payload.text));
  const lastText = () => texts().at(-1) ?? "";
  const buttons = () => {
    const last = [...calls].reverse().find((c) => c.payload.reply_markup);
    const markup = last?.payload.reply_markup as
      | { inline_keyboard?: { text: string; callback_data?: string }[][] }
      | undefined;
    return markup?.inline_keyboard?.flat() ?? [];
  };

  async function createViaWizard() {
    await say("➕ Нова дата");
    await say("20.12");
    await say("18:00");
    await say("8");
    await say("1800");
    await tap("wz:ok");
    const [session] = await db.select().from(sessions);
    return session;
  }

  test("a stranger gets a polite refusal and cannot start the wizard", async () => {
    await say("/start", STRANGER);
    assert.match(lastText(), /призначений для адміністратора/);

    await say("➕ Нова дата", STRANGER);
    assert.equal(
      (await db.execute(sql`select count(*)::int as n from bot_drafts`))[0].n,
      0,
    );
  });

  test("the owner is greeted with the menu", async () => {
    await say("/start");
    const reply = calls.find((c) => c.method === "sendMessage");
    assert.ok(reply);
    assert.ok(JSON.stringify(reply.payload.reply_markup).includes("Нова дата"));
  });

  test("the wizard creates a date from four answers", async () => {
    await say("➕ Нова дата");
    assert.match(lastText(), /Крок 1\/4/);
    await say("20.12");
    assert.match(lastText(), /Крок 2\/4/);
    await say("18:00");
    assert.match(lastText(), /Крок 3\/4/);
    await say("8");
    assert.match(lastText(), /Крок 4\/4/);
    await say("1800");
    assert.match(lastText(), /Створити дату\?/);
    assert.ok(buttons().some((b) => b.callback_data === "wz:ok"));

    await tap("wz:ok");
    assert.match(lastText(), /Дату створено/);

    const [session] = await db.select().from(sessions);
    assert.equal(session.capacity, 8);
    assert.equal(session.priceKop, 180_000);
    assert.equal(formatSessionDate(session.startsAt), "20 грудня");
    assert.equal(formatSessionTime(session.startsAt), "18:00");
    assert.equal(session.status, "open");
  });

  test("bad input keeps the wizard on the same step", async () => {
    await say("➕ Нова дата");
    await say("вчора");
    assert.match(lastText(), /Не розумію дату/);
    await say("20.12");
    assert.match(lastText(), /Крок 2\/4/);
    await say("25:99");
    assert.match(lastText(), /Не розумію час/);
  });

  test("cancelling the wizard creates nothing", async () => {
    await say("➕ Нова дата");
    await say("20.12");
    await tap("wz:cancel");
    await say("18:00");
    assert.equal((await db.select().from(sessions)).length, 0);
    assert.match(lastText(), /меню/i);
  });

  test("confirming twice does not create a second date", async () => {
    await createViaWizard();
    await tap("wz:ok");
    assert.equal((await db.select().from(sessions)).length, 1);
  });

  test("the schedule lists dates and the card shows participants", async () => {
    const session = await createViaWizard();
    const guest = await createBooking(db, {
      sessionId: session.id,
      name: "Олена",
      phone: "+380501234567",
      email: "olena@example.com",
      seats: 2,
    });
    assert.ok(guest.ok);
    await markPaid(db, guest.booking.id);

    await say("📅 Розклад");
    const open = buttons().find((b) => b.callback_data === `sc:${session.id}`);
    assert.ok(open, "schedule has a button for the date");
    assert.match(open.text, /✅2 🕓0 \/ 8/);

    await tap(`sc:${session.id}`);
    assert.match(lastText(), /Олена/);
    assert.match(lastText(), /\+380501234567/);
    assert.match(lastText(), /Оплачено: <b>2<\/b>/);
  });

  test("sales can be closed and reopened from the card", async () => {
    const session = await createViaWizard();

    await tap(`st:${session.id}`);
    assert.equal((await db.select().from(sessions))[0].status, "closed");
    assert.match(lastText(), /Продаж закрито/);

    await tap(`st:${session.id}`);
    assert.equal((await db.select().from(sessions))[0].status, "open");
  });

  test("seats can be raised, but not below what is sold", async () => {
    const session = await createViaWizard();
    const guest = await createBooking(db, {
      sessionId: session.id,
      name: "Олена",
      phone: "+380501234567",
      email: "olena@example.com",
      seats: 3,
    });
    assert.ok(guest.ok);
    await markPaid(db, guest.booking.id);

    await tap(`cap:${session.id}`);
    await say("2");
    assert.match(lastText(), /Не можна менше/);
    assert.equal((await db.select().from(sessions))[0].capacity, 8);

    await say("12");
    assert.equal((await db.select().from(sessions))[0].capacity, 12);
  });

  test("cancelling a date lists who must be refunded", async () => {
    const session = await createViaWizard();
    const guest = await createBooking(db, {
      sessionId: session.id,
      name: "Олена",
      phone: "+380501234567",
      email: "olena@example.com",
      seats: 1,
    });
    assert.ok(guest.ok);
    await markPaid(db, guest.booking.id);

    await tap(`cx:${session.id}`);
    assert.match(lastText(), /не повертаються/);
    assert.equal((await db.select().from(sessions))[0].status, "open", "asking is not cancelling");

    await tap(`cxy:${session.id}`);
    assert.equal((await db.select().from(sessions))[0].status, "cancelled");
    assert.match(lastText(), /Потрібно повернути кошти \(1\)/);
    assert.match(lastText(), /olena@example.com/);
  });

  test("analytics reports revenue", async () => {
    const session = await createViaWizard();
    const guest = await createBooking(db, {
      sessionId: session.id,
      name: "Олена",
      phone: "+380501234567",
      email: "olena@example.com",
      seats: 2,
    });
    assert.ok(guest.ok);
    await markPaid(db, guest.booking.id);

    await say("📊 Аналітика");
    assert.match(lastText(), /Отримано оплат: <b>3 600 ₴<\/b>/);
    assert.match(lastText(), /2\/8/);
  });

  async function paidGuest(sessionId: string, n = 1, seats = 1) {
    const guest = await createBooking(db, {
      sessionId,
      name: `Гість ${n}`,
      phone: "+380501234567",
      email: `guest${n}@example.com`,
      seats,
    });
    assert.ok(guest.ok);
    await markPaid(db, guest.booking.id);
    return guest.booking;
  }

  // Emails are only logged in tests (Resend is not configured).
  async function captureEmails(run: () => Promise<void>) {
    const lines: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => void lines.push(args.join(" "));
    try {
      await run();
    } finally {
      console.log = original;
    }
    return lines.filter((l) => l.includes("[email not configured]"));
  }

  test("a stranger is told their Telegram id so the owner can add them", async () => {
    await say("/start", STRANGER);
    assert.match(lastText(), new RegExp(`<code>${STRANGER}</code>`));
  });

  test("the price can be changed from the card", async () => {
    const session = await createViaWizard();
    await tap(`ep:${session.id}`);
    await say("2500");
    assert.equal((await db.select().from(sessions))[0].priceKop, 250_000);
    assert.match(texts().join("\n"), /Нова ціна/);
  });

  test("a bad price keeps the step open", async () => {
    const session = await createViaWizard();
    await tap(`ep:${session.id}`);
    await say("безкоштовно");
    assert.match(lastText(), /Вкажіть ціну/);
    assert.equal((await db.select().from(sessions))[0].priceKop, 180_000);
  });

  test("the duration can be changed from the card", async () => {
    const session = await createViaWizard();
    await tap(`ed:${session.id}`);
    await say("5");
    assert.match(lastText(), /Вкажіть тривалість/);
    await say("150");
    assert.equal((await db.select().from(sessions))[0].durationMin, 150);
  });

  test("changing the time moves the date and emails every guest", async () => {
    const session = await createViaWizard();
    await paidGuest(session.id, 1);
    await paidGuest(session.id, 2);

    const emails = await captureEmails(async () => {
      await tap(`et:${session.id}`);
      await say("21.12 19:30");
    });

    const [updated] = await db.select().from(sessions);
    assert.equal(formatSessionDate(updated.startsAt), "21 грудня");
    assert.equal(formatSessionTime(updated.startsAt), "19:30");
    assert.equal(emails.length, 2);
    assert.ok(emails.every((line) => line.includes("Зміна часу")));
  });

  test("a time in the past or a malformed time is refused", async () => {
    const session = await createViaWizard();
    await tap(`et:${session.id}`);
    await say("завтра");
    assert.match(lastText(), /Не розумію/);
    await say("01.01.2020 10:00");
    assert.match(lastText(), /минув/);
    assert.equal(formatSessionDate((await db.select().from(sessions))[0].startsAt), "20 грудня");
  });

  test("participants are listed and a booking can be cancelled with a refund reminder", async () => {
    const session = await createViaWizard();
    const guest = await paidGuest(session.id, 1, 2);

    await tap(`pl:${session.id}`);
    const entry = buttons().find((b) => b.callback_data === `pp:${guest.id}`);
    assert.ok(entry);
    assert.match(entry.text, /Гість 1/);

    await tap(`pp:${guest.id}`);
    assert.match(lastText(), /guest1@example\.com/);

    await tap(`bc:${guest.id}`);
    assert.match(lastText(), /Місця звільняться/);
    assert.equal(
      (await db.execute(sql`select status from bookings`))[0].status,
      "paid",
      "asking is not cancelling",
    );

    const emails = await captureEmails(() => tap(`bcy:${guest.id}`));
    assert.equal((await db.execute(sql`select status from bookings`))[0].status, "cancelled");
    assert.match(lastText(), /Поверніть клієнту/);
    assert.equal(emails.length, 1);
    assert.match(emails[0], /guest1@example\.com/);
  });

  test("cancelling a date emails every paid guest", async () => {
    const session = await createViaWizard();
    await paidGuest(session.id, 1);
    await paidGuest(session.id, 2);

    const emails = await captureEmails(async () => {
      await tap(`cxy:${session.id}`);
    });

    assert.equal(emails.length, 2);
    assert.ok(emails.every((line) => line.includes("скасовано")));
    assert.match(lastText(), /Листи учасникам/);
  });

  async function requestedGuest(sessionId: string, n = 1, seats = 1) {
    const result = await createBooking(db, {
      sessionId,
      name: `Заявник ${n}`,
      phone: "+380671112233",
      email: `req${n}@example.com`,
      seats,
    });
    assert.ok(result.ok);
    return result.booking;
  }

  test("the Requests button lists waiting requests across dates", async () => {
    const session = await createViaWizard();
    const waiting = await requestedGuest(session.id, 1, 2);
    await paidGuest(session.id, 2);

    await say("🕓 Заявки");
    assert.match(lastText(), /Заявки, що чекають оплати \(1\)/);
    const entry = buttons().find((b) => b.callback_data === `pp:${waiting.id}`);
    assert.ok(entry, "the waiting request has a button");
    assert.match(entry.text, /Заявник 1/);
    assert.equal(buttons().length, 1, "paid guests are not listed");
  });

  test("with no requests the owner is told so", async () => {
    await createViaWizard();
    await say("🕓 Заявки");
    assert.match(lastText(), /немає/);
  });

  test("a request card offers Paid and Cancel", async () => {
    const session = await createViaWizard();
    const waiting = await requestedGuest(session.id);

    await tap(`pp:${waiting.id}`);
    assert.match(lastText(), /очікує оплати/);
    const labels = buttons().map((b) => b.callback_data);
    assert.ok(labels.includes(`bp:${waiting.id}`));
    assert.ok(labels.includes(`bc:${waiting.id}`));
  });

  test("pressing Paid confirms the booking and emails the guest once", async () => {
    const session = await createViaWizard();
    const waiting = await requestedGuest(session.id);

    const emails = await captureEmails(async () => {
      await tap(`bp:${waiting.id}`);
      await tap(`bp:${waiting.id}`); // a second tap must do nothing
    });

    assert.equal((await db.execute(sql`select status from bookings`))[0].status, "paid");
    assert.equal(emails.length, 1);
    assert.match(emails[0], /req1@example\.com/);
    assert.match(lastText(), /вже оброблено/);
  });

  test("cancelling a request that was never paid does not ask for a refund", async () => {
    const session = await createViaWizard();
    const waiting = await requestedGuest(session.id);

    await tap(`bc:${waiting.id}`);
    assert.doesNotMatch(lastText(), /повернути вручну/);

    await captureEmails(() => tap(`bcy:${waiting.id}`));
    assert.equal((await db.execute(sql`select status from bookings`))[0].status, "cancelled");
    assert.doesNotMatch(lastText(), /Поверніть/);
  });

  test("cancelling a date asks for refunds only for guests who paid", async () => {
    const session = await createViaWizard();
    await paidGuest(session.id, 1);
    await requestedGuest(session.id, 2);

    const emails = await captureEmails(() => tap(`cxy:${session.id}`));
    assert.match(lastText(), /Потрібно повернути кошти \(1\)/);
    assert.match(lastText(), /Заявок без оплати скасовано: 1/);
    assert.equal(emails.length, 2, "everyone who signed up is told");
  });

  test("the Letters button lists the five automatic emails", async () => {
    await say("✉️ Листи");
    assert.match(lastText(), /Листи клієнтам/);
    const labels = buttons().map((b) => b.callback_data);
    for (const key of ["request", "paid", "reminder", "reschedule", "cancelled"]) {
      assert.ok(labels.includes(`em:${key}`), key);
    }
  });

  test("a letter card shows the subject and an example text", async () => {
    await tap("em:paid");
    assert.match(lastText(), /Оплату підтверджено/);
    assert.match(lastText(), /Тема:<\/b> Ви записані на майстер-клас 20 грудня о 18:00/);
    assert.match(lastText(), /Олена, дякуємо! Оплату отримано/);
    assert.match(lastText(), /стандартний текст/);
    assert.ok(buttons().some((b) => b.callback_data === "ems:paid"));
    assert.ok(buttons().some((b) => b.callback_data === "emb:paid"));
    assert.ok(!buttons().some((b) => b.callback_data === "emr:paid"), "no reset while default");
  });

  test("the owner can rewrite a letter and the next email uses the new text", async () => {
    await tap("emb:paid");
    assert.match(texts().join("\n"), /\{name\}/);
    await say("Привіт, {name}!\n\nЧекаємо на вас {when}.");
    assert.match(lastText(), /змінено вами/);
    assert.match(lastText(), /Привіт, Олена!/);

    await tap("ems:paid");
    await say("Ви з нами, {name}");

    const session = await createViaWizard();
    const waiting = await requestedGuest(session.id);
    const emails = await captureEmails(() => tap(`bp:${waiting.id}`));
    assert.equal(emails.length, 1);
    assert.match(emails[0], /subject="Ви з нами, Заявник 1"/);
  });

  test("a typo in a placeholder is refused and nothing is saved", async () => {
    await tap("emb:request");
    await say("Привіт, {nmae}");
    assert.match(lastText(), /Невідомі підстановки: \{nmae\}/);
    await tap("em:request");
    assert.match(lastText(), /стандартний текст/);
  });

  test("a customised letter can be reset to the standard text", async () => {
    await tap("ems:cancelled");
    await say("Інша тема");
    assert.ok(buttons().some((b) => b.callback_data === "emr:cancelled"));

    await tap("emr:cancelled");
    assert.match(lastText(), /стандартний текст/);
    assert.match(lastText(), /Запис на майстер-клас 20 грудня скасовано/);
  });

  test("the reschedule letter explains {oldWhen} but other letters refuse it", async () => {
    await tap("emb:reschedule");
    assert.match(texts().join("\n"), /oldWhen/);
    await say("Було {oldWhen}, стало {when}");
    assert.match(lastText(), /змінено вами/);

    await tap("emb:paid");
    await say("Було {oldWhen}");
    assert.match(lastText(), /Невідомі підстановки/);
  });
});
