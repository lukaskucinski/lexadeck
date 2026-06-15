# Card Views — Filter, Sort, View

The deck detail page (`/decks/[id]`) and the library (`/library`) share one
**URL-param view model** for which cards show, in what order, and how. Logic is
pure and lives in `lib/`; the RSC reads params and the client controls patch them.

## URL params (the source of truth)

| Param | Meaning |
|-------|---------|
| `view` | `kanban` \| `grid` \| `list` |
| `sort` / `dir` | sort field + direction |
| `page` | 1-based page |
| `q` | search (term/translation) |
| `types`, `genders`, `srs`, `ct`, `ht`, `decks` | filter facets (CSV; `none` = all-unchecked) |

- **`parseCardViewParams(searchParams)`** (`lib/queries.ts`) turns the URL into a
  typed `CardViewParams` ({ view, sort, dir, page, filters }). Both pages call it.
- **`useViewParams()`** (`components/card/useViewParams.ts`) is the client hook the
  controls use to patch params in place (`router.replace`, scroll preserved; most
  patches reset `page`).

## Filtering

- **`lib/filters.ts`** — pure facet helpers (`selectedSet`, `toggleValue`,
  `toggleAll`, `checkedCount`). No DB, fully unit-tested.
- **`buildCardWhere(filters)`** (`lib/queries.ts`) → Prisma `where`.
- **Neutrality rule (don't break this):** an absent facet *and* an all-unchecked
  facet (`none` / empty array) both add **no constraint**. "Uncheck all" is a blank
  slate the user rebuilds from — if an unrebuilt facet filtered, it would blank the
  whole view (a fixed board bug). SRS states combine as an OR.
- UI: `components/card/FilterPanel.tsx` (the "Filter" dropdown).

## Sorting

- **`lib/sort.ts`** — `SORT_OPTIONS`: six named choices that each bundle a field +
  direction so the dropdown reads as one clear option: **Recently added**
  (`createdAt desc`, the default), Oldest first, A→Z, Z→A, Due soonest, Word type.
  `activeSortOption(sort, dir)` finds the matching entry (or `undefined` for combos
  only reachable via list-column headers). Pure, unit-tested.
- **`cardOrderBy(sort, dir)`** (`lib/queries.ts`) → Prisma `orderBy`.
- **Default ordering is "Recently added" (`createdAt desc`)** — set in
  `parseCardViewParams` (PR #17 changed it from oldest-first), matching the
  dashboard's recent-cards widget.
- UI: `components/card/SortControl.tsx` (the "Sort" dropdown, beside Filter). The
  list view's column headers (`CardListTable` `SortHeader`) also toggle sort/dir.

## The three views

- **kanban** — `KanbanBoard`, cards grouped into fixed word-type columns; the
  chosen sort applies **within** each column (so a `wordType` sort is a no-op there).
  Sorting in kanban was wired up in PR #17 (it previously ignored the param).
- **list** — `CardListTable` (paged), with clickable sort headers.
- **grid** — `FlashCardPreview` tiles (paged).

## Gotchas

- Default sort is now `createdAt desc` everywhere these params are parsed — opening
  a deck shows newest cards first.
- Sorting happens in the **DB query** (`orderBy`), not client-side, so pagination
  slices stay correct.
- Kanban groups by `wordType`, so picking the "Word type" sort there changes nothing
  visible; other sorts reorder cards inside each column.
