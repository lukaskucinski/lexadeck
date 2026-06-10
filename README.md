# lexadeck.

A Swiss-typographic Spanish flashcard studio. Next.js + Supabase Postgres + FSRS
(`ts-fsrs`) scheduling, populated from a Notion export, enriched via DeepL + Gemini.

Full design + architecture: [LEXADECK_SPEC.md](./.claude/docs/LEXADECK_SPEC.md)

## Setup

```bash
npm install                 # also runs prisma generate
cp .env.example .env        # fill in values (see below)
npm run dev
```

`.env` values:

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Supabase pooled connection (port 6543, `?pgbouncer=true`) — URL-encode special chars in the password |
| `DIRECT_URL` | Supabase session connection (port 5432) — used by `prisma db push` |
| `SITE_PASSWORD` | Gate password; unset disables the gate (local dev) |
| `AZURE_TRANSLATOR_KEY` / `_ENDPOINT` / `_REGION` | Azure AI Translator F0 — primary translation (2M chars/mo free) |
| `GEMINI_API_KEY` | Gemini API Free — example sentences + emoji |
| `DEEPL_API_KEY` + `ENABLE_DEEPL_FALLBACK` | Optional fallback translator (lifetime quota — off by default) |

## Scripts

```bash
npm test                # vitest (srs + import parser units)
npm run db:push         # sync prisma/schema.prisma to the database
npm run import:notion -- --dir "<notion-export-folder>" [--deck Español] [--force]
npm run enrich          # DeepL pass (translations) + Gemini pass (examples/emoji); resumable
npx tsx scripts/study-smoke.ts   # Playwright e2e against localhost:3457
```

## Stack notes

- **Prisma 7**: connection URLs live in `prisma.config.ts`, runtime client uses the
  `@prisma/adapter-pg` driver adapter; generated client is gitignored (`lib/generated/`)
- **No REST API** — Server Actions + RSC only
- **Auth** — Next 16 `proxy.ts` convention; SHA-256 cookie vs `SITE_PASSWORD`
- **Theme** — Tailwind v4 `@theme inline` tokens in `app/globals.css`, dark mode via `[data-theme]`
