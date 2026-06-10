# LexaDeck Design System — Swiss Typographic

The user chose this direction from a 3-variant spike (see `design-spike/variant-c.html`
for the reference artifact). All new UI must follow these rules.

## Hard Rules
- **Zero border radius.** Everything is square. `--radius-*` is reset in `@theme`.
- **Borders are structure**: outer frames `border-[1.5px] border-line` (ink),
  internal dividers `border-soft`. No drop shadows on resting elements
  (offset "hard shadows" like `shadow-[6px_6px_0_0_var(--c-soft)]` are allowed
  for overlays: palette, drag ghosts).
- **One type family: Archivo** (variable, `wdth` axis), loaded in `app/layout.tsx`
  as `--font-archivo`.
- **Color is functional, never decorative.** Flat squares (`<i>` elements with
  inline `background`) encode word type and SRS state. No gradients, no tints
  except `bg-soft/30`-style hover washes.

## Tokens (app/globals.css)
- Semantic CSS vars `--c-*` switch with `[data-theme="dark"]`; Tailwind utilities
  are generated from them via `@theme inline` (`bg-bg`, `text-ink`, `text-muted`,
  `border-line`, `border-soft`, `bg-coral`, …).
- Word type → color map lives in `lib/wordTypeColors.ts` (`wordTypeVar()`,
  `srsStateVar()`). Never hardcode hex in components.

## Type Roles (utility classes in globals.css)
- `.type-display` — hero headings: 900 weight, wdth 122, lowercase, tight tracking.
- `.type-term` — card terms / titles: 850 weight, wdth 120, lowercase.
- `.label-caps` — structural labels: 0.66rem, 700, letterspaced uppercase.
- `.tnum` — tabular numerals wherever numbers align.

## Patterns in Use
- Page headers: `PageHeader` with index numbers ("01", "02·A") + `border-b-[3px]`.
- Stat blocks: bordered grid cells, huge `tnum` number + `label-caps` label below.
- Progress: **segmented meters** (flex of flat squares), not rings — Swiss = rational.
- Buttons: `components/ui/Button.tsx` variants (primary = ink fill that hovers
  coral; outline; ghost; danger). Uppercase, extrabold, tracked.
- Destructive actions: `ConfirmButton` two-click pattern, not modals.
- Heatmaps: `components/ui/Heatmap.tsx`, teal intensity via `color-mix`.
- Greeting/dashboard voice: lowercase Spanish ("buenas tardes, lukas.") with the
  name/period in coral.

## Motion
- Study card flip: Motion (`motion/react`) `rotateY`, 300ms easeInOut, real
  backface (`.preserve-3d` / `.backface-hidden` / `.perspective-1200` helpers).
- Card exit after rating: directional slide (left = Again/Hard, right = Good/Easy)
  + 180ms color wash overlay in the rating's color.
- Budget: no animation over 400ms in study mode; no bounce/elastic easing.
