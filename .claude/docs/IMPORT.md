# Import Pipeline

The in-app import wizard (`/decks/import`, `components/import/ImportWizard.tsx`)
accepts three input formats — **CSV/TSV**, Anki **`.txt`** ("Notes in Plain
Text"), and Anki **`.apkg`** (an AnkiWeb deck download). They all funnel into one
**canonical CSV** that the unchanged server action validates.

## The funnel

```
CSV / TSV ─────────────────────────────────┐
Anki .txt ─→ AnkiSource ─→ sourceToCsv ─────┤
Anki .apkg ─→ AnkiSource ─→ sourceToCsv ────┤
                                            ▼
                            canonical CSV (hidden field)
                                            ▼
              importCards (lib/actions/import.ts)  ← UNCHANGED
                                            ▼
              parseDeckCsv  → preview / dedup / commit
```

The Anki formats are normalized **client-side** into the canonical CSV the CSV
path already produces, so `lib/actions/import.ts` never had to learn about Anki.

## Canonical CSV — `lib/import/deckCsv.ts`

The contract everything funnels into. `parseDeckCsv(text)`:

- Sniffs delimiter (comma / semicolon / tab) via PapaParse; strips a UTF-8 BOM.
- Matches headers through flexible **aliases** (`headerToField` — `Front`→term,
  `Back`→translation, `Part of Speech`→wordType, …). Only **Term** is required.
- Coerces word type / gender / card type, enforces field length caps, drops gender
  on non-nouns, and de-dups terms (case-insensitive, NFC).
- `headerToField` is exported so the Anki mapping reuses the same aliases.
- A downloadable starter template lives at `public/lexadeck-import-template.csv`
  (the import page's "Template" button).

## Anki `.txt` — `lib/import/anki.ts`

Anki "Notes in Plain Text" leads with `#` directives (`#separator:tab`,
`#html:true`, optional `#columns:…`, `#tags|guid|notetype|deck column:N`) and
usually has **no header row**, so `parseDeckCsv` alone rejects it.

- `isAnkiExport(text)` detects the directive header.
- `parseAnkiText(text)` → an **`AnkiSource`** = `{ fieldNames, rows, html,
  ignoreColumns }` — the shared model both Anki paths produce.
- `stripAnkiHtml` removes tags / `<br>` / entities / `[sound:]` / `<img>`.

## Anki `.apkg` — `lib/import/apkg.ts` (client-only, lazy)

An `.apkg` is a ZIP holding a SQLite "collection". Parsed entirely in the browser
so the server action stays untouched; the heavy deps **dynamic-import only when an
`.apkg` is selected**:

- **`fflate`** unzips (filtered to the collection file — media is ignored).
- The collection is `collection.anki2` / `.anki21` (raw SQLite) or, for modern
  Anki 2.1.50+, `collection.anki21b` (zstd) — decompressed with **`fzstd`**.
- **`sql.js`** (WASM) reads the SQLite. `notes.flds` are field values joined by the
  unit separator `\x1f`; field names come from `col.models` (`ankiModelFields`) or,
  on the modern schema, the `fields` table. Result → `AnkiSource` via
  `buildAnkiSource`.
- Field names from the **note type the most notes use** (most decks have one).
- **Media (audio/images) is not imported.**

## Shared model → CSV — `lib/import/anki.ts`

- `analyzeSource(src)` → `AnkiAnalysis` (column count, sample rows) that drives the
  mapping UI.
- `defaultMapping(analysis)` pre-fills column→field from the Anki field names (via
  `headerToField`) or positionally, and guarantees a **Term**.
- `sourceToCsv(src, mapping)` applies the mapping, strips HTML when `src.html`,
  joins multiple columns mapped to one field with newlines, and emits canonical CSV
  (`Papa.unparse`). `ankiToCsv(text, mapping)` is the `.txt` convenience wrapper.

## Wizard UI — `components/import/ImportWizard.tsx`

On file pick: detect `.apkg` (parse in the browser, with loading/error states) vs
text (`.txt` Anki vs plain CSV). Anki sources render a **column-mapping step** — a
field `<Select>` per column, pre-filled, requiring a Term — and submit the derived
canonical CSV through the existing hidden `csvText` field. Plain CSV passes straight
through.

## Gotchas

- **sql.js WASM** is self-hosted at `public/sql-wasm.wasm` (`locateFile`), and the
  package resolves its **`browser`** export so it bundles without Node polyfills.
- The note field separator is `\x1f` (unit separator), not a comma/tab.
- `.apkg` decks with multiple note types: only the dominant model's field names are
  used; rows from other note types still import but may not align perfectly.

## Extending

A new source format only needs to produce an **`AnkiSource`** (or directly a
canonical CSV) — the mapping UI, `sourceToCsv`, and the server action come for free.
