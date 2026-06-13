"use client";

import { useState, useTransition } from "react";
import { conjugateVerb } from "@/lib/actions/cards";
import { CONJ_GROUPS, type ConjTable } from "@/lib/conjugation";
import { Button } from "@/components/ui/Button";

/**
 * "Show all tenses" for a verb card. If the full table is already cached on the
 * card it expands instantly; otherwise the first open generates it (AI for the
 * simple forms, compounds derived in code) and caches it on the card.
 */
export function ConjugationPanel({
  cardId,
  initialTable,
}: {
  cardId: string;
  initialTable?: ConjTable;
}) {
  const [table, setTable] = useState<ConjTable | undefined>(initialTable);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function generate() {
    setError(null);
    start(async () => {
      const res = await conjugateVerb(cardId);
      if (res.error || !res.table) {
        setError(res.error ?? "No conjugation returned");
        return;
      }
      setTable(res.table);
      setOpen(true);
    });
  }

  return (
    <div className="border-t border-soft px-6 py-5">
      {!table ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" disabled={pending} onClick={generate}>
            {pending ? "Conjugating…" : "Show all tenses"}
          </Button>
          {error && <span className="text-sm font-bold text-coral">{error}</span>}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="label-caps flex items-center gap-2 text-muted hover:text-ink"
            aria-expanded={open}
          >
            <span className="inline-block w-3">{open ? "▾" : "▸"}</span>
            All tenses
          </button>
          {open && <ConjugationTable table={table} />}
        </>
      )}
    </div>
  );
}

function ConjugationTable({ table }: { table: ConjTable }) {
  return (
    <div className="mt-5 space-y-6">
      <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
        <NonFinite label="Infinitive" value={table.infinitive} />
        <NonFinite label="Gerund" value={table.gerund} />
        <NonFinite label="Participle" value={table.participle} />
      </div>

      {CONJ_GROUPS.map((group) => (
        <div key={group.mood}>
          <p className="label-caps mb-3 text-ink">{group.mood}</p>
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.tenses.map((t) => {
              const forms = table[t.key] as string[];
              return (
                <div key={t.key}>
                  <p className="mb-1 text-xs font-bold tracking-wide text-muted uppercase">
                    {t.label}
                  </p>
                  <dl className="text-sm">
                    {t.persons.map((person, i) => (
                      <div
                        key={person}
                        className="flex items-baseline justify-between gap-3 border-b border-soft/60 py-0.5 last:border-0"
                      >
                        <dt className="text-muted">{person}</dt>
                        <dd className="text-right font-medium">{forms?.[i] || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function NonFinite({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="label-caps mr-2 text-muted">{label}</span>
      <span className="font-semibold">{value || "—"}</span>
    </span>
  );
}
