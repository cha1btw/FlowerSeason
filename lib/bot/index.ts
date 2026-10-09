import { Bot, InlineKeyboard, Keyboard, type Context } from "grammy";
import { adminChatIds } from "../admin.ts";
import {
  cancelBooking,
  clearDraft,
  createSession,
  getAdminSession,
  getAnalytics,
  getBooking,
  getDraft,
  getParticipants,
  listAdminSessions,
  listRequests,
  saveDraft,
  setSessionStatus,
  updateCapacity,
  updateSession,
} from "../booking/admin-service.ts";
import { notifyCancelled, notifyRescheduled } from "../booking/notify-guests.ts";
import {
  PLACEHOLDERS,
  TEMPLATE_INFO,
  TEMPLATE_KEYS,
  allowedPlaceholders,
  checkBody,
  checkSubject,
  composeEmail,
  getTemplate,
  isCustomized,
  resetTemplate,
  sampleDetails,
  saveTemplate,
  type TemplateKey,
} from "../booking/email-templates.ts";
import { confirmPaid } from "../booking/request-events.ts";
import type { Db } from "../db/index.ts";
import { formatUah, pluralSeats } from "../format.ts";
import { siteUrl } from "../site.ts";
import { escapeTelegramHtml as esc } from "../telegram.ts";
import { formatSessionDate, kyivDateParts } from "../time.ts";
import {
  analyticsText,
  clip,
  participantLine,
  requestsText,
  scheduleLine,
  scheduleText,
  sessionCardText,
  when,
} from "./views.ts";
import {
  combineStart,
  parseCapacity,
  parseDate,
  parseDateTime,
  parseDuration,
  parsePriceKop,
  parseTime,
} from "./wizard.ts";

const BTN_NEW = "➕ Нова дата";
const BTN_SCHEDULE = "📅 Розклад";
const BTN_REQUESTS = "🕓 Заявки";
const BTN_ANALYTICS = "📊 Аналітика";
const BTN_EMAILS = "✉️ Листи";

const menu = new Keyboard()
  .text(BTN_NEW)
  .text(BTN_SCHEDULE)
  .row()
  .text(BTN_REQUESTS)
  .text(BTN_ANALYTICS)
  .row()
  .text(BTN_EMAILS)
  .resized()
  .persistent();

const cancelKeyboard = new InlineKeyboard().text("✖ Скасувати", "wz:cancel");
const HTML = { parse_mode: "HTML" as const };

const NOT_ADMIN =
  "Цей бот призначений для адміністратора записів. Щоб записатися на майстер-клас, відкрийте сайт.";

export function createBot(db: Db, token: string): Bot {
  const bot = new Bot(token);

  // Only the owner may use the bot: everything below runs behind this check.
  bot.use(async (ctx, next) => {
    const allowed = adminChatIds();
    const ids = [ctx.from?.id, ctx.chat?.id].filter((id) => id !== undefined).map(String);
    if (ids.some((id) => allowed.includes(id))) return next();
    // Telling a stranger their own Telegram id is harmless and is how the owner
    // finds the id to put into ADMIN_TELEGRAM_IDS.
    if (ctx.chat?.type === "private" && ctx.from) {
      await ctx.reply(`${NOT_ADMIN}\n\nВаш Telegram ID: <code>${ctx.from.id}</code>`, HTML);
    }
  });

  const chatIdOf = (ctx: Context) => ctx.chat!.id;

  async function showSchedule(ctx: Context, edit = false) {
    const sessions = await listAdminSessions(db);
    const keyboard = new InlineKeyboard();
    for (const s of sessions) keyboard.text(scheduleLine(s), `sc:${s.id}`).row();
    const text = scheduleText(sessions);
    if (edit) await ctx.editMessageText(text, { ...HTML, reply_markup: keyboard });
    else await ctx.reply(text, { ...HTML, reply_markup: keyboard });
  }

  async function showCard(ctx: Context, sessionId: string, edit = true) {
    const session = await getAdminSession(db, sessionId);
    if (!session) {
      await ctx.reply("Дату не знайдено.", { reply_markup: menu });
      return;
    }
    const participants = await getParticipants(db, sessionId);
    const keyboard = new InlineKeyboard();
    if (session.status !== "cancelled") {
      keyboard
        .text(session.status === "open" ? "🔒 Закрити продаж" : "🔓 Відкрити продаж", `st:${sessionId}`)
        .text("✏️ Місця", `cap:${sessionId}`)
        .row()
        .text("🕒 Дата й час", `et:${sessionId}`)
        .text("💰 Ціна", `ep:${sessionId}`)
        .row()
        .text("⏱ Тривалість", `ed:${sessionId}`)
        .text("👥 Учасники", `pl:${sessionId}`)
        .row()
        .text("❌ Скасувати дату", `cx:${sessionId}`)
        .row();
    }
    keyboard.text("⬅️ До розкладу", "sl");

    const text = sessionCardText(session, participants);
    if (edit) await ctx.editMessageText(text, { ...HTML, reply_markup: keyboard });
    else await ctx.reply(text, { ...HTML, reply_markup: keyboard });
  }

  const KEY_PATTERN = TEMPLATE_KEYS.join("|");

  async function showEmailList(ctx: Context, edit = false) {
    const custom = await isCustomized(db);
    const keyboard = new InlineKeyboard();
    for (const key of TEMPLATE_KEYS) {
      keyboard.text(`${custom.has(key) ? "✏️ " : ""}${TEMPLATE_INFO[key].label}`, `em:${key}`).row();
    }
    const text =
      "✉️ <b>Листи клієнтам</b>\nЦі листи система надсилає сама. Оберіть, щоб переглянути або змінити текст. ✏️ означає, що ви вже змінювали лист.";
    if (edit) await ctx.editMessageText(text, { ...HTML, reply_markup: keyboard });
    else await ctx.reply(text, { ...HTML, reply_markup: keyboard });
  }

  async function showEmailCard(ctx: Context, key: TemplateKey, edit = true) {
    const [template, custom] = await Promise.all([getTemplate(db, key), isCustomized(db)]);
    const { details, old } = sampleDetails();
    const email = composeEmail(key, template, details, "", old);
    const preview = email.text.replace(/\n\nДеталі: [\s\S]*$/, "");
    const info = TEMPLATE_INFO[key];

    const text = clip(
      [
        `✉️ <b>${esc(info.label)}</b>`,
        `Надсилається: ${esc(info.when)}${custom.has(key) ? " · ✏️ змінено вами" : " · стандартний текст"}`,
        "",
        `<b>Тема:</b> ${esc(email.subject)}`,
        `<b>Заголовок:</b> ${esc(info.heading)} <i>(не змінюється)</i>`,
        "",
        `<b>Текст:</b>`,
        esc(preview),
        "",
        "<i>Це приклад: ім’я, дата й місця підставляються для кожного клієнта. Нижче в листі завжди є посилання «Деталі запису».</i>",
      ].join("\n"),
    );

    const keyboard = new InlineKeyboard()
      .text("✏️ Тема", `ems:${key}`)
      .text("✏️ Текст", `emb:${key}`)
      .row();
    if (custom.has(key)) keyboard.text("↩️ Повернути стандартний", `emr:${key}`).row();
    keyboard.text("⬅️ До листів", "eml");

    if (edit) await ctx.editMessageText(text, { ...HTML, reply_markup: keyboard });
    else await ctx.reply(text, { ...HTML, reply_markup: keyboard });
  }

  const placeholderHelp = (key: TemplateKey) =>
    allowedPlaceholders(key)
      .map((name) => `<code>{${name}}</code> — ${esc(PLACEHOLDERS[name])}`)
      .join("\n");

  bot.hears(BTN_EMAILS, async (ctx) => {
    await clearDraft(db, chatIdOf(ctx));
    await showEmailList(ctx);
  });

  bot.callbackQuery("eml", async (ctx) => {
    await ctx.answerCallbackQuery();
    await showEmailList(ctx, true);
  });

  bot.callbackQuery(new RegExp(`^em:(${KEY_PATTERN})$`), async (ctx) => {
    await ctx.answerCallbackQuery();
    await showEmailCard(ctx, ctx.match[1] as TemplateKey);
  });

  bot.callbackQuery(new RegExp(`^emr:(${KEY_PATTERN})$`), async (ctx) => {
    await ctx.answerCallbackQuery();
    await resetTemplate(db, ctx.match[1] as TemplateKey);
    await showEmailCard(ctx, ctx.match[1] as TemplateKey);
  });

  for (const [prefix, step, field] of [
    ["ems", "edit_email_subject", "subject"],
    ["emb", "edit_email_body", "body"],
  ] as const) {
    bot.callbackQuery(new RegExp(`^${prefix}:(${KEY_PATTERN})$`), async (ctx) => {
      await ctx.answerCallbackQuery();
      const key = ctx.match[1] as TemplateKey;
      const template = await getTemplate(db, key);
      await saveDraft(db, chatIdOf(ctx), step, { key });
      await ctx.reply(
        [
          `<b>${field === "subject" ? "Нова тема" : "Новий текст"}</b> листа «${esc(TEMPLATE_INFO[key].label)}».`,
          "Зараз:",
          `<pre>${esc(template[field])}</pre>`,
          "Надішліть новий варіант одним повідомленням. Порожній рядок розділяє абзаци. Підстановки (замінюються для кожного клієнта):",
          placeholderHelp(key),
        ].join("\n"),
        { ...HTML, reply_markup: cancelKeyboard },
      );
    });
  }

  bot.command(["start", "menu"], (ctx) =>
    ctx.reply("Оберіть дію в меню знизу.", { reply_markup: menu }),
  );

  bot.command("cancel", async (ctx) => {
    await clearDraft(db, chatIdOf(ctx));
    await ctx.reply("Скасовано.", { reply_markup: menu });
  });

  // --- Menu buttons --------------------------------------------------------

  bot.hears(BTN_NEW, async (ctx) => {
    await saveDraft(db, chatIdOf(ctx), "date", {});
    await ctx.reply(
      "Нова дата. <b>Крок 1/4</b>\nНа яку дату? Напишіть у форматі <code>20.12</code>",
      { ...HTML, reply_markup: cancelKeyboard },
    );
  });

  bot.hears(BTN_SCHEDULE, async (ctx) => {
    await clearDraft(db, chatIdOf(ctx));
    await showSchedule(ctx);
  });

  bot.hears(BTN_REQUESTS, async (ctx) => {
    await clearDraft(db, chatIdOf(ctx));
    const rows = await listRequests(db);
    const keyboard = new InlineKeyboard();
    for (const { booking, startsAt } of rows) {
      keyboard
        .text(`${formatSessionDate(startsAt)} · ${booking.name} · ${pluralSeats(booking.seats)}`, `pp:${booking.id}`)
        .row();
    }
    await ctx.reply(requestsText(rows), { ...HTML, reply_markup: keyboard });
  });

  bot.hears(BTN_ANALYTICS, async (ctx) => {
    await clearDraft(db, chatIdOf(ctx));
    const [analytics, upcoming] = await Promise.all([getAnalytics(db), listAdminSessions(db)]);
    await ctx.reply(analyticsText(analytics, upcoming), HTML);
  });

  // --- Wizard: text answers ---------------------------------------------------

  bot.on("message:text", async (ctx) => {
    const chatId = chatIdOf(ctx);
    const text = ctx.message.text;
    const draft = await getDraft(db, chatId);
    if (!draft) {
      await ctx.reply("Оберіть дію в меню знизу.", { reply_markup: menu });
      return;
    }

    const ask = (message: string) =>
      ctx.reply(message, { ...HTML, reply_markup: cancelKeyboard });

    switch (draft.step) {
      case "date": {
        const date = parseDate(text, kyivDateParts(new Date()));
        if (!date) {
          await ask("Не розумію дату. Напишіть, наприклад, <code>20.12</code>");
          return;
        }
        await saveDraft(db, chatId, "time", { ...draft.data, date });
        await ask("<b>Крок 2/4</b>\nО котрій годині початок? Наприклад <code>18:00</code>");
        return;
      }

      case "time": {
        const time = parseTime(text);
        if (!time) {
          await ask("Не розумію час. Напишіть, наприклад, <code>18:00</code>");
          return;
        }
        const date = draft.data.date as Parameters<typeof combineStart>[0];
        const start = combineStart(date, time, new Date());
        if (!start.ok) {
          await ask(
            start.reason === "past"
              ? "Цей час уже минув. Вкажіть майбутній час, або /cancel і почніть спочатку."
              : "Такого часу не існує (перехід на літній час). Вкажіть інший.",
          );
          return;
        }
        await saveDraft(db, chatId, "capacity", {
          ...draft.data,
          startsAt: start.startsAt.toISOString(),
        });
        await ask("<b>Крок 3/4</b>\nСкільки місць? Число від 1 до 50");
        return;
      }

      case "capacity": {
        const capacity = parseCapacity(text);
        if (!capacity) {
          await ask("Потрібне ціле число від 1 до 50.");
          return;
        }
        await saveDraft(db, chatId, "price", { ...draft.data, capacity });
        await ask("<b>Крок 4/4</b>\nЦіна за одне місце в гривнях. Наприклад <code>1800</code>");
        return;
      }

      case "price": {
        const priceKop = parsePriceKop(text);
        if (!priceKop) {
          await ask("Вкажіть ціну числом від 1 до 100000, наприклад <code>1800</code>");
          return;
        }
        const data: Record<string, unknown> = { ...draft.data, priceKop };
        await saveDraft(db, chatId, "confirm", data);
        const startsAt = new Date(data.startsAt as string);
        await ctx.reply(
          `Створити дату?\n\n<b>${esc(when(startsAt))}</b>\nМісць: ${data.capacity}\nЦіна: ${esc(formatUah(priceKop))}`,
          {
            ...HTML,
            reply_markup: new InlineKeyboard()
              .text("✅ Створити", "wz:ok")
              .text("✖ Скасувати", "wz:cancel"),
          },
        );
        return;
      }

      case "edit_capacity": {
        const capacity = parseCapacity(text);
        if (!capacity) {
          await ask("Потрібне ціле число від 1 до 50.");
          return;
        }
        const sessionId = draft.data.sessionId as string;
        const result = await updateCapacity(db, sessionId, capacity);
        if (!result.ok) {
          await ask(
            result.reason === "too_low"
              ? `Не можна менше, ніж уже продано або заброньовано: ${result.seatsTaken}.`
              : "Дату не знайдено.",
          );
          return;
        }
        await clearDraft(db, chatId);
        await showCard(ctx, sessionId, false);
        return;
      }

      case "edit_email_subject":
      case "edit_email_body": {
        const key = draft.data.key as TemplateKey;
        const isSubject = draft.step === "edit_email_subject";
        const checked = isSubject ? checkSubject(key, text) : checkBody(key, text);
        if (!checked.ok) {
          await ask(esc(checked.error));
          return;
        }
        await saveTemplate(db, key, isSubject ? { subject: checked.value } : { body: checked.value });
        await clearDraft(db, chatId);
        await ctx.reply("✅ Збережено. Нові листи вже будуть надсилатися з цим текстом.");
        await showEmailCard(ctx, key, false);
        return;
      }

      case "edit_start": {
        const parsed = parseDateTime(text, kyivDateParts(new Date()));
        if (!parsed) {
          await ask("Не розумію. Напишіть дату й час, наприклад <code>21.12 18:00</code>");
          return;
        }
        const start = combineStart(parsed.date, parsed.time, new Date());
        if (!start.ok) {
          await ask(
            start.reason === "past"
              ? "Цей час уже минув. Вкажіть майбутній."
              : "Такого часу не існує (перехід на літній час). Вкажіть інший.",
          );
          return;
        }
        const sessionId = draft.data.sessionId as string;
        const before = await getAdminSession(db, sessionId);
        const updated = await updateSession(db, sessionId, { startsAt: start.startsAt });
        await clearDraft(db, chatId);
        if (!before || !updated) {
          await ctx.reply("Дату не знайдено або вона скасована.", { reply_markup: menu });
          return;
        }
        const guests = await getParticipants(db, sessionId);
        let report = `✅ Час змінено: <b>${esc(when(updated.startsAt))}</b>`;
        if (guests.length > 0) {
          const result = await notifyRescheduled(db, guests, updated, before.startsAt);
          report += `\nЛисти учасникам: надіслано ${result.sent}`;
          if (result.failed > 0) {
            report += `\n⚠️ Не вдалося надіслати: ${result.failed}. Повідомте їх самі.`;
          }
        }
        await ctx.reply(report, HTML);
        await showCard(ctx, sessionId, false);
        return;
      }

      case "edit_price": {
        const priceKop = parsePriceKop(text);
        if (!priceKop) {
          await ask("Вкажіть ціну числом від 1 до 100000, наприклад <code>1800</code>");
          return;
        }
        const sessionId = draft.data.sessionId as string;
        const updated = await updateSession(db, sessionId, { priceKop });
        await clearDraft(db, chatId);
        if (!updated) {
          await ctx.reply("Дату не знайдено або вона скасована.", { reply_markup: menu });
          return;
        }
        await ctx.reply(
          `✅ Нова ціна: <b>${esc(formatUah(priceKop))}</b>. Вона діє для нових записів, оплачені не змінюються.`,
          HTML,
        );
        await showCard(ctx, sessionId, false);
        return;
      }

      case "edit_duration": {
        const durationMin = parseDuration(text);
        if (!durationMin) {
          await ask("Вкажіть тривалість у хвилинах, від 30 до 480, наприклад <code>120</code>");
          return;
        }
        const sessionId = draft.data.sessionId as string;
        const updated = await updateSession(db, sessionId, { durationMin });
        await clearDraft(db, chatId);
        if (!updated) {
          await ctx.reply("Дату не знайдено або вона скасована.", { reply_markup: menu });
          return;
        }
        await showCard(ctx, sessionId, false);
        return;
      }

      default:
        await ask("Натисніть кнопку під повідомленням: «Створити» або «Скасувати».");
    }
  });

  // --- Inline buttons --------------------------------------------------------------

  bot.callbackQuery("wz:cancel", async (ctx) => {
    await clearDraft(db, chatIdOf(ctx));
    await ctx.answerCallbackQuery();
    await ctx.editMessageText("Скасовано.");
    await ctx.reply("Оберіть дію в меню.", { reply_markup: menu });
  });

  bot.callbackQuery("wz:ok", async (ctx) => {
    const chatId = chatIdOf(ctx);
    const draft = await getDraft(db, chatId);
    await ctx.answerCallbackQuery();
    if (!draft || draft.step !== "confirm") {
      await ctx.editMessageText("Ця форма вже неактуальна. Почніть спочатку: «➕ Нова дата».");
      return;
    }
    const session = await createSession(db, {
      startsAt: new Date(draft.data.startsAt as string),
      capacity: draft.data.capacity as number,
      priceKop: draft.data.priceKop as number,
    });
    await clearDraft(db, chatId);
    await ctx.editMessageText(
      `✅ Дату створено: <b>${esc(when(session.startsAt))}</b>\nВона вже на сайті: ${esc(siteUrl())}/workshops`,
      HTML,
    );
  });

  bot.callbackQuery("sl", async (ctx) => {
    await ctx.answerCallbackQuery();
    await showSchedule(ctx, true);
  });

  bot.callbackQuery(/^sc:([0-9a-f-]{36})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await showCard(ctx, ctx.match[1]);
  });

  bot.callbackQuery(/^st:([0-9a-f-]{36})$/, async (ctx) => {
    const session = await getAdminSession(db, ctx.match[1]);
    await ctx.answerCallbackQuery();
    if (session && session.status !== "cancelled") {
      await setSessionStatus(db, session.id, session.status === "open" ? "closed" : "open");
    }
    await showCard(ctx, ctx.match[1]);
  });

  bot.callbackQuery(/^cap:([0-9a-f-]{36})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await saveDraft(db, chatIdOf(ctx), "edit_capacity", { sessionId: ctx.match[1] });
    await ctx.reply("Скільки місць має бути на цю дату? Число від 1 до 50", {
      reply_markup: cancelKeyboard,
    });
  });

  const startEdit = (prefix: string, step: string, prompt: string) =>
    bot.callbackQuery(new RegExp(`^${prefix}:([0-9a-f-]{36})$`), async (ctx) => {
      await ctx.answerCallbackQuery();
      await saveDraft(db, chatIdOf(ctx), step, { sessionId: ctx.match[1] });
      await ctx.reply(prompt, { ...HTML, reply_markup: cancelKeyboard });
    });

  startEdit(
    "et",
    "edit_start",
    "Нова дата й час? Напишіть, наприклад, <code>21.12 18:00</code>. Учасникам піде лист про зміну.",
  );
  startEdit(
    "ep",
    "edit_price",
    "Нова ціна за місце в гривнях? Діє для нових записів, оплачені не змінюються.",
  );
  startEdit("ed", "edit_duration", "Тривалість у хвилинах? Наприклад <code>120</code>");

  bot.callbackQuery(/^pl:([0-9a-f-]{36})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const sessionId = ctx.match[1];
    const session = await getAdminSession(db, sessionId);
    if (!session) {
      await ctx.editMessageText("Дату не знайдено.");
      return;
    }
    const guests = await getParticipants(db, sessionId);
    const keyboard = new InlineKeyboard();
    guests.forEach((g, i) =>
      keyboard.text(`${i + 1}. ${g.name} · ${pluralSeats(g.seats)}`, `pp:${g.id}`).row(),
    );
    keyboard.text("⬅️ Назад", `sc:${sessionId}`);
    await ctx.editMessageText(
      guests.length === 0
        ? `<b>${esc(when(session.startsAt))}</b>\nУчасників поки немає.`
        : `<b>${esc(when(session.startsAt))}</b>\nОберіть учасника:`,
      { ...HTML, reply_markup: keyboard },
    );
  });

  bot.callbackQuery(/^pp:([0-9a-f-]{36})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const booking = await getBooking(db, ctx.match[1]);
    if (!booking) {
      await ctx.editMessageText("Запис не знайдено.");
      return;
    }
    const keyboard = new InlineKeyboard();
    if (booking.status === "requested") {
      keyboard
        .text("✅ Оплачено", `bp:${booking.id}`)
        .text("❌ Скасувати заявку", `bc:${booking.id}`)
        .row();
    } else if (booking.status === "paid") {
      keyboard.text("❌ Скасувати запис", `bc:${booking.id}`).row();
    }
    keyboard.text("⬅️ До учасників", `pl:${booking.sessionId}`);
    const state =
      booking.status === "requested" ? "очікує оплати" : booking.status === "paid" ? "оплачено" : "скасовано";
    await ctx.editMessageText(
      `${participantLine(booking)}\nДо сплати: ${esc(formatUah(booking.amountKop))}\nСтатус: ${state}`,
      { ...HTML, reply_markup: keyboard },
    );
  });

  bot.callbackQuery(/^bp:([0-9a-f-]{36})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const result = await confirmPaid(db, ctx.match[1]);
    if (!result) {
      await ctx.editMessageText("Цю заявку вже оброблено (оплачено або скасовано).");
      return;
    }
    await ctx.editMessageText(
      `✅ Оплату підтверджено: ${participantLine(result.booking)}\n${
        result.emailSent
          ? "Клієнту надіслано лист із підтвердженням."
          : "⚠️ Лист клієнту не надіслано, повідомте його самі."
      }`,
      {
        ...HTML,
        reply_markup: new InlineKeyboard().text("⬅️ До учасників", `pl:${result.booking.sessionId}`),
      },
    );
  });

  bot.callbackQuery(/^bc:([0-9a-f-]{36})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const booking = await getBooking(db, ctx.match[1]);
    if (!booking || booking.status === "cancelled") {
      await ctx.editMessageText("Запис не знайдено або вже скасовано.");
      return;
    }
    const money =
      booking.status === "paid"
        ? ` Кошти (${esc(formatUah(booking.amountKop))}) потрібно повернути вручну.`
        : "";
    await ctx.editMessageText(
      `Скасувати ${booking.status === "paid" ? "запис" : "заявку"} <b>${esc(booking.name)}</b> (${esc(pluralSeats(booking.seats))})? Місця звільняться, клієнт отримає лист.${money}`,
      {
        ...HTML,
        reply_markup: new InlineKeyboard()
          .text("❌ Так, скасувати", `bcy:${booking.id}`)
          .text("⬅️ Назад", `pp:${booking.id}`),
      },
    );
  });

  bot.callbackQuery(/^bcy:([0-9a-f-]{36})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const cancelled = await cancelBooking(db, ctx.match[1]);
    if (!cancelled) {
      await ctx.editMessageText("Запис не знайдено або вже скасовано.");
      return;
    }
    const session = await getAdminSession(db, cancelled.sessionId);
    let report = `❌ Скасовано: ${participantLine(cancelled)}`;
    if (cancelled.paidAt) {
      report += `\nПоверніть клієнту <b>${esc(formatUah(cancelled.amountKop))}</b>.`;
    }
    if (session) {
      const result = await notifyCancelled(db, [cancelled], session);
      report += result.sent > 0
        ? "\nЛист клієнту надіслано."
        : "\n⚠️ Лист клієнту не надіслано, повідомте його самі.";
    }
    await ctx.editMessageText(report, {
      ...HTML,
      reply_markup: new InlineKeyboard().text("⬅️ До учасників", `pl:${cancelled.sessionId}`),
    });
  });

  bot.callbackQuery(/^cx:([0-9a-f-]{36})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      "Скасувати цю дату? Нові заявки стануть неможливими. Усі, хто записався, отримають лист. Гроші автоматично <b>не повертаються</b>: ви побачите список, кому повернути.",
      {
        ...HTML,
        reply_markup: new InlineKeyboard()
          .text("❌ Так, скасувати", `cxy:${ctx.match[1]}`)
          .text("⬅️ Назад", `sc:${ctx.match[1]}`),
      },
    );
  });

  bot.callbackQuery(/^cxy:([0-9a-f-]{36})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const sessionId = ctx.match[1];
    const participants = await getParticipants(db, sessionId);
    const cancelled = await setSessionStatus(db, sessionId, "cancelled");
    if (!cancelled) {
      await ctx.editMessageText("Дату не знайдено або вже скасовано.");
      return;
    }
    const paidGuests = participants.filter((p) => p.status === "paid");
    let refunds =
      participants.length === 0
        ? "Заявок і оплат не було."
        : paidGuests.length === 0
          ? `Заявок скасовано: ${participants.length}. Оплат не було.`
          : `Потрібно повернути кошти (${paidGuests.length}):\n${paidGuests.map(participantLine).join("\n")}\nЗаявок без оплати скасовано: ${participants.length - paidGuests.length}.`;
    if (participants.length > 0) {
      const result = await notifyCancelled(db, participants, cancelled);
      refunds += `\n\nЛисти учасникам: надіслано ${result.sent}`;
      if (result.failed > 0) refunds += `\n⚠️ Не вдалося надіслати: ${result.failed}. Повідомте їх самі.`;
    }
    await ctx.editMessageText(
      `❌ Дату скасовано: <b>${esc(when(cancelled.startsAt))}</b>\n\n${refunds}`,
      HTML,
    );
  });

  bot.catch((error) => {
    console.error("Telegram bot error.", error.error);
  });

  return bot;
}
