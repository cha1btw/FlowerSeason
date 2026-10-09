# Online booking for workshops (`/workshops`)

Customers pick a date on `/workshops`, pay by card without an account, and get an
email. The owner manages everything from a Telegram bot. It all lives in this
Next.js app: no second server.

## Site structure

- `/` entry screen: choose **For business** (`/business`, the corporate landing) or
  **For individuals** (`/workshops`, public booking). Copy lives in `lib/content.ts`
  (`gateway`), so adding a third door is one more entry there.
- `/business`, `/workshops`, `/oferta`, `/privacy`, plus the API routes below.

## How it works

```
/workshops (reads dates from Postgres)
  -> Server Action startCheckout -> createBooking (locks the date row, holds seats 15 min)
  -> monobank invoice -> customer pays on the bank page
monobank -> POST /api/payments/monobank (signature checked) -> confirmPayment -> email + Telegram
/workshops/booking/[id]  polls POST /api/workshops/bookings/[id]/sync as a fallback for late webhooks
Telegram -> POST /api/telegram (secret checked) -> grammY bot (admins only)
Vercel Cron, daily 07:00 UTC -> GET /api/cron/reminders -> reminder emails
```

Key rules (all covered by tests in `tests/`):

- **No overselling.** `createBooking` runs `SELECT ... FOR UPDATE` on the date, so
  simultaneous buyers queue up. An unpaid booking holds seats for 15 minutes and
  then simply stops counting.
- **Payments are idempotent.** Only the call that actually flips a booking to
  `paid` sends the email and the Telegram message, however many times monobank
  retries.
- **A failed card attempt does not cancel the booking**: the customer may retry on
  the same invoice. Unpaid bookings expire with their hold.
- **Late payment, seat already resold** -> status `needs_attention` and a Telegram
  alert. The owner decides: refund, or squeeze the guest in.

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

Without `MONOBANK_TOKEN`, development uses a fake payment page
(`/workshops/sandbox-pay/[id]`). It returns 404 in production.

## Going live checklist

1. **Database.** Create a Postgres (Vercel Marketplace -> Neon). Set `DATABASE_URL`
   in Vercel, then apply the schema once:
   `DATABASE_URL=<prod url> npm run db:migrate`.
2. **monobank acquiring.** Needs a sole-proprietor (FOP) account. Set
   `MONOBANK_TOKEN`. `NEXT_PUBLIC_SITE_URL` must be the public `https://` domain:
   monobank calls `/api/payments/monobank` there.
3. **Email.** Create a Resend account, verify the sending domain (DNS), set
   `RESEND_API_KEY` and `EMAIL_FROM`.
4. **Telegram bot.** Set `ADMIN_TELEGRAM_IDS` (comma-separated user ids),
   `TELEGRAM_WEBHOOK_SECRET` (random string), then run once:
   `node --env-file-if-exists=.env.local scripts/set-telegram-webhook.ts`.
   A bot has one webhook: if another program already receives this bot's updates,
   use a new bot from @BotFather instead.
5. **Cron.** Set `CRON_SECRET` (random string). `vercel.json` schedules the job.
6. **Legal pages.** Fill in `lib/legal.ts` (FOP details, refund terms), have it
   reviewed, then set `LEGAL_DRAFT = false`.
7. **Copy.** Confirm the draft texts in `lib/content.ts` (`workshopsPage`): what is
   included, location, duration.
8. **Real test.** Pay the smallest amount with a real card, check the email and the
   Telegram message, then refund it.

## Known limitations (v1)

- Anyone can hold seats for 15 minutes by starting checkouts. If abused, add rate
  limiting (Vercel WAF) or a captcha.
- No automatic refunds: the owner refunds in the monobank cabinet.
- No fiscal receipts (PRRO/Checkbox): confirm with the accountant.
- Hosting a paid site on Vercel's Hobby plan is against its terms (non-commercial only).
