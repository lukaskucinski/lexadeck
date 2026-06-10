"use client";

import { SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  CardType,
  Gender,
  SRS_STATE_LABELS,
  WORD_TYPE_LABELS,
  WordType,
  type SRSState,
} from "@/lib/types";
import { srsStateVar, wordTypeVar } from "@/lib/wordTypeColors";
import { useViewParams } from "./useViewParams";

interface DeckOption {
  id: string;
  name: string;
}

/**
 * Facet semantics: no URL param = every option checked (everything shows by
 * default); a CSV param = only those options checked; "none" = all unchecked
 * (matches nothing). The param disappears again when every box is re-checked.
 */
function selectedSet(current: string | null, all: readonly string[]): Set<string> {
  if (current == null) return new Set(all);
  if (current === "none") return new Set();
  return new Set(current.split(",").filter(Boolean));
}

function toggleValue(
  current: string | null,
  value: string,
  all: readonly string[],
): string | null {
  const selected = selectedSet(current, all);
  if (selected.has(value)) selected.delete(value);
  else selected.add(value);
  if (selected.size === 0) return "none";
  if (all.every((v) => selected.has(v))) return null;
  return all.filter((v) => selected.has(v)).join(",");
}

function CheckRow({
  checked,
  onToggle,
  swatch,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  swatch?: string;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-[3px] text-[0.8rem] font-semibold">
      <input type="checkbox" checked={checked} onChange={onToggle} className="peer sr-only" />
      <span
        className={`flex h-[15px] w-[15px] items-center justify-center border-[1.5px] border-line text-[10px] leading-none ${
          checked ? "bg-ink text-bg" : "bg-transparent"
        }`}
      >
        {checked ? "×" : ""}
      </span>
      {swatch && <i className="h-2.5 w-2.5" style={{ background: swatch }} />}
      <span className={checked ? "text-ink" : "text-muted"}>{label}</span>
    </label>
  );
}

const WORD_TYPE_VALUES = Object.values(WordType);
const SRS_VALUES = Object.keys(SRS_STATE_LABELS) as SRSState[];
const GENDER_VALUES = Object.values(Gender);
const CARD_TYPE_VALUES = Object.values(CardType);
const HT_VALUES = ["yes", "no"] as const;

export function FilterPanel({ decks }: { decks?: DeckOption[] }) {
  const { searchParams, setParams } = useViewParams();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const types = searchParams.get("types");
  const genders = searchParams.get("genders");
  const srs = searchParams.get("srs");
  const ct = searchParams.get("ct");
  const ht = searchParams.get("ht");
  const deckSel = searchParams.get("decks");

  const showDecks = !!decks && decks.length > 1;
  const deckIds = (decks ?? []).map((d) => d.id);

  const activeCount =
    [types, genders, srs, ct, ht, deckSel].filter(Boolean).length;

  // clicking off the panel (or Escape) dismisses it
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  const checkedIn = (param: string | null, value: string, all: readonly string[]) =>
    selectedSet(param, all).has(value);

  const uncheckAll = () => {
    setParams({
      types: "none",
      genders: "none",
      srs: "none",
      ct: "none",
      ht: "none",
      decks: showDecks ? "none" : null,
    });
  };

  const resetAll = () => {
    setParams({ types: null, genders: null, srs: null, ct: null, ht: null, decks: null });
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 items-center gap-2 border-[1.5px] border-line px-3.5 text-[0.68rem] font-extrabold tracking-[0.12em] uppercase transition-colors ${
          open || activeCount > 0 ? "bg-ink text-bg" : "text-muted hover:text-ink"
        }`}
      >
        <SlidersHorizontal size={14} />
        Filter{activeCount > 0 ? ` · ${activeCount}` : ""}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[620px] max-w-[88vw] border-[1.5px] border-line bg-bg p-5 shadow-[6px_6px_0_0_var(--c-soft)]">
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-3">
            <div>
              <p className="label-caps mb-2 text-muted">Word type</p>
              {WORD_TYPE_VALUES.map((wt) => (
                <CheckRow
                  key={wt}
                  checked={checkedIn(types, wt, WORD_TYPE_VALUES)}
                  onToggle={() => setParams({ types: toggleValue(types, wt, WORD_TYPE_VALUES) })}
                  swatch={wordTypeVar(wt)}
                  label={WORD_TYPE_LABELS[wt]}
                />
              ))}
            </div>

            <div className="space-y-5">
              <div>
                <p className="label-caps mb-2 text-muted">SRS state</p>
                {SRS_VALUES.map((s) => (
                  <CheckRow
                    key={s}
                    checked={checkedIn(srs, s, SRS_VALUES)}
                    onToggle={() => setParams({ srs: toggleValue(srs, s, SRS_VALUES) })}
                    swatch={srsStateVar(s)}
                    label={SRS_STATE_LABELS[s]}
                  />
                ))}
              </div>
              <div>
                <p className="label-caps mb-2 text-muted">Gender</p>
                {GENDER_VALUES.map((g) => (
                  <CheckRow
                    key={g}
                    checked={checkedIn(genders, g, GENDER_VALUES)}
                    onToggle={() => setParams({ genders: toggleValue(genders, g, GENDER_VALUES) })}
                    label={g.toLowerCase()}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <p className="label-caps mb-2 text-muted">Card type</p>
                {CARD_TYPE_VALUES.map((c) => (
                  <CheckRow
                    key={c}
                    checked={checkedIn(ct, c, CARD_TYPE_VALUES)}
                    onToggle={() => setParams({ ct: toggleValue(ct, c, CARD_TYPE_VALUES) })}
                    label={c.toLowerCase()}
                  />
                ))}
              </div>
              <div>
                <p className="label-caps mb-2 text-muted">Translation</p>
                <CheckRow
                  checked={checkedIn(ht, "yes", HT_VALUES)}
                  onToggle={() => setParams({ ht: toggleValue(ht, "yes", HT_VALUES) })}
                  label="has translation"
                />
                <CheckRow
                  checked={checkedIn(ht, "no", HT_VALUES)}
                  onToggle={() => setParams({ ht: toggleValue(ht, "no", HT_VALUES) })}
                  label="missing translation"
                />
              </div>
              {showDecks && (
                <div>
                  <p className="label-caps mb-2 text-muted">Deck</p>
                  {decks!.map((d) => (
                    <CheckRow
                      key={d.id}
                      checked={checkedIn(deckSel, d.id, deckIds)}
                      onToggle={() => setParams({ decks: toggleValue(deckSel, d.id, deckIds) })}
                      label={d.name}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-5 border-t border-soft pt-3">
            <button onClick={uncheckAll} className="label-caps text-muted hover:text-ink">
              Uncheck all
            </button>
            {activeCount > 0 && (
              <button onClick={resetAll} className="label-caps text-coral">
                Reset filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
