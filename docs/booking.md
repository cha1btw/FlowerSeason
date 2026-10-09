# Online requests for workshops (`/workshops`)

Customers pick a date on `/workshops` and leave a request without an account.
The owner gets it in Telegram, sends the payment link herself (outside the
site), and presses **Paid** in the bot. Everything lives in this Next.js app:
no second server, and no online payments in the code.

## Site structure

- `/` entry screen: **For business** (`/business`, the corporate landing) or
  **For individuals** (`/workshops`). Copy lives in `lib/content.ts` (`gateway`).
- `/workshops` schedule + request form, `/workshops/booking/[id]` status page of
  one request, `/privacy`.
- API: `/api/telegram` (bot webhook), `/api/cron/reminders` (daily reminders).

## How it works

```
/workshops (dates from Postgres)
  -> Server Action submitRequest -> createBooking (locks the date row, holds the seats)
  -> email to the customer + Telegram message to the owner with [Paid] [Cancel]
owner sends the payment link herself -> presses "Paid" -> confirmation email to the customer
Telegram -> POST /api/telegram (secret checked) -> grammY bot (admins only)
Vercel Cron, daily 07:00 UTC -> GET /api/cron/reminders -> reminder emails to paid guests
```

Statuses of a booking: `requested` (seats held, waiting for payment) -> `paid`, or
`cancelled`. A request holds its seats until the owner cancels it, so keep an eye
on the **🕓 Заявки** list in the bot.

Key rules (covered by tests in `tests/`):

- **No overselling.** `createBooking` runs `SELECT ... FOR UPDATE` on the date, so
  simultaneous requests queue up.
- **Double taps are safe.** Pressing **Paid** twice, or the customer sending the
  form twice, changes and sends nothing the second time.
- **Without a database** (no `DATABASE_URL`) `/workshops` shows a sample schedule
  and a Telegram button instead of the form. A configured but broken database shows
  an error, never the samples.

## Local development

```bash
docker compose up -d                                         # Postgres on :5433
docker compose exec db createdb -U flowerseason flowerseason_test   # once
# .env.local needs DATABASE_URL and TEST_DATABASE_URL (see .env.example)
npm run db:migrate
node --env-file-if-exists=.env.local scripts/seed-dev.ts    # sample dates
npm run dev
npm test                                                     # DB tests are skipped without TEST_DATABASE_URL
```

## Going live checklist

1. **Database.** Create a Postgres (Vercel Marketplace -> Neon). Vercel sets
   `DATABASE_URL`; apply the schema once from your laptop:
   `DATABASE_URL=<prod url> npm run db:migrate`.
2. **Telegram bot.** In Vercel set `TELEGRAM_BOT_TOKEN`, `ADMIN_TELEGRAM_IDS`
   (comma-separated user ids; a stranger who writes the bot is told their id),
   `TELEGRAM_WEBHOOK_SECRET` (random string) and `NEXT_PUBLIC_SITE_URL` (the public
   `https://` address). Then, with the same values in `.env.local`, run once:
   `node --env-file-if-exists=.env.local scripts/set-telegram-webhook.ts`.
   A bot has one webhook: if something else receives this bot's updates, use a new bot.
3. **Email** (optional but recommended). Resend account, verify the sending domain,
   set `RESEND_API_KEY` and `EMAIL_FROM`. Without them customers get no emails and
   the owner is warned in each request.
4. **Cron.** Set `CRON_SECRET` (random string). `vercel.json` schedules the job.
5. **Privacy page.** Fill in `lib/legal.ts` (FOP details), have it reviewed, then
   set `LEGAL_DRAFT = false`.
6. **Copy.** Confirm the draft texts in `lib/content.ts` (`workshopsPage`).
7. **Real test.** Send a request, check Telegram and the email, press Paid.

## Known limitations

- A request holds seats until the owner cancels it. Anyone can fill dates with
  requests; if abused, add rate limiting (Vercel WAF) or a captcha.
- No online payment and no automatic refunds: payment links and refunds are manual.
- Vercel's Hobby plan is for non-commercial use only.
