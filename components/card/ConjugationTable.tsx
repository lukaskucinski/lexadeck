import type { ConjugationData } from "@/lib/conjugation";

/**
 * Renders a self-describing ConjugationData (headers + mood/tense groups) with
 * no language branching. Shared by the card page's ConjugationPanel and the
 * new-card form's "Generate all tenses" preview.
 */
export function ConjugationTable({ data }: { data: ConjugationData }) {
  return (
    <div className="mt-5 space-y-6">
      {data.headers.length > 0 && (
        <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
          {data.headers.map((h) => (
            <NonFinite key={h.label} label={h.label} value={h.value} />
          ))}
        </div>
      )}

      {data.groups.map((group, gi) => (
        <div key={group.mood || gi}>
          {group.mood && <p className="label-caps mb-3 text-ink">{group.mood}</p>}
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.tenses.map((t) => (
              <div key={t.label}>
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
                      <dd className="text-right font-medium">{t.forms?.[i] || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
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
