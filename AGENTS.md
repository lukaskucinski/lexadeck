<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LexaDeck — Agent Guidelines

## Project Overview
Swiss-typographic Spanish flashcard PWA. Next.js 16 + Supabase Postgres + FSRS
(`ts-fsrs` v5) scheduling. Multi-user via Supabase Auth (Lukas + test users Ari
and Lorel); decks/cards/stats are scoped by `Deck.userId`. Tenancy enforcement
is the app layer (Prisma connects as table owner, so RLS doesn't backstop it) —
`scripts/isolation-smoke.ts` is the cross-tenant regression test; real RLS
policies become necessary the day any client-side DB access is introduced.
Production: https://lexadeck.vercel.app (auto-deploys on merge to `main`; PRs get
preview deploys — check which build you're testing before judging a fix).
Supabase project: `kuoediscikartsdebdfo` (us-east-1; transferred to Lukas's new
Supabase account June 2026 — the MCP must be authenticated against that account).

## Canonical Docs
- [Spec](.claude/docs/LEXADECK_SPEC.md) — architecture spec. **The v0.2 Amendments table at
  the top supersedes conflicting v0.1 sections below it** (design language, SRS, API style).
- `README.md` — setup, env vars, scripts.
- [Design System](.claude/docs/DESIGN_SYSTEM.md) — Swiss Typographic rules for all UI work.

## TickTick Board (dev workflow)
- Kanban project `6a28a16c8f083ab70be5322c` via the TickTick MCP; columns:
  Aspirational / TODO / In Progress / Complete / Deprecated. A dev round =
  one branch + PR covering a batch of cards.
- Standing instruction from Lukas: once the round's PR exists, batch-update the
  cards — prepend `RESOLVED (PR #N): <user-facing summary>` to each card's
  content and move it to the Complete column.
- Aspirational = backlog ideas; triage against current constraints (Gemini
  quota, schema/DB state) before picking, and push back when timing is wrong.

## Architecture Decisions (do not relitigate)
- **No REST API routes.** RSC reads + Server Actions (`lib/actions/*`) only.
- **FSRS, not SM-2.** `lib/srs.ts` wraps ts-fsrs; short-term scheduler ON so
  "Again" cards re-enter the live session. Display states map in `getSRSState()`;
  mastered = Review state + stability ≥ 21d.
- **Native forms + `useActionState` + zod.** No React Hook Form. No Zustand.
- **Auth**: Supabase Auth (email + password) via `@supabase/ssr`. `proxy.ts`
  (Next 16 convention — NOT `middleware.ts`, that's deprecated) refreshes the
  session and redirects signed-out requests to `/login`. Pages/actions call
  `requireUser()` (`lib/auth.ts`) and scope every query by `Deck.userId`;
  card mutations verify ownership first. Smoke tests sign in with
  `E2E_EMAIL`/`E2E_PASSWORD` from `.env`; user creation/rotation is
  `scripts/create-users.ts` (credentials land in gitignored `.env.credentials`,
  never in chat/logs).
- **AI providers**: Azure Translator F0 = translation; Gemini = enrichment —
  in-app ("AI enrich" on the card page; keys are Vercel env vars since June 9)
  and bulk local scripts. Prompts are Spanish-tuned: don't enrich non-`es`
  decks (e.g. Ari's Japanese deck) until that's generalized.

## Stack Gotchas
- **Next.js pinned to 16.2.8** — npm `latest` tag is the 16.3 preview, which has
  no win32 SWC binary (build fails on this machine). Check before bumping.
- **Prisma 7**: connection URLs live in `prisma.config.ts`, not `schema.prisma`.
  Runtime client needs the `@prisma/adapter-pg` driver adapter. Generated client
  is at `lib/generated/prisma` (gitignored; `postinstall` regenerates). Model
  types are exported as `CardModel`/`DeckModel` from `lib/generated/prisma/models`.
- **DB password contains `/` and `#`** — must stay URL-encoded (`%2F`, `%23`) in
  connection strings. Real secrets go in `.env` only; `.env.example` is committed
  and must hold placeholders.
- **react-hooks v6 lint** (enforced): no sync setState inside `useEffect` (use the
  derived-state-in-render pattern or `useSyncExternalStore`), no component
  definitions inside render, no ref reads during render.
- **Schema changes**: `npm run db:push` (no migration files by design).
- **Stats timezone**: review-day grouping and streaks use `America/Chicago`
  (`APP_TZ` in `lib/stats.ts`).
- **Gemini free tier**: this account caps `gemini-2.5-flash` at ~20 req/day; for
  bulk runs use `GEMINI_MODEL=gemini-2.5-flash-lite GEMINI_BATCH=40`. Enrichment
  is resumable (processes `enrichedAt IS NULL`; translations `translation IS NULL`).
- **OneDrive**: project lives inside OneDrive — `mv`/`rm` on recently-written
  folders can fail with "Device or resource busy"; retry or copy+delete.
- **Windows orphan servers**: stopped background `next start` tasks can leave the
  port held. Free it: find PID via `netstat -ano | grep :3457`, then `taskkill //F //PID`.

## Development Principles (Pragmatic Programmer)
- **TDD**: new behavior and bug fixes start with a failing vitest unit test
  (red → green → refactor). Reproduce a bug in a test before fixing it.
- **Modularity**: keep logic pure and in `lib/` so it's testable without DB or UI
  (e.g. `lib/filters.ts`, `lib/study.ts`); components and server actions stay thin.
- **Tracer bullets**: ship a thin end-to-end slice first (schema → lib → action →
  UI → smoke test), then flesh it out — don't build layers in isolation.

## Testing
- `npm test` — vitest units (srs, import parsers, filters, speech, greeting…).
- `npx tsx scripts/study-smoke.ts` — Playwright e2e (server on port 3457; signs
  in with `E2E_EMAIL`/`E2E_PASSWORD`); asserts review rows, FSRS mutation,
  Again re-queue.
- `npx tsx scripts/isolation-smoke.ts` — cross-tenant regression (server on
  3457; secondary login from `.env.credentials`): own decks visible, foreign
  decks invisible + 404. Run after touching queries or auth scoping.
- `npx tsx scripts/ai-smoke.ts` — one tiny request per AI provider.
- `npx tsx scripts/prod-smoke.ts` — login + live-data check against production.

## Data Notes
- Cards were imported once from the Notion export (CSV + per-page MD files) in
  `Downloads/38bec63f-…-Part-1/`; join key is (term from MD H1, Stage) — MD
  filenames are truncated, never use them. Import scripts are one-off; the in-app
  CSV/TSV import wizard lives at `/decks/import` (`lib/import/deckCsv.ts` +
  `lib/actions/import.ts`; template at `public/lexadeck-import-template.csv`).
- Notion MD parsing lesson: use `[ \t]` not `\s` in line-anchored regexes — `\s`
  matches newlines and slurps the next line on empty fields.
- Grammar Rules cards (`wordType: GRAMMAR`, ~172) intentionally have no
  translation/example/emoji — their `notes` field is the content.
