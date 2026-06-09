"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
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

function toggleCsv(current: string | null, value: string): string | null {
  const parts = new Set((current ?? "").split(",").filter(Boolean));
  if (parts.has(value)) parts.delete(value);
  else parts.add(value);
  return parts.size ? [...parts].join(",") : null;
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

export function FilterPanel({ decks }: { decks?: DeckOption[] }) {
  const { searchParams, setParams } = useViewParams();
  const [open, setOpen] = useState(false);

  const types = searchParams.get("types");
  const genders = searchParams.get("genders");
  const srs = searchParams.get("srs");
  const ct = searchParams.get("ct");
  const ht = searchParams.get("ht");
  const deckSel = searchParams.get("decks");

  const activeCount =
    [types, genders, srs, ct, ht, deckSel].filter(Boolean).length;

  return (
    <div className="relative">
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
              {Object.values(WordType).map((wt) => (
                <CheckRow
                  key={wt}
                  checked={(types ?? "").includes(wt)}
                  onToggle={() => setParams({ types: toggleCsv(types, wt) })}
                  swatch={wordTypeVar(wt)}
                  label={WORD_TYPE_LABELS[wt]}
                />
              ))}
            </div>

            <div className="space-y-5">
              <div>
                <p className="label-caps mb-2 text-muted">SRS state</p>
                {(Object.keys(SRS_STATE_LABELS) as SRSState[]).map((s) => (
                  <CheckRow
                    key={s}
                    checked={(srs ?? "").includes(s)}
                    onToggle={() => setParams({ srs: toggleCsv(srs, s) })}
                    swatch={srsStateVar(s)}
                    label={SRS_STATE_LABELS[s]}
                  />
                ))}
              </div>
              <div>
                <p className="label-caps mb-2 text-muted">Gender</p>
                {Object.values(Gender).map((g) => (
                  <CheckRow
                    key={g}
                    checked={(genders ?? "").includes(g)}
                    onToggle={() => setParams({ genders: toggleCsv(genders, g) })}
                    label={g.toLowerCase()}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <p className="label-caps mb-2 text-muted">Card type</p>
                {Object.values(CardType).map((c) => (
                  <CheckRow
                    key={c}
                    checked={(ct ?? "").includes(c)}
                    onToggle={() => setParams({ ct: toggleCsv(ct, c) })}
                    label={c.toLowerCase()}
                  />
                ))}
              </div>
              <div>
                <p className="label-caps mb-2 text-muted">Translation</p>
                <CheckRow
                  checked={ht === "yes"}
                  onToggle={() => setParams({ ht: ht === "yes" ? null : "yes" })}
                  label="has translation"
                />
                <CheckRow
                  checked={ht === "no"}
                  onToggle={() => setParams({ ht: ht === "no" ? null : "no" })}
                  label="missing translation"
                />
              </div>
              {decks && decks.length > 1 && (
                <div>
                  <p className="label-caps mb-2 text-muted">Deck</p>
                  {decks.map((d) => (
                    <CheckRow
                      key={d.id}
                      checked={(deckSel ?? "").includes(d.id)}
                      onToggle={() => setParams({ decks: toggleCsv(deckSel, d.id) })}
                      label={d.name}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {activeCount > 0 && (
            <button
              onClick={() =>
                setParams({ types: null, genders: null, srs: null, ct: null, ht: null, decks: null })
              }
              className="label-caps mt-5 border-t border-soft pt-3 text-coral"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
