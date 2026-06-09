# LexaDeck — Technical Specification v0.2

> A Swiss-typographic language studio: hard grids, oversized Archivo type,
> flat functional color, and fast, elegant review interactions.

---

## v0.2 Amendments (as built — supersede conflicting v0.1 sections below)

| # | Area | v0.1 | v0.2 (implemented) |
|---|---|---|---|
| 13 | Design language | Parchment Editorial (§8) | **Swiss Typographic** (design-spike variant C): bg `#FAFAF6`, ink `#16150F`, single family **Archivo** (variable wdth), zero border radius, 1.5px ink borders, flat functional color squares. §8 color/typography tables are historical |
| 14 | Hosting | Local SQLite | **Vercel + Supabase Postgres** (`kuoediscikartsdebdfo`, us-east-1) from day one |
| 15 | Auth (v1) | None | Shared-password gate: Next 16 `proxy.ts` + SHA-256 cookie; `/unlock` page; `SITE_PASSWORD` env |
| 16 | SRS | Hand-rolled SM-2 (§4) | **FSRS via `ts-fsrs` v5**, short-term scheduler on → "Again/Hard/Good" learning steps re-enter the live session (≤12 min window). §4 algorithm is historical |
| 17 | Data model | SM-2 fields | Card carries ts-fsrs card shape: `due, stability, difficulty, elapsedDays, scheduledDays, learningSteps, reps, lapses, state, lastReview` + new `example`, `exampleEn`, `enrichedAt` |
| 18 | API | REST routes (§5) | **Zero API routes** — RSC reads + Server Actions (`lib/actions/*`) |
| 19 | ORM | Prisma + SQLite | **Prisma 7** + Postgres: `prisma.config.ts`, driver adapter `@prisma/adapter-pg`, generated client in `lib/generated/prisma` |
| 20 | Styling | tailwind.config.ts tokens | **Tailwind v4** `@theme inline` in `globals.css`; theme switch via `[data-theme]` |
| 21 | Import | In-app CSV wizard (§10 UI) | **One-off scripts**: `scripts/import-notion.ts` reads the export folder (CSV + 1,013 MD pages), joins user translations from MD `- Answer:` lines on (term, stage), merges exact dupes. Result: 995 cards, 801 user-translated, 172 grammar rules. Import wizard UI → v2 |
| 22 | AI providers | Claude API (§7) | **Azure AI Translator F0** (primary ES→EN; 2M chars/mo recurring) + **Gemini API Free** (`gemini-2.5-flash`; examples, emoji; v2: explanations, hints, cloze). **DeepL** demoted to opt-in fallback (`ENABLE_DEEPL_FALLBACK` — Developer tier quota is lifetime, not monthly). `scripts/enrich.ts`, resumable, paced for free tiers. v2 adds `/api/flashcard/generate` + `language_ai_cache` + usage guardrails per `ai_api_recommendation_language_flashcards_azure_gemini.md` |
| 23 | Forms | React Hook Form | Native forms + `useActionState` + zod in server actions (RHF dropped — unneeded) |
| 24 | Session state | Zustand | Local component state in `StudySession` (Zustand dropped — unneeded) |
| 25 | Fonts | Playfair/Inter/Lora | **Archivo only** (display via `.type-display`/`.type-term` utility classes) |
| 26 | Backlog | — | All imported cards due immediately; 50-card session cap, ≤10 new interleaved |
| 27 | Extras | — | PWA manifest + icons, Cmd/Ctrl+K command palette, GitHub-style heatmaps, segmented mastery meters (no rings — Swiss) |

**Verification shipped:** 25 vitest unit tests (`lib/srs`, `lib/import/notion`) and a
Playwright e2e smoke (`scripts/study-smoke.ts`) covering session start → 4 ratings →
DB assertions (review rows, FSRS mutation, Again re-queue window).

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Tech Stack](#2-tech-stack)
3. [Data Model](#3-data-model)
4. [SRS Algorithm — SM-2](#4-srs-algorithm--sm-2)
5. [Application Routes & Pages](#5-application-routes--pages)
6. [Feature Spec — v1](#6-feature-spec--v1)
7. [Feature Spec — v2 (AI, Deferred)](#7-feature-spec--v2-ai-deferred)
8. [UI/UX Design System](#8-uiux-design-system)
9. [Component Inventory](#9-component-inventory)
10. [Import Spec — Notion CSV](#10-import-spec--notion-csv)
11. [Decision Log](#11-decision-log)

---

## 1. Product Vision

LexaDeck is a personal language flashcard system for adult learners — a simplified,
beautiful alternative to Anki for the web. It is built around a spaced repetition
system (SM-2), a Kanban-style organization view, and an expressive card design language.

**v1 scope:** Core card/deck management, all views, SM-2 study sessions, import from
Notion CSV. No AI features, no auth, single user.

**Later scope:** Supabase auth + multi-user, AI enrichment (translation, etymology,
sentence generation, image generation, story mode), text reader, multi-language support.

**Primary language:** Spanish (with data model designed for German and other languages).

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | TypeScript throughout |
| Database | SQLite via Prisma | `dev.db` in project root |
| ORM | Prisma | Easy swap to Supabase PostgreSQL later |
| Styling | Tailwind CSS | Custom design tokens in `tailwind.config.ts` |
| Animation | Framer Motion | Card flips, transitions, micro-interactions |
| State | Zustand | Lightweight client state (session, UI) |
| Forms | React Hook Form + Zod | Validation on all inputs |
| File parsing | PapaParse | CSV import |
| Icons | Lucide React | Consistent icon set |
| Fonts | Google Fonts (see §8) | Loaded via `next/font` |
| Date handling | date-fns | SRS interval calculations |
| Dev tooling | ESLint, Prettier, `tsx` | Standard Next.js defaults |

### Database migration path

The Prisma schema uses SQLite for v1. To migrate to Supabase (PostgreSQL) later:
1. Change `provider = "sqlite"` → `provider = "postgresql"` in `schema.prisma`
2. Update `DATABASE_URL` in `.env`
3. Run `prisma migrate dev`

All field types used are SQLite/PostgreSQL compatible. No SQLite-only types.

### File structure

```
lexadeck/
├── app/
│   ├── (main)/
│   │   ├── layout.tsx           # Shell with nav rail
│   │   ├── page.tsx             # Dashboard
│   │   ├── decks/
│   │   │   ├── page.tsx         # Deck list
│   │   │   ├── new/page.tsx     # Create deck
│   │   │   └── [id]/
│   │   │       ├── page.tsx     # Deck detail (Kanban/Grid/List view)
│   │   │       ├── edit/page.tsx
│   │   │       ├── study/page.tsx   # Study session
│   │   │       └── cards/
│   │   │           ├── new/page.tsx
│   │   │           └── [cardId]/
│   │   │               ├── page.tsx  # Card detail
│   │   │               └── edit/page.tsx
│   │   ├── library/page.tsx     # All cards, search + filter
│   │   ├── progress/page.tsx    # Stats, heatmap, history
│   │   └── import/page.tsx      # Import wizard
│   └── api/
│       ├── decks/
│       │   ├── route.ts         # GET list, POST create
│       │   └── [id]/
│       │       ├── route.ts     # GET, PUT, DELETE
│       │       └── cards/route.ts
│       ├── cards/
│       │   └── [id]/
│       │       ├── route.ts     # GET, PUT, DELETE
│       │       └── reviews/route.ts
│       ├── study/
│       │   ├── queue/route.ts   # GET due cards
│       │   └── review/route.ts  # POST submit review
│       └── import/
│           └── notion/route.ts
├── components/
│   ├── card/
│   ├── deck/
│   ├── study/
│   ├── layout/
│   ├── import/
│   └── ui/                      # Primitives (Button, Badge, Modal, etc.)
├── lib/
│   ├── db.ts                    # Prisma client singleton
│   ├── srs.ts                   # SM-2 pure functions
│   ├── import/
│   │   └── notion.ts            # Notion CSV parser + mapper
│   └── utils.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                  # Optional: seed with sample Spanish deck
├── styles/
│   └── globals.css
├── tailwind.config.ts
└── LEXADECK_SPEC.md
```

---

## 3. Data Model

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Deck {
  id          String   @id @default(cuid())
  name        String
  language    String   @default("es")   // ISO 639-1 code
  description String?
  accentColor String?                   // hex, e.g. "#315CFF" — per-deck identity color
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  cards    Card[]
  sessions Session[]
}

model Card {
  id       String @id @default(cuid())
  deckId   String
  deck     Deck   @relation(fields: [deckId], references: [id], onDelete: Cascade)

  // Core content
  term        String    // target-language word or phrase (required)
  translation String?   // English/native meaning (nullable; AI fills in v2)
  language    String    @default("es")

  // Classification
  cardType  String @default("VOCAB")   // VOCAB | GRAMMAR | EXPRESSION
  wordType  String @default("OTHER")   // see WordType enum below
  gender    String?                    // MASCULINE | FEMININE | NEUTER | EITHER | null

  // Enrichment fields
  notes       String?   // free-text description, grammar explanation, usage notes
  conjugation String?   // conjugation table as free text (structured in v2)
  emoji       String?   // associated emoji character
  imageUrl    String?   // AI-generated image URL (v2)
  audioUrl    String?   // pronunciation audio (v2)

  // SM-2 SRS state
  easeFactor  Float    @default(2.5)   // SM-2 E-factor, min 1.3
  interval    Int      @default(0)     // days until next review
  repetitions Int      @default(0)     // consecutive correct reviews
  nextReview  DateTime @default(now()) // when this card is next due
  lastReviewed DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  reviews Review[]
}

model Review {
  id        String   @id @default(cuid())
  cardId    String
  card      Card     @relation(fields: [cardId], references: [id], onDelete: Cascade)
  sessionId String?
  session   Session? @relation(fields: [sessionId], references: [id])

  quality        Int    // 0–5 SM-2 quality score
  reviewedAt     DateTime @default(now())
  intervalBefore Int    // interval before this review (days)
  intervalAfter  Int    // interval after this review (days)
  easeBefore     Float
  easeAfter      Float
}

model Session {
  id        String    @id @default(cuid())
  deckId    String?
  deck      Deck?     @relation(fields: [deckId], references: [id])
  startedAt DateTime  @default(now())
  endedAt   DateTime?
  cardCount Int       @default(0)

  reviews Review[]
}
```

### Enums (TypeScript, not Prisma — SQLite uses strings)

Define these in `lib/types.ts` and use them throughout the app:

```typescript
// lib/types.ts

export const CardType = {
  VOCAB:      "VOCAB",
  GRAMMAR:    "GRAMMAR",
  EXPRESSION: "EXPRESSION",
} as const;
export type CardType = typeof CardType[keyof typeof CardType];

export const WordType = {
  NOUN:        "NOUN",
  VERB:        "VERB",
  ADJECTIVE:   "ADJECTIVE",
  ADVERB:      "ADVERB",
  PRONOUN:     "PRONOUN",
  ARTICLE:     "ARTICLE",       // also covers conjunctions + prepositions
  CONJUNCTION: "CONJUNCTION",
  PREPOSITION: "PREPOSITION",
  EXPRESSION:  "EXPRESSION",
  GRAMMAR:     "GRAMMAR",
  OTHER:       "OTHER",
} as const;
export type WordType = typeof WordType[keyof typeof WordType];

export const Gender = {
  MASCULINE: "MASCULINE",
  FEMININE:  "FEMININE",
  NEUTER:    "NEUTER",
  EITHER:    "EITHER",
} as const;
export type Gender = typeof Gender[keyof typeof Gender] | null;

// SM-2 review button → quality score mapping
export const ReviewQuality = {
  AGAIN: 0,
  HARD:  3,
  GOOD:  4,
  EASY:  5,
} as const;
export type ReviewButton = keyof typeof ReviewQuality;
```

### SRS state helpers

Add a derived `srsState` field for display purposes:

```typescript
// lib/srs.ts (partial)

export type SRSState = "new" | "learning" | "due" | "scheduled" | "mastered";

export function getSRSState(card: {
  repetitions: number;
  interval: number;
  nextReview: Date;
}): SRSState {
  const now = new Date();
  if (card.repetitions === 0)            return "new";
  if (card.interval < 7)                 return "learning";
  if (card.nextReview <= now)            return "due";
  if (card.interval >= 21)              return "mastered";
  return "scheduled";
}
```

---

## 4. SRS Algorithm — SM-2

### Overview

SM-2 (SuperMemo 2) adjusts the review interval for each card based on recall quality.
Every card stores three values that persist across reviews: `easeFactor`, `interval`,
and `repetitions`.

### Algorithm

```typescript
// lib/srs.ts

export interface SM2Input {
  quality: 0 | 1 | 2 | 3 | 4 | 5; // 0=Again, 3=Hard, 4=Good, 5=Easy
  repetitions: number;
  easeFactor: number;
  interval: number;
}

export interface SM2Result {
  repetitions: number;
  easeFactor: number;
  interval: number;       // days
  nextReview: Date;
}

export function calculateSM2(input: SM2Input): SM2Result {
  const { quality, repetitions, easeFactor, interval } = input;

  let newRepetitions: number;
  let newInterval: number;
  let newEaseFactor: number;

  if (quality >= 3) {
    // Correct recall
    if (repetitions === 0)      newInterval = 1;
    else if (repetitions === 1) newInterval = 6;
    else                        newInterval = Math.round(interval * easeFactor);
    newRepetitions = repetitions + 1;
  } else {
    // Failed recall — reset
    newRepetitions = 0;
    newInterval = 1;
  }

  // Adjust ease factor (clamp to minimum 1.3)
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEaseFactor = Math.max(1.3, newEaseFactor);

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);
  nextReview.setHours(0, 0, 0, 0); // normalize to midnight

  return {
    repetitions: newRepetitions,
    easeFactor: newEaseFactor,
    interval: newInterval,
    nextReview,
  };
}
```

### Review button → quality mapping

| Button | Quality | Color | Behavior |
|--------|---------|-------|----------|
| Again  | 0       | Coral `#FF6B4A` | Resets card to interval=1 |
| Hard   | 3       | Amber `#FFB84C` | Passes but lowers ease factor |
| Good   | 4       | Blue  `#315CFF` | Standard correct recall |
| Easy   | 5       | Green `#14A76C` | Boosts ease factor |

### Study queue logic

When building the study queue for a deck session:
1. **Due cards** — `nextReview <= now`, sorted by `nextReview ASC` (oldest due first)
2. **New cards** — `repetitions === 0`, ordered by `createdAt ASC`
3. Interleave new cards: introduce at most `MAX_NEW_PER_SESSION` (default: 10) new cards
   per session, interspersed among due cards rather than shown as a block.
4. Hard cap: sessions are capped at `MAX_SESSION_SIZE` (default: 50 cards) to keep
   sessions feel manageable. Expose this as a user setting in v2.

---

## 5. Application Routes & Pages

### Route map

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Deck tiles, due counts, continue review CTA |
| `/decks` | Deck list | All decks in a grid |
| `/decks/new` | New deck | Create deck form |
| `/decks/[id]` | Deck detail | Card view: Kanban / Grid / List toggle |
| `/decks/[id]/edit` | Edit deck | Edit name, language, color |
| `/decks/[id]/study` | Study session | Full-screen SM-2 review mode |
| `/decks/[id]/cards/new` | New card | Add a card to the deck |
| `/decks/[id]/cards/[cardId]` | Card detail | Word detail page (dictionary entry style) |
| `/decks/[id]/cards/[cardId]/edit` | Edit card | Edit any card field |
| `/library` | Library | All cards across all decks, search + filter |
| `/progress` | Progress | Review heatmap, stats, history |
| `/import` | Import | Step-by-step import wizard |

### API routes

| Route | Method | Description |
|---|---|---|
| `/api/decks` | GET, POST | List all decks; create deck |
| `/api/decks/[id]` | GET, PUT, DELETE | Deck CRUD |
| `/api/decks/[id]/cards` | GET, POST | List cards in deck; add card |
| `/api/cards/[id]` | GET, PUT, DELETE | Card CRUD |
| `/api/cards/[id]/reviews` | GET | Card review history |
| `/api/study/queue` | GET | `?deckId=` — returns due + new cards for session |
| `/api/study/review` | POST | Submit a review, returns updated SM-2 state |
| `/api/import/notion` | POST | Parse Notion CSV, return preview; import on confirm |

---

## 6. Feature Spec — v1

### 6.1 Deck Management

- Create deck: name (required), language (default "es"), description, accent color picker
- Edit deck: all fields editable
- Delete deck: confirmation modal; cascades to all cards and reviews
- Deck list view: card tiles with accent color, card count, due count, last studied date
- Per-deck color: user picks an accent color on creation; used throughout that deck's UI
  as an identifier (tab color, card edge, header accent)

### 6.2 Card Management

**Create/edit card fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| term | string | Yes | The target-language word or phrase |
| translation | string | No | English/native meaning |
| cardType | enum | Yes | VOCAB \| GRAMMAR \| EXPRESSION |
| wordType | enum | Yes | See word type list |
| gender | enum | No | Only shown when wordType = NOUN |
| notes | textarea | No | Free-text description, grammar explanation |
| conjugation | textarea | No | Conjugation table as free text |
| emoji | string | No | Single emoji character picker |

Card creation should feel keyboard-first: Tab between fields, Enter to submit.
AI field assist buttons (stub out in v1 — show "AI" button as disabled/coming soon
to reserve UI space without breaking the layout plan).

### 6.3 Views — Deck Detail

Three view modes, toggled via a segmented control in the deck header.

#### Kanban View (default)
- Columns for each `wordType` present in the deck
- Column header: word type label + color + card count
- Cards render as compact `KanbanCard` components (~120px tall)
- Each card shows: term, translation (if present), SRS state badge
- Drag-and-drop between columns to reclassify word type (use `@dnd-kit/core`)
- Empty columns are hidden; "Add" button in each column header creates a card with
  that word type pre-selected
- Columns scroll independently; board scrolls horizontally

#### Grid View
- Responsive grid of `FlashCardPreview` tiles
- Sort options: Alphabetical | Date added | Next review | Word type
- Filter panel (see §6.5)
- Click card → Card detail page

#### List View
- Compact table: term | translation | type | gender | SRS state | next review
- Sortable columns
- Inline edit on double-click for term and translation fields
- Bulk select + delete
- Filter panel shared with Grid view

### 6.4 Study Mode

Study mode is full-screen and focused. No nav rail visible.

**Session initialization:**
1. Build queue via `/api/study/queue?deckId=[id]`
2. Show session preview: "X due, Y new cards"
3. User confirms → session begins

**Session screen layout:**
```
┌────────────────────────────────────────────────┐
│  ← Exit   Spanish Deck        [====----] 12/30  │
├────────────────────────────────────────────────┤
│                                                 │
│         ┌─────────────────────────┐             │
│         │  Spanish · Verb         │             │
│         │                         │             │
│         │       fallecer          │             │
│         │                         │             │
│         │    Tap to reveal ↓      │             │
│         └─────────────────────────┘             │
│                                                 │
│         [     Reveal Answer      ]              │
│                                                 │
└────────────────────────────────────────────────┘
```

**After reveal:**
```
┌────────────────────────────────────────────────┐
│  ← Exit   Spanish Deck        [====----] 12/30  │
├────────────────────────────────────────────────┤
│         ┌─────────────────────────┐             │
│         │  Spanish · Verb         │             │
│         │       fallecer          │             │
│         │  ────────────────────── │             │
│         │  to die (formal/literary│             │
│         │  Ex: El anciano         │             │
│         │  falleció ayer.         │             │
│         └─────────────────────────┘             │
│                                                 │
│  [  Again  ]  [  Hard  ]  [  Good  ]  [ Easy ] │
└────────────────────────────────────────────────┘
```

**Session end screen:**
- Cards reviewed, correct %, new cards introduced
- Breakdown by rating (Again/Hard/Good/Easy counts)
- "Review again" button (re-queues failed cards only)
- "Back to deck" button

**Card flip animation:**
- 3D CSS transform (`rotateY`) via Framer Motion
- Duration: 300ms, ease: `easeInOut`
- Front → back reveals translation, example, notes

**After rating:**
- Card slides off in direction of rating quality (left = Again, right = Easy)
- Next card slides in from opposite direction
- Small color wash overlay on card surface matching button color (200ms, 40% opacity)

### 6.5 Search & Filter

**Search** (Library page + Deck detail Grid/List views):
- Full-text search across `term` and `translation` fields
- Debounced 300ms
- Keyboard shortcut: `Cmd/Ctrl + K` opens command palette with search

**Filter panel** (collapsible side panel):
- Word type: multi-select checkboxes with color indicators
- Gender: MASCULINE / FEMININE / NEUTER / EITHER
- SRS state: New / Learning / Due / Scheduled / Mastered
- Card type: VOCAB / GRAMMAR / EXPRESSION
- Has translation: Yes / No
- Deck: (Library view only) multi-select

Active filters shown as dismissible chips below the search bar.

### 6.6 Import (Notion CSV)

See full import spec in §10. The UI is a 3-step wizard:

1. **Upload** — drag-and-drop or file picker, accepts `.csv`
2. **Preview** — shows detected columns, field mapping table, sample rows
   (first 10 cards), and summary counts by word type
3. **Confirm** — "Import N cards to [deck]" with deck selector (create new or
   add to existing)

On completion: success toast with card count, link to the deck.

### 6.7 Dark Mode

Toggle in top-right nav. Preference persisted to `localStorage`.
Use CSS variables with `data-theme` attribute on `<html>`. Both palettes defined in
§8 below.

---

## 7. Feature Spec — v2 (AI, Deferred)

All AI features use `claude-sonnet-4-20250514` via the Anthropic API.
Stub out the UI affordances in v1 (disabled buttons with "Coming soon" tooltip)
so the layout doesn't need to change in v2.

| Feature | Description |
|---|---|
| Auto-classify | Given a term, suggest word type + gender |
| Auto-translate | Fill translation field automatically |
| Example sentence | Generate a contextual example in the target language |
| Etymology | Explain word origin and roots |
| Grammar note | Explain relevant grammar rule for this word |
| Conjugation table | Generate full conjugation (structured, not free text) |
| AI image | Generate an image for NOUN/VERB/ADJECTIVE cards |
| Text reader | Paste a passage; highlight words to create cards or ask questions |
| Story mode | Generate a short story using only words from your deck |

All AI calls go through a thin `/api/ai/[action]` route layer — never call Anthropic
directly from the client.

---

## 8. UI/UX Design System

### 8.1 Design Philosophy

> A refined, colorful language studio: tactile, expressive, fast, and elegant.
> Warm paper surfaces. Vivid color tabs. Editorial typography. Tactile cards.
> Atlas-inspired progress visuals.

Not Duolingo (no mascots, no heavy gamification). Not Notion (no grey database panels).

### 8.2 Color Tokens

Define all colors as CSS custom properties in `globals.css` and map to Tailwind in
`tailwind.config.ts`.

**Light mode (`data-theme="light"` — default):**

```css
--color-bg:        #F7F0E6;   /* warm parchment */
--color-surface:   #FFF9EF;   /* card surface */
--color-text:      #1D1B18;   /* primary text */
--color-muted:     #6F675D;   /* secondary text */
--color-border:    #E5DDD0;   /* subtle borders */

--color-blue:      #315CFF;
--color-coral:     #FF6B4A;
--color-green:     #14A76C;
--color-purple:    #B45CFF;
--color-amber:     #FFB84C;
--color-teal:      #00BFA6;
--color-pink:      #FF4D94;   /* expressions */
--color-lavender:  #9B8FD4;   /* grammar/grammar rules */
```

**Dark mode (`data-theme="dark"`):**

```css
--color-bg:        #101014;
--color-surface:   #181820;
--color-text:      #F6F1E8;
--color-muted:     #A8A096;
--color-border:    #2A2830;

--color-blue:      #7C8CFF;
--color-coral:     #FF7A5C;
--color-green:     #38D996;
--color-purple:    #C084FC;
--color-amber:     #FFC857;
--color-teal:      #27E0C2;
--color-pink:      #FF6EAD;
--color-lavender:  #B8ACEC;
```

### 8.3 Word Type → Color Mapping

This mapping is used for kanban column headers, card edge tabs, badges, and filters.
Define it as a const in `lib/wordTypeColors.ts`:

| Word Type | Color Token | Use |
|---|---|---|
| VERB | `--color-blue` | Action |
| NOUN | `--color-coral` | Object |
| ADJECTIVE | `--color-purple` | Descriptor |
| ADVERB | `--color-teal` | Modifier |
| PRONOUN | `--color-amber` | Reference |
| ARTICLE | `--color-green` | Structure |
| CONJUNCTION | `--color-green` | Structure |
| PREPOSITION | `--color-green` | Structure |
| EXPRESSION | `--color-pink` | Phrase |
| GRAMMAR | `--color-lavender` | Rule |
| OTHER | `--color-muted` | Misc |

### 8.4 SRS State → Color Mapping

| SRS State | Color | Description |
|---|---|---|
| new | `--color-blue` | Never reviewed |
| learning | `--color-amber` | Interval < 7 days |
| due | `--color-coral` | Past due |
| scheduled | `--color-green` | Future review date |
| mastered | `--color-teal` | Interval ≥ 21 days |

### 8.5 Typography

Load via `next/font/google`:

```typescript
// Three typographic roles:

// 1. Display — target word/phrase on flashcard (large, expressive)
import { Playfair_Display } from "next/font/google";
// Usage: card term, word detail heading
// Size: 2.5rem–4rem depending on word length
// Weight: 700

// 2. Interface — navigation, labels, buttons, metadata
import { Inter } from "next/font/google";
// Usage: all UI chrome
// Size: 0.75rem–1rem
// Weight: 400, 500, 600

// 3. Content — example sentences, notes, translations
import { Lora } from "next/font/google";
// Usage: example sentences, notes, etymology
// Size: 1rem–1.125rem
// Weight: 400, 400 italic
```

Alternative display font if Playfair feels too formal: `Fraunces` (variable, optical
size axis makes it work at both large display and small caption sizes).

### 8.6 Flashcard Design

The flashcard is the central UI object. It should feel like a premium physical card.

**Front state:**
- Warm surface (`--color-surface`)
- Colored left-edge strip (4px, word type color)
- Top-left: small language tag + word type label in small caps
- Top-right: SRS state indicator dot
- Center: large display-type term (hero of the card)
- Bottom: "Tap to reveal" prompt in muted text
- Subtle paper texture via CSS (`background-image: url(/textures/paper.png)`, opacity ~3%)

**Revealed state (back):**
Opening a card should feel like a dictionary entry expanding:
- Translation (large, Lora serif)
- Horizontal rule
- Example sentence (if present)
- Notes / grammar explanation (collapsible if long)
- Conjugation snippet (if verb)
- Small metadata footer: repetitions, ease factor display, next review

**Flip animation:** `rotateY(180deg)` transform via Framer Motion, 300ms easeInOut.
The revealed content is on a `backface-visibility: hidden` back face — not a content swap.

**Card dimensions:** 
- Study mode: `max-w-md`, aspect ratio ~1.6:1 (landscape credit-card feel)
- Kanban compact: `w-full`, ~100px tall, no flip — click navigates to detail page

### 8.7 Surfaces and Texture

- Background: `--color-bg` (warm parchment)
- Cards/panels: `--color-surface` with `border: 1px solid var(--color-border)`
- Shadows: `box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)`
- Paper texture: subtle `noise.png` overlay at 2–3% opacity on card surfaces
- Elevated cards (hover): `translateY(-2px)` + slightly stronger shadow

No glassmorphism. No pure white. No heavy gradients.

### 8.8 Review Buttons

```
[  Again  ]  [  Hard  ]  [  Good  ]  [  Easy  ]
  coral        amber        blue        green
```

- Rounded corners: `border-radius: 8px`
- Height: 44px (touch-target safe)
- Keyboard shortcuts: `1` `2` `3` `4` (shown as small label below each button)
- After tap: subtle scale-down + color wash on card, then card exits

### 8.9 Navigation

Compact left rail on desktop; bottom tab bar on mobile (responsive breakpoint: 768px).

**Nav items:**
- 🏠 Home (Dashboard)
- 📚 Decks
- 🔍 Library
- 📊 Progress
- ＋ Add (FAB on mobile)
- ⚙️ Settings (bottom of rail)

Active state: colored left border strip + background highlight using deck/section color.
No large Notion-style sidebar. Rail is ~56px wide (icons only) with tooltip labels on hover.

### 8.10 Dashboard

The dashboard should feel like a vocabulary atlas — curated and alive, not a task manager.

**Elements:**
- Greeting: "Good morning, Lukas" (time-based, single user)
- Today's review summary: `[N] cards due across [M] decks`
- "Start Review" primary CTA button (opens study mode for highest-due deck)
- Deck tiles: grid of `DeckTile` components
  - Strong accent color header band
  - Deck name + language flag
  - Card count + due count
  - Mastery progress ring
  - Last studied label
- Activity heatmap: GitHub-style contribution grid (last 90 days of reviews)
- Recent additions: last 5 cards added, shown as small chips

**Visual motif:** Subtle topographic contour lines in the background of the progress
section — very low opacity, using the deck's accent color. Creates the "atlas" feeling
without being heavy.

### 8.11 Progress Page

- Review history heatmap (full year)
- Per-deck mastery breakdown (progress rings)
- SRS state distribution chart (stacked bar: new / learning / scheduled / mastered)
- Streak counter (days with at least one review)
- Total cards reviewed, total sessions
- "Most difficult" cards (lowest ease factor)
- "Ready to graduate" cards (longest interval, could be archived)

Avoid XP bars, coins, or badge systems. Data visualizations only.

### 8.12 Motion Guidelines

| Interaction | Animation | Duration |
|---|---|---|
| Card flip | `rotateY` 180° | 300ms easeInOut |
| Card exit after rating | `translateX` ±120% + `opacity` 0 | 250ms ease |
| Next card enter | `translateX` from ±60% + `opacity` | 250ms ease |
| Color wash on rating | background overlay fade | 180ms |
| Kanban column load | stagger children, `translateY` from 8px | 200ms, 30ms stagger |
| Page transition | `opacity` only | 150ms |
| Nav hover | left border grows | 120ms |
| Progress ring fill | svg `stroke-dashoffset` | 600ms easeOut on mount |

**No confetti. No celebration screens. No slow animations.**
Motion budget: total interaction overhead < 400ms in study mode.

---

## 9. Component Inventory

### Card components (`components/card/`)

| Component | Description |
|---|---|
| `FlashCard` | Full study card with flip animation. Props: `card`, `isRevealed`, `onReveal` |
| `FlashCardPreview` | Grid/deck view card thumbnail. No flip. Click → detail page |
| `KanbanCard` | Compact card for Kanban columns. Shows term, type badge, SRS dot |
| `CardDetailPanel` | Dictionary-entry style full card view (word detail page) |
| `CardForm` | Create/edit card form with all fields |

### Deck components (`components/deck/`)

| Component | Description |
|---|---|
| `DeckTile` | Dashboard tile with accent color, counts, progress ring |
| `DeckForm` | Create/edit deck form |
| `KanbanBoard` | Full kanban view for a deck. Manages columns + drag-and-drop |
| `KanbanColumn` | Single word-type column with header + card list |
| `ViewToggle` | Segmented control: Kanban / Grid / List |

### Study components (`components/study/`)

| Component | Description |
|---|---|
| `StudySession` | Full study session container. Manages queue, state, session |
| `ReviewButtons` | Again / Hard / Good / Easy button row |
| `SessionProgress` | Top progress bar + card counter |
| `SessionSummary` | End-of-session stats screen |
| `StudyQueuePreview` | Pre-session: X due, Y new cards |

### UI primitives (`components/ui/`)

| Component | Description |
|---|---|
| `Button` | Variants: primary, secondary, ghost, danger |
| `Badge` | `WordTypeBadge`, `GenderBadge`, `SRSStateBadge` |
| `Modal` | Accessible dialog wrapper |
| `Toast` | Success / error notifications |
| `ProgressRing` | SVG circular progress indicator |
| `Heatmap` | GitHub-style review activity grid |
| `FilterPanel` | Collapsible filter sidebar |
| `SearchBar` | Debounced search with keyboard shortcut |
| `ColorPicker` | Swatch grid for deck accent color selection |
| `LanguagePicker` | Dropdown for language selection (ISO codes) |
| `EmptyState` | Illustrated empty state panels (no cards, no decks, etc.) |
| `ConfirmModal` | Reusable destructive action confirmation |

### Layout components (`components/layout/`)

| Component | Description |
|---|---|
| `NavRail` | Desktop left navigation rail |
| `BottomNav` | Mobile bottom tab bar |
| `PageHeader` | Consistent page title + action row |
| `Shell` | Root layout wrapper (handles theme, nav, layout switch) |

### Import components (`components/import/`)

| Component | Description |
|---|---|
| `ImportWizard` | 3-step wizard container |
| `FileDropzone` | Drag-and-drop CSV upload area |
| `ImportPreview` | Column mapping table + sample rows |
| `ImportConfirm` | Final confirmation with deck selector |

---

## 10. Import Spec — Notion CSV

### Source file

Primary import file: `Flashcard_Database_*.csv` (the full database export from Notion).
The board view CSV (`Untitled_*.csv`) is a bare word list with no metadata — ignore it.

### Notion CSV schema

| Column | Type | Populated | Notes |
|---|---|---|---|
| Vocab Word | string | 1007/1007 | The target term |
| Audio | empty | 0/1007 | Always empty — ignore |
| Conjugation | string | 11/1007 | Free-text conjugation notes |
| Description | string | 247/1007 | Long-form notes or grammar explanation |
| Last Review | date string | 887/1007 | Format: "October 8, 2023" |
| Next Review | date string | 887/1007 | Format: "April 3, 2023" |
| Resource | empty | 0/1007 | Always empty — ignore |
| Stage | string | 1007/1007 | Word type category (see mapping below) |

### Stage → WordType + Gender mapping

| Notion Stage | LexaDeck WordType | Gender |
|---|---|---|
| Verbs | VERB | null |
| Nouns (Male) | NOUN | MASCULINE |
| Nouns Female | NOUN | FEMININE |
| Nouns (Either) | NOUN | EITHER |
| Adjectives | ADJECTIVE | null |
| Adverbs | ADVERB | null |
| Pronouns | PRONOUN | null |
| Articles Conjunctions Prepositions | ARTICLE | null |
| Expressions | EXPRESSION | null |
| Grammar Rules | GRAMMAR | null |

Stage → CardType mapping:
- `Grammar Rules` → cardType: `GRAMMAR`
- `Expressions` → cardType: `EXPRESSION`
- All others → cardType: `VOCAB`

### Field mapping

| Notion Column | LexaDeck Field | Transform |
|---|---|---|
| Vocab Word | `term` | Direct |
| Stage | `wordType` + `gender` + `cardType` | Via mapping table above |
| Description | `notes` | Direct (trim whitespace) |
| Conjugation | `conjugation` | Direct (trim whitespace) |
| Last Review | `lastReviewed` | Parse "Month D, YYYY" → Date \| null |
| Next Review | `nextReview` | Parse "Month D, YYYY" → Date; if past or same as lastReviewed, set to `now()` |
| Audio | — | Ignored |
| Resource | — | Ignored |

Fields absent in Notion → set to null on import: `translation`, `emoji`, `imageUrl`, `audioUrl`.

### SRS seeding on import

All 887 reviewed cards in this dataset have `Last Review === Next Review` (interval = 0),
meaning the Notion SRS was never active. Treat all cards as having clean SRS state:

| Condition | `repetitions` | `interval` | `easeFactor` | `nextReview` |
|---|---|---|---|---|
| Has Last Review date | 1 | 1 | 2.5 | now() |
| No dates (120 cards) | 0 | 0 | 2.5 | now() |

This means all cards arrive as "due now" — correct behavior, as the user has not
studied with a working SRS before.

### Import parser — `lib/import/notion.ts`

```typescript
import Papa from "papaparse";
import { STAGE_TO_WORD_TYPE } from "./mappings";

interface NotionRow {
  "Vocab Word": string;
  "Audio": string;
  "Conjugation": string;
  "Description": string;
  "Last Review": string;
  "Next Review": string;
  "Resource": string;
  "Stage": string;
}

export function parseNotionCSV(csvText: string): ParsedCard[] {
  const { data } = Papa.parse<NotionRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return data.map((row) => {
    const mapping = STAGE_TO_WORD_TYPE[row.Stage?.trim()] ?? {
      wordType: "OTHER",
      gender: null,
      cardType: "VOCAB",
    };

    const lastReviewed = parseNotionDate(row["Last Review"]);

    return {
      term:        row["Vocab Word"]?.trim(),
      translation: null,
      wordType:    mapping.wordType,
      gender:      mapping.gender,
      cardType:    mapping.cardType,
      notes:       row["Description"]?.trim() || null,
      conjugation: row["Conjugation"]?.trim() || null,
      lastReviewed,
      // All cards are due now — see SRS seeding note above
      nextReview:  new Date(),
      repetitions: lastReviewed ? 1 : 0,
      interval:    lastReviewed ? 1 : 0,
      easeFactor:  2.5,
    };
  });
}

function parseNotionDate(dateStr: string): Date | null {
  if (!dateStr?.trim()) return null;
  const parsed = new Date(dateStr.trim());
  return isNaN(parsed.getTime()) ? null : parsed;
}
```

### Import wizard behavior

1. **Upload step:** Accept `.csv` only. Validate that `Vocab Word` and `Stage` columns
   are present. Show error if not a recognized format.
2. **Preview step:** Display:
   - Detected format: "Notion Flashcard CSV"
   - Card count by word type (table matching the Notion Stage breakdown)
   - First 10 rows as a preview table with mapped fields
   - Warning if any rows have an unrecognized Stage value (will import as `wordType: OTHER`)
3. **Confirm step:**
   - Deck selector: radio between "Create new deck" (name field) and "Add to existing deck"
   - Import button triggers POST to `/api/import/notion`
   - Success: toast "1,007 cards imported to [Deck Name]", redirect to deck Kanban view

### Future import formats (v2)

| Format | Notes |
|---|---|
| Generic CSV | User maps columns to LexaDeck fields via UI |
| Anki `.apkg` | SQLite inside a zip; extract `cards` and `notes` tables |
| Duolingo export | JSON via browser extension or official export |
| Plain word list | One word per line → auto-classify with AI |

---

## 11. Decision Log

Decisions made during spec, with rationale:

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Kanban column axis | Word type | Matches existing Notion workflow; learning stage kanban is a separate concept (SRS state) |
| 2 | SRS algorithm | SM-2 | Standard algorithm; existing Next Review dates can seed it; sufficient precision for daily use |
| 3 | Review buttons | 4 (Again/Hard/Good/Easy) | Standard Anki vocabulary; matches SM-2 quality 0/3/4/5 mapping cleanly |
| 4 | Grammar Rules | Unified card type (cardType enum) | 17% of deck; `GRAMMAR` card type changes render style but not data model; avoids two separate systems |
| 5 | Noun gender | Single NOUN wordType + gender attribute | Cleaner for multi-language future; German has three genders |
| 6 | Persistence | SQLite via Prisma | Clean migration path to Supabase; real file, not browser storage |
| 7 | Auth | None in v1 | Single user; bolt on Supabase auth in v2 |
| 8 | AI features | All deferred to v2 | Stub UI buttons in v1 to preserve layout |
| 9 | Language scope | Spanish in v1, multi-language ready | `language` field on both Deck and Card from day one |
| 10 | Import source | Notion CSV (full database file) | Board view CSV has no metadata; database CSV has all 1,007 cards with full fields |
| 11 | Notion SRS state | Discard; seed all cards as due now | All 887 reviewed cards had interval=0 (SRS never ran); clean slate is correct |
| 12 | Session size cap | 50 cards max, 10 new max | Prevents overwhelming sessions; configurable in v2 settings |

---

*End of LexaDeck Spec v0.1 — generated for Claude Code session*
