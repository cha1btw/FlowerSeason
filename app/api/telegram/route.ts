import { timingSafeEqual } from "node:crypto";
import { webhookCallback } from "grammy";
import { createBot } from "@/lib/bot";
import { getDb } from "@/lib/db";

let handler: ((request: Request) => Promise<Response>) | undefined;

function hasValidSecret(request: Request, secret: string): boolean {
  const given = Buffer.from(request.headers.get("x-telegram-bot-api-secret-token") ?? "");
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Telegram calls this for every message to the bot. Telegram echoes back the
// secret we registered (see scripts/set-telegram-webhook.ts). We check it
// ourselves before anything else, so a stranger can neither feed the bot fake
// updates nor make us call Telegram. grammY checks it again as a second layer.
export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret) {
    return new Response("Not configured", { status: 503 });
  }
  if (!hasValidSecret(request, secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  handler ??= webhookCallback(createBot(getDb(), token), "std/http", {
    secretToken: secret,
  });
  return handler(request);
}
