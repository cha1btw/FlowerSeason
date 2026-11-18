<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules for coding agents (Codex, Claude Code)

The site owner maintains this project herself with the help of an AI agent. She is
not a professional developer. Talk to her in the language she writes in, explain
every change in plain words (what changed, where, and how to check it), and ask
before anything risky.

## Running the project

Everything runs in Docker, nothing else is required:

```bash
docker compose up -d --build     # site on http://localhost:3000, Postgres on port 5433
docker compose logs -f app       # server log
docker compose down              # stop (data is kept)
```

Checks, run them inside the container before every commit:

```bash
docker compose exec app npm run typecheck
docker compose exec app npm test
```

If `package.json` changed (new dependency), rebuild: `docker compose up -d --build`.
If the test database is missing (old Docker volume):
`docker compose exec db createdb -U flowerseason flowerseason_test`.

## Where things live

- Site texts (Ukrainian): `lib/content.ts`. Privacy page: `lib/legal.ts`.
- Pages: `app/` (`/` entry screen, `/business`, `/workshops`, `/privacy`).
- Components: `components/`. Images and videos: `public/media/`.
- Booking logic and the Telegram admin bot: `lib/booking/`, `lib/bot/`.
- Database schema: `lib/db/schema.ts`, migrations in `drizzle/`.
- More detail: `README.md`, `docs/booking.md`, `docs/handover.md`.

## Rules

- **`main` is production.** Every push to `main` is deployed by Vercel to
  flowerseason.company within a couple of minutes. Before pushing to `main`, show
  the owner what changed and get her OK. Larger changes go to a separate branch:
  Vercel builds a preview link for every branch, she checks it, then merge.
- Never commit `.env*` files, tokens or passwords. If you see a secret in the code,
  tell the owner immediately.
- Never `git push --force` to `main` and never rewrite published history.
- The production build (`npm run build` on Vercel) applies database migrations to
  the production database automatically (`scripts/prepare-db.ts`). Schema changes
  must be additive (new tables or columns). Never drop or rename columns or tables
  without asking the owner first, and explain that it touches live bookings.
- Do not add npm dependencies without explaining why and asking first.
- Media: compress videos before adding them (H.264 mp4, ideally under 5 MB, with a
  `.webp` poster). Raw footage stays outside git (`footage/`, `video/` are ignored).
- Keep the site copy Ukrainian; code, comments and commit messages in English.
- After a change, open http://localhost:3000 and check the affected page, also at
  phone width.
