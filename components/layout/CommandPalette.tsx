"use client";

import { useRouter } from "next/navigation";
import {
  ChartNoAxesColumn,
  CornerDownLeft,
  House,
  Layers,
  LibraryBig,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { searchCards, type SearchHit } from "@/lib/actions/search";
import { sanitizeEmoji } from "@/lib/emoji";

interface NavEntry {
  type: "nav";
  label: string;
  href: string;
  icon: typeof House;
}

interface CardEntry {
  type: "card";
  hit: SearchHit;
}

type Entry = NavEntry | CardEntry;

const NAV: NavEntry[] = [
  { type: "nav", label: "Home", href: "/", icon: House },
  { type: "nav", label: "Decks", href: "/decks", icon: Layers },
  { type: "nav", label: "Library", href: "/library", icon: LibraryBig },
  { type: "nav", label: "Progress", href: "/progress", icon: ChartNoAxesColumn },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navMatches = query
    ? NAV.filter((n) => n.label.toLowerCase().includes(query.toLowerCase()))
    : NAV;
  const entries: Entry[] = [...navMatches, ...hits.map((hit) => ({ type: "card" as const, hit }))];

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHits([]);
    setIndex(0);
  }, []);

  // global shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // debounced card search
  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setHits(query.trim().length >= 2 ? await searchCards(query) : []);
      setIndex(0);
    }, 200);
  }, [query, open]);

  function go(entry: Entry) {
    close();
    if (entry.type === "nav") router.push(entry.href);
    else router.push(`/decks/${entry.hit.deckId}/cards/${entry.hit.id}`);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-[14vh]"
      onClick={close}
    >
      <div
        className="w-full max-w-lg border-[1.5px] border-line bg-bg shadow-[8px_8px_0_0_var(--c-soft)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={16} className="shrink-0 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(entries.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter" && entries[index]) {
                e.preventDefault();
                go(entries[index]);
              }
            }}
            placeholder="Search cards or jump to…"
            className="h-12 w-full bg-transparent text-sm font-semibold outline-none placeholder:text-muted"
          />
          <kbd className="label-caps shrink-0 border border-soft px-1.5 py-0.5 text-muted">esc</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {entries.map((entry, i) => {
            const active = i === index;
            const base = `flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${
              active ? "bg-ink text-bg" : "hover:bg-soft/50"
            }`;
            if (entry.type === "nav") {
              const Icon = entry.icon;
              return (
                <button key={`nav-${entry.href}`} className={base} onClick={() => go(entry)} onMouseEnter={() => setIndex(i)}>
                  <Icon size={15} className={active ? "" : "text-muted"} />
                  <span className="font-bold">{entry.label}</span>
                  {active && <CornerDownLeft size={13} className="ml-auto" />}
                </button>
              );
            }
            // legacy rows may hold non-emoji values; never render tofu
            const emoji = sanitizeEmoji(entry.hit.emoji);
            return (
              <button key={entry.hit.id} className={base} onClick={() => go(entry)} onMouseEnter={() => setIndex(i)}>
                <span className="type-term">{entry.hit.term}</span>
                {emoji && <span>{emoji}</span>}
                <span className={`truncate text-[0.8rem] ${active ? "text-bg/70" : "text-muted"}`}>
                  {entry.hit.translation}
                </span>
                {active && <CornerDownLeft size={13} className="ml-auto shrink-0" />}
              </button>
            );
          })}
          {entries.length === 0 && (
            <p className="px-4 py-6 text-center text-sm font-semibold text-muted">No matches.</p>
          )}
        </div>
      </div>
    </div>
  );
}
