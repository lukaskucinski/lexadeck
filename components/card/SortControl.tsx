"use client";

import { ArrowUpDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CardSort } from "@/lib/queries";
import { SORT_OPTIONS, activeSortOption } from "@/lib/sort";
import { useViewParams } from "./useViewParams";

const SORT_KEYS = ["term", "createdAt", "due", "wordType"] as const;

/** Sort dropdown shown alongside the Filter control across all card views. */
export function SortControl() {
  const { searchParams, setParams } = useViewParams();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // mirror parseCardViewParams: default ordering is createdAt desc
  const sort: CardSort = SORT_KEYS.find((s) => s === searchParams.get("sort")) ?? "createdAt";
  const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";
  const active = activeSortOption(sort, dir);

  // clicking off the panel (or Escape) dismisses it — same pattern as FilterPanel
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Sort cards"
        className={`flex h-9 items-center gap-2 border-[1.5px] border-line px-3.5 text-[0.68rem] font-extrabold tracking-[0.12em] uppercase transition-colors ${
          open ? "bg-ink text-bg" : "text-muted hover:text-ink"
        }`}
      >
        <ArrowUpDown size={14} />
        {active ? active.label : "Sort"}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 border-[1.5px] border-line bg-bg p-2 shadow-[6px_6px_0_0_var(--c-soft)]">
          {SORT_OPTIONS.map((o) => {
            const isActive = o.sort === sort && o.dir === dir;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setParams({ sort: o.sort, dir: o.dir });
                  setOpen(false);
                }}
                className={`block w-full px-2.5 py-1.5 text-left text-[0.8rem] font-semibold transition-colors ${
                  isActive ? "bg-ink text-bg" : "text-muted hover:text-ink"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
