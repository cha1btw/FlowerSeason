# Christmas by Flower Season

Website for Flower Season, a Kyiv studio that does festive decor, corporate gifts,
flower bar and open Christmas workshops.

The site has two audiences:

- **For business**: a corporate landing page (decor, gifts, workshops for teams).
- **For individuals**: a schedule of open workshops. Visitors pick a date and leave a
  request. There is **no online payment**: the owner receives the request in Telegram,
  sends the payment link herself and marks the booking as paid in the bot.

## Features

- Next.js App Router site with server-rendered pages and Server Actions for forms.
- Workshop schedule stored in PostgreSQL. Seats are locked per date
  (`SELECT ... FOR UPDATE`), so simultaneous requests cannot oversell a date.
- Booking statuses: `requested` (seats held) -> `paid`, or `cancelled`.
- Public status page for each request (`/workshops/booking/[id]`).
- Telegram admin bot (grammY) for the owner: create dates, edit prices and seats,
  review requests, mark them paid or cancel them, edit dates and prices, view stats.
- Guests choose Telegram, WhatsApp or Viber; the owner contacts them personally.
- Tests on the Node test runner (`npm test`). Database tests run only when
  `TEST_DATABASE_URL` is set.

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4, Framer Motion, Lucide icons
- PostgreSQL with Drizzle ORM and `drizzle-kit` migrations
- grammY (Telegram bot)
- Deployed on Vercel

## Project structure

```
app/            Routes: landing, /business, /workshops, /privacy, API routes
  api/telegram  Telegram webhook (checks the secret header)
  api/cron/     Disabled legacy reminder endpoint
components/     UI components (header, forms, booking panel, motion helpers)
lib/
  booking/      Booking rules: availability, status, service, notifications, templates
  bot/          Telegram admin bot: wizard, menus, views
  db/           Drizzle schema and connection
  content.ts    All site copy (Ukrainian)
drizzle/        SQL migrations
scripts/        Migrations, sample data, Telegram webhook setup
tests/          Unit and integration tests
docs/           booking.md (how the system works, go-live checklist), demo.md
public/         Images, video and favicon
```

## Getting started

The simplest way needs only Docker Desktop. It starts PostgreSQL and the dev
server, applies migrations and adds the December sample dates:

```bash
docker compose up -d --build                  # http://localhost:3000
docker compose exec app npm run typecheck
docker compose exec app npm test              # uses the flowerseason_test database
docker compose down                           # stop (data is kept)
```

Code edits on the host are picked up live. After changing `package.json`, run
`docker compose up -d --build` again.

Handing the project over or setting it up on a new computer:
[docs/handover.md](docs/handover.md) and
[docs/codex-setup-prompt.md](docs/codex-setup-prompt.md).

### Without Docker for the app

Requirements: Node.js 22.9 or newer (the scripts use `--env-file-if-exists`),
npm, and Docker for a local PostgreSQL.

```bash
npm install
cp .env.example .env.local      # then fill in the values you need
docker compose up -d db         # PostgreSQL on port 5433
docker compose exec db createdb -U flowerseason flowerseason_test   # once, for tests
npm run db:migrate              # apply migrations to DATABASE_URL
node --env-file-if-exists=.env.local scripts/seed-dev.ts            # optional sample dates
npm run dev
```

Open http://localhost:3000.

Without `DATABASE_URL`, `/workshops` shows a sample schedule and a Telegram button
instead of the request form. A database that is configured but unreachable shows an
error, never the samples.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public site address, used in the Telegram webhook |
| `DATABASE_URL` | PostgreSQL connection string |
| `TEST_DATABASE_URL` | Separate database for the DB tests (tests are skipped without it) |
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Random string that Telegram sends back, so only Telegram can call the webhook |
| `ADMIN_TELEGRAM_IDS` | Comma-separated Telegram user IDs allowed to use the admin bot |
| `TELEGRAM_CHAT_ID` | Chat that receives contact-form messages. Also used as the admin list if `ADMIN_TELEGRAM_IDS` is empty |
| `RESEND_API_KEY` | Resend API key (optional) |
| `EMAIL_FROM` | Sender address, on a domain verified in Resend |

Never commit `.env*` files. They are git-ignored.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm test` | Run the test suite |
| `npm run typecheck` | TypeScript check without emitting files |
| `npm run db:generate` | Generate a new migration from `lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` |

## Telegram bot

The bot runs inside the Next.js app as a webhook at `/api/telegram`. Only the user IDs
in `ADMIN_TELEGRAM_IDS` can use it. Anyone else who writes to the bot is told their
Telegram ID, so the owner can be added.

A bot has a single webhook. Register it once, and again after every domain change:

```bash
node --env-file-if-exists=.env.local scripts/set-telegram-webhook.ts
```

To try the whole flow on a laptop with a real bot and a public tunnel, follow
[docs/demo.md](docs/demo.md).

## Deployment

The app is designed for Vercel:

1. Create a PostgreSQL database (for example Neon from the Vercel Marketplace) and set
   `DATABASE_URL`.
2. Apply the schema once: `DATABASE_URL=<production url> npm run db:migrate`.
3. Set the environment variables above in the Vercel project.
4. Register the Telegram webhook with the production address.

`vercel.json` does not schedule email reminders.

The full go-live checklist, including the legal page and copy review, is in
[docs/booking.md](docs/booking.md).

## Status

- The privacy page and the workshop copy are drafts until they are reviewed
  (`lib/legal.ts`, `lib/content.ts`).
- Online payment is intentionally not implemented. Payment links and refunds are
  handled manually by the owner.

## December 2026 workshops and local Docker

`docker compose up -d --build` starts both PostgreSQL and the Next.js app at
`http://localhost:3000`. The app applies migrations and adds the five December
2026 meetings on first start. PostgreSQL is exposed on `localhost:5433` for
local tools and tests. A one-time seed marker preserves edits made in the bot
on later builds or restarts.

The booking form asks for a phone and a chosen messenger. New requests are
recorded as `requested` and sent to `ADMIN_TELEGRAM_IDS` (or
`TELEGRAM_CHAT_ID`) through `TELEGRAM_BOT_TOKEN`. Only a `paid` booking uses
capacity; the bot checks free capacity inside a transaction before marking a
request paid. Configure those Telegram values and
`TELEGRAM_WEBHOOK_SECRET` in the deployment environment and register the
webhook with `scripts/set-telegram-webhook.ts`. The local environment has no
Telegram credentials, so Docker can run the site and database but cannot
send a real bot notification until credentials are configured.

The Vercel build applies migrations and seeds the schedule when `DATABASE_URL`
is configured. Workshop emails and the reminder cron are disabled; the owner
contacts guests personally in their chosen messenger.
