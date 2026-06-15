# AI Enrichment

How LexaDeck turns a bare term into a full card — translation plus AI-generated
metadata (gender, examples, etymology, synonyms, an inline conjugation summary,
and, where relevant, a pronunciation reading). As of PR #16 the whole stack is
**language-aware** instead of hard-wired to Spanish.

## Providers

- **Translation** — Azure Translator (F0 tier), with **DeepL as a fallback** when
  configured. Always translates the deck language → English.
- **Enrichment** — Google **Gemini**. One generic prompt, parameterized per
  language (below). Keys are Vercel env vars in prod; local scripts read `.env`.
- Gemini free tier caps `gemini-2.5-flash` at ~20 req/day on this account — for
  bulk runs use `GEMINI_MODEL=gemini-2.5-flash-lite GEMINI_BATCH=40`.

## Language profiles — `lib/ai/languages.ts`

Enrichment behavior is driven by a **profile registry**, not by `if (lang === "es")`.

- `LanguageProfile` captures everything that varies by language: Azure/DeepL
  directions, `gender` rule (whether nouns are gendered + allowed values), a
  `reading` rule (e.g. Japanese kana/romaji), a `conjugation` capability, and
  prompt phrasing examples (`usagePatternNote`, `synonymExample`).
- Registered languages: **`es` (Spanish), `ja` (Japanese), `de` (German)**.
- `getLanguageProfile(code)` → profile or `null`; `isEnrichable(code)` → boolean;
  `DEFAULT_PROFILE` = Spanish (keeps legacy callers' behavior).
- Coverage is an **explicit allowlist** — only languages with a profile here are
  enrichable. **Adding a language is a single registry entry.**

## Prompt + flow

- **`lib/ai/enrichmentPrompt.ts`** — one generic Gemini prompt builder fed by
  profile facts (language name, gender system, reading, verb/conjugation summary,
  synonym example). There is no per-language prompt.
- **`lib/ai/enrichment.ts`** — threads the resolved `profile` through
  `azureTranslate` / `deeplTranslate` / `translateBatch`, `geminiEnrich`, and
  `normalizeEnrichment` (gender is kept only for gendered languages).

## Card fields produced

- Core: `translation`, `gender` (gendered languages only), `example` + `exampleEn`,
  `emoji`.
- Rich `details` JSON (no schema change — see `lib/cardDetails.ts`): `usagePattern`,
  `collocations`, `etymology`, `wordFamily`, `synonyms`, `conjugationTable`, and
  **`reading`** (new in PR #16 — the kana/romaji shown under a Japanese term).
- **Conjugation** has two layers:
  - inline `conjugation` **summary** string — produced for verbs in **all**
    enrichable languages (es/ja/de), phrased per `profile.conjugation.summaryNote`.
  - structured **"all tenses" table** (`details.conjugationTable`, `ConjugationPanel`)
    — **Spanish-only in Phase 1** (`profile.conjugation.table`). The deck enrich
    panel / selection bar only offer "verb tables" when the language supports them.
    Japanese/German tables are Phase 2 (`lib/conjugation.ts`).

## Gating

Every entry point checks `isEnrichable(deck.language)` rather than `=== "es"`:
`lib/actions/cards.ts`, the deck page, the new-card page, the card detail page,
`EnrichPanel`, and `DeckSelectionBar`. Untuned-language decks simply don't show
enrichment affordances.

## Bulk enrichment — `scripts/enrich.ts`

Groups cards by deck language, enriches with each language's profile, and skips
untuned languages. **Resumable**: processes `enrichedAt IS NULL` (translations
`translation IS NULL`), so it's safe to re-run after hitting the Gemini quota.

## Gotchas

- **Synonym JSON keeps its historical `{es, en}` shape** for all languages — the
  `es` key now holds the *target-language* synonym (e.g. a German word), `en` its
  gloss. This avoids migrating existing Spanish cards; a rename is an optional
  separate migration.
- **Azure mistranslates a *lowercase* German verb** (`essen → "Food"`) because
  German nouns are capitalized — a translation-layer quirk, not enrichment; Gemini
  still enriches it correctly. Rare in practice.
- `reading` lives in `details`, so adding it required **no schema change**.

## Extending to a new language

Add one `LanguageProfile` entry to `lib/ai/languages.ts` (directions, gender,
reading, conjugation summary, prompt examples). That alone makes the language
enrichable end to end. A structured conjugation **table** additionally needs a
spec in `lib/conjugation.ts` and `conjugation.table: true`.
