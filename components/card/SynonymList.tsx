"use client";

import { useState } from "react";
import type { Synonym } from "@/lib/ai/enrichment";

/** Target-language synonyms; each reveals its direct English gloss on hover/focus/tap. */
export function SynonymList({ items }: { items: Synonym[] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2.5 text-sm">
      {items.map((s) => (
        <SynonymChip key={s.es} es={s.es} en={s.en} />
      ))}
    </div>
  );
}

function SynonymChip({ es, en }: Synonym) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="font-medium underline decoration-dotted decoration-muted underline-offset-4 hover:text-ink"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        aria-label={`${es}: ${en}`}
      >
        {es}
      </button>
      {open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap bg-ink px-2 py-1 text-xs font-medium lowercase text-bg"
        >
          {en}
        </span>
      )}
    </span>
  );
}
