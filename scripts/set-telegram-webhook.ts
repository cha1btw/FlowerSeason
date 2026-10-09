// One-time (and after every domain change): tells Telegram where to send updates.
// WARNING: a bot has a single webhook. If another program already receives this
// bot's updates, it stops receiving them.
// Usage: node --env-file-if-exists=.env.local scripts/set-telegram-webhook.ts
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const site = process.env.NEXT_PUBLIC_SITE_URL;

if (!token || !secret || !site) {
  console.error("TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and NEXT_PUBLIC_SITE_URL are required.");
  process.exit(1);
}
if (!site.startsWith("https://")) {
  console.error("Telegram only accepts https:// webhook URLs.");
  process.exit(1);
}

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: `${site.replace(/\/$/, "")}/api/telegram`,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
  }),
});
console.log(response.status, await response.text());

export {};
