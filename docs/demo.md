# Live demo on your laptop with a real Telegram bot

Goal: the owner uses the real bot on her phone while a customer sends a request
from another phone, all served from this laptop. Emails are only printed in the
server log (no Resend key yet), everything else is real.

## 1. One-time prerequisites

```bash
docker compose up -d                 # local Postgres
npm run db:migrate
node --env-file-if-exists=.env.local scripts/seed-dev.ts   # optional sample dates
brew install cloudflared             # free tunnel, no account needed
```

Create a bot: in Telegram open @BotFather, send `/newbot`, copy the token.
Use a NEW bot for the demo so the existing leads bot is not touched.

## 2. `.env.local` (this file is git-ignored, keep it that way)

```
TELEGRAM_BOT_TOKEN=<token from BotFather>
TELEGRAM_WEBHOOK_SECRET=<run: openssl rand -hex 24>
```

Do NOT set `ADMIN_TELEGRAM_IDS` yet.

## 3. Tunnel and webhook

```bash
npm run dev -- -p 3111               # terminal 1
cloudflared tunnel --url http://localhost:3111   # terminal 2: prints https://xxxx.trycloudflare.com
```

Put that address into `.env.local` as `NEXT_PUBLIC_SITE_URL=https://xxxx.trycloudflare.com`,
restart `npm run dev`, open `https://xxxx.trycloudflare.com/` once in a browser
(warms up the first compile), then:

```bash
node --env-file-if-exists=.env.local scripts/set-telegram-webhook.ts   # expect: 200 {"ok":true,...}
```

## 4. Who is the admin

Each person (you and the owner) sends `/start` to the bot. It answers with
"Ваш Telegram ID: 123456". Put the ids into `.env.local`:

```
ADMIN_TELEGRAM_IDS=111111111,222222222
```

Restart `npm run dev`. From now on only these accounts can use the bot and
receive notifications.

## 5. Demo script (about 5 minutes)

1. Owner: `/start` -> "➕ Нова дата" -> `20.12`, `18:00`, `8`, `1800` -> "Створити".
2. Customer phone: open the tunnel address -> For individuals -> pick the date -> send the request.
3. Owner's phone: "📝 Нова заявка" arrives with [✅ Оплачено] [❌ Скасувати]. The customer email appears in the server log (`[email not configured]`).
4. Owner presses "✅ Оплачено" (as if the guest had paid the link she sent). The customer's status page turns into "Ви записані".
5. Owner: "📅 Розклад" -> the date -> "👥 Учасники", "🕒 Дата й час", "💰 Ціна", "🕓 Заявки", "📊 Аналітика".

## Notes

- The tunnel address changes every time cloudflared restarts: update
  `NEXT_PUBLIC_SITE_URL`, restart, and run the webhook script again.
- After the demo, remove the webhook if the token will be reused elsewhere:
  `curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"`.
- The production site cannot do this demo yet: it has no database, so it shows
  the sample schedule only (see docs/booking.md, "Going live").
