import { Bot, InlineKeyboard, Keyboard, type Context } from "grammy";
import { adminChatIds } from "../admin.ts";
import {
  clearDraft,
  createSession,
  getAdminSession,
  getAnalytics,
  getDraft,
  getParticipants,
  listAdminSessions,
  saveDraft,
  setSessionStatus,
  updateCapacity,
} from "../booking/admin-service.ts";
import type { Db } from "../db/index.ts";
import { formatUah } from "../format.ts";
import { siteUrl } from "../site.ts";
import { escapeTelegramHtml as esc } from "../telegram.ts";
import { kyivDateParts } from "../time.ts";
import {
  analyticsText,
  participantLine,
  scheduleLine,
  scheduleText,
  sessionCardText,
  when,
} from "./views.ts";
import {
  combineStart,
  parseCapacity,
  parseDate,
  parsePriceKop,
  parseTime,
} from "./wizard.ts";

const BTN_NEW = "➕ Нова дата";
const BTN_SCHEDULE = "📅 Розклад";
const BTN_ANALYTICS = "📊 Аналітика";

const menu = new Keyboard()
  .text(BTN_NEW)
  .text(BTN_SCHEDULE)
  .row()
  .text(BTN_ANALYTICS)
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
    if (ctx.chat?.type === "private") await ctx.reply(NOT_ADMIN);
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
        .text("✏️ Кількість місць", `cap:${sessionId}`)
        .row()
        .text("❌ Скасувати дату", `cx:${sessionId}`)
        .row();
    }
    keyboard.text("⬅️ До розкладу", "sl");

    const text = sessionCardText(session, participants);
    if (edit) await ctx.editMessageText(text, { ...HTML, reply_markup: keyboard });
    else await ctx.reply(text, { ...HTML, reply_markup: keyboard });
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

  bot.callbackQuery(/^cx:([0-9a-f-]{36})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      "Скасувати цю дату? Нові записи стануть неможливими. Гроші учасникам автоматично <b>не повертаються</b>: ви побачите список, кому повернути.",
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
    const refunds =
      participants.length === 0
        ? "Оплачених записів не було."
        : `Потрібно повернути кошти (${participants.length}):\n${participants.map(participantLine).join("\n")}`;
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
