<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LexaDeck — Agent Guidelines

## Project Overview
Swiss-typographic Spanish flashcard PWA. Next.js 16 + Supabase Postgres + FSRS
(`ts-fsrs` v5) scheduling. Single user (Lukas), password-gated.
Production: https://lexadeck.vercel.app (auto-deploys on push to `main`).
Supabase project: `kuoediscikartsdebdfo` (us-east-1, "Kucinski GIS" account — the
Supabase MCP must be authenticated against that account, not OSIT).

## Canonical Docs
- [Spec](.claude/docs/LEXADECK_SPEC.md) — architecture spec. **The v0.2 Amendments table at
  the top supersedes conflicting v0.1 sections below it** (design language, SRS, API style).
- `README.md` — setup, env vars, scripts.
- [Design System](.claude/docs/DESIGN_SYSTEM.md) — Swiss Typographic rules for all UI work.

## Architecture Decisions (do not relitigate)
- **No REST API routes.** RSC reads + Server Actions (`lib/actions/*`) only.
- **FSRS, not SM-2.** `lib/srs.ts` wraps ts-fsrs; short-term scheduler ON so
  "Again" cards re-enter the live session. Display states map in `getSRSState()`;
  mastered = Review state + stability ≥ 21d.
- **Native forms + `useActionState` + zod.** No React Hook Form. No Zustand.
- **Auth**: `proxy.ts` (Next 16 convention — NOT `middleware.ts`, that's deprecated).
  Gate disabled when `SITE_PASSWORD` is unset; smoke tests rely on
  `SITE_PASSWORD= npx next start -p 3457`.
- **AI providers**: Azure Translator F0 = translation; Gemini = enrichment;
  enrichment runs as local scripts only (keys are not Vercel env vars).

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
- `npm test` — vitest units for `lib/srs.ts` and `lib/import/notion.ts`.
- `npx tsx scripts/study-smoke.ts` — Playwright e2e (needs gate-disabled server
  on port 3457); asserts review rows, FSRS mutation, Again re-queue.
- `npx tsx scripts/ai-smoke.ts` — one tiny request per AI provider.
- `npx tsx scripts/prod-smoke.ts` — unlock + live-data check against production.

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
