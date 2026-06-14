"use client";

import { useActionState, useState } from "react";
import { importCards, type ImportState } from "@/lib/actions/import";
import {
  ANKI_FIELD_OPTIONS,
  analyzeAnki,
  ankiToCsv,
  defaultMapping,
  isAnkiExport,
  stripAnkiHtml,
  type AnkiAnalysis,
  type AnkiFieldChoice,
  type AnkiMapping,
} from "@/lib/import/anki";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

/** One-line, HTML-free preview of an Anki cell for the mapping UI. */
function sampleText(raw: string | undefined, html: boolean): string {
  if (!raw) return "—";
  const text = (html ? stripAnkiHtml(raw) : raw).replace(/\s+/g, " ").trim();
  if (!text) return "—";
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

export interface DeckOption {
  id: string;
  name: string;
}

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="border-r border-soft px-5 py-3 last:border-r-0">
      <div className={`tnum text-2xl font-extrabold ${accent ? "text-coral" : ""}`}>
        {value.toLocaleString()}
      </div>
      <div className="label-caps text-muted">{label}</div>
    </div>
  );
}

export function ImportWizard({
  decks,
  initialDeckId,
}: {
  decks: DeckOption[];
  initialDeckId?: string;
}) {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(importCards, {});
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [anki, setAnki] = useState<AnkiAnalysis | null>(null);
  const [mapping, setMapping] = useState<AnkiMapping>([]);
  const [target, setTarget] = useState(
    initialDeckId && decks.some((d) => d.id === initialDeckId)
      ? initialDeckId
      : (decks[0]?.id ?? "new"),
  );
  const [lastMode, setLastMode] = useState<"preview" | "import">("preview");

  const { error, preview, result } = state;

  // Anki exports get mapped to the canonical CSV the server already understands;
  // plain CSV/TSV passes straight through.
  const submittedCsv = anki ? ankiToCsv(csvText, mapping) : csvText;
  const hasTerm = !anki || mapping.includes("term");
  const ready = !!csvText && hasTerm;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter;
        setLastMode(submitter?.getAttribute("value") === "import" ? "import" : "preview");
      }}
    >
      {/* the file's text lives in React state — React 19 resets the (uncontrolled)
          file input after each action, so the hidden field is the source of truth */}
      <input type="hidden" name="csvText" value={submittedCsv} />
      <input type="hidden" name="fileName" value={fileName} />

      <div className="border-[1.5px] border-line">
        <label className="block border-b border-soft px-5 py-3.5">
          <span className="label-caps text-muted">CSV file</span>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                setCsvText(text);
                setFileName(file.name);
                if (isAnkiExport(text)) {
                  const analysis = analyzeAnki(text);
                  setAnki(analysis);
                  setMapping(defaultMapping(analysis));
                } else {
                  setAnki(null);
                  setMapping([]);
                }
              }}
              className="text-sm font-medium file:mr-3 file:cursor-pointer file:border-[1.5px] file:border-line file:bg-transparent file:px-3 file:py-1.5 file:text-[0.7rem] file:font-extrabold file:tracking-[0.08em] file:uppercase file:text-ink hover:file:bg-ink hover:file:text-bg"
            />
            {fileName && (
              <span className="label-caps text-muted">loaded · {fileName}</span>
            )}
          </div>
        </label>

        {anki && (
          <div className="border-b border-soft px-5 py-3.5">
            <div className="label-caps mb-1 text-muted">Anki export · map columns</div>
            <p className="mb-3 text-[0.8rem] font-medium text-muted">
              This file has no header row. Choose which field each column maps to —
              {anki.html ? " HTML is stripped automatically." : " values import as-is."}
            </p>
            <div className="space-y-2.5">
              {Array.from({ length: anki.columnCount }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">
                      {anki.fieldNames?.[i]?.trim() || `Column ${i + 1}`}
                    </div>
                    <div className="truncate text-[0.78rem] font-medium text-muted/80">
                      {sampleText(anki.sampleRows[0]?.[i], anki.html)}
                    </div>
                  </div>
                  <Select
                    aria-label={`Map column ${i + 1}`}
                    value={mapping[i] ?? "ignore"}
                    onChange={(e) =>
                      setMapping((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value as AnkiFieldChoice;
                        return next;
                      })
                    }
                    className="w-48 shrink-0"
                  >
                    {ANKI_FIELD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
            {!hasTerm && (
              <p className="mt-3 text-sm font-bold text-coral">
                Map one column to “Term” to continue.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2">
          <label className="block border-b border-soft px-5 py-3.5 sm:border-r">
            <span className="label-caps text-muted">Import into</span>
            <Select
              name="deck"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="mt-2 w-full"
            >
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
              <option value="new">+ new deck…</option>
            </Select>
          </label>

          <label className="block border-b border-soft px-5 py-3.5">
            <span className="label-caps text-muted">New deck name</span>
            <input
              name="newDeckName"
              disabled={target !== "new"}
              placeholder={
                target === "new"
                  ? fileName.replace(/\.[a-z0-9]+$/i, "") || "Spanish 101"
                  : "—"
              }
              className="mt-1.5 block w-full bg-transparent text-lg font-medium outline-none placeholder:text-muted/60 disabled:opacity-40"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <Button
            type="submit"
            name="mode"
            value="preview"
            variant="outline"
            disabled={pending || !ready}
          >
            {pending && lastMode === "preview" ? "Checking…" : "Preview"}
          </Button>
          <Button type="submit" name="mode" value="import" disabled={pending || !ready}>
            {pending && lastMode === "import" ? "Importing…" : "Import"}
          </Button>
          {!csvText && <span className="label-caps text-muted">choose a file to begin</span>}
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-bold text-coral">{error}</p>}

      {preview && !result && (
        <section className="mt-6 border-[1.5px] border-line">
          <div className="border-b border-line px-5 py-3">
            <h2 className="label-caps">
              preview · {preview.fileName} → {preview.deckName}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4">
            <Stat label="rows" value={preview.totalRows} />
            <Stat label="will import" value={preview.importable} />
            <Stat label="already in deck" value={preview.deckDuplicateTotal} />
            <Stat label="invalid" value={preview.issueTotal} accent={preview.issueTotal > 0} />
          </div>

          {preview.deckDuplicateTotal > 0 && (
            <div className="border-t border-soft px-5 py-3.5">
              <div className="label-caps mb-1 text-muted">skipped — already in deck</div>
              <p className="text-sm font-medium text-muted">
                {preview.deckDuplicates.join(", ")}
                {preview.deckDuplicateTotal > preview.deckDuplicates.length &&
                  ` … and ${preview.deckDuplicateTotal - preview.deckDuplicates.length} more`}
              </p>
            </div>
          )}

          {preview.issueTotal > 0 && (
            <div className="border-t border-soft px-5 py-3.5">
              <div className="label-caps mb-2 text-muted">skipped rows</div>
              <table className="w-full text-sm">
                <tbody>
                  {preview.issues.map((issue) => (
                    <tr key={issue.row} className="border-b border-soft last:border-b-0">
                      <td className="tnum w-16 py-1.5 pr-4 text-muted">row {issue.row}</td>
                      <td className="py-1.5 pr-4 font-bold">{issue.term ?? "—"}</td>
                      <td className="py-1.5 text-muted">{issue.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.issueTotal > preview.issues.length && (
                <p className="mt-2 text-sm font-medium text-muted">
                  … and {preview.issueTotal - preview.issues.length} more
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {result && (
        <section className="mt-6 border-[1.5px] border-line">
          <div className="border-b border-line px-5 py-3">
            <h2 className="label-caps">import complete</h2>
          </div>
          <div className="px-5 py-4">
            <p className="text-lg font-bold">
              {result.created.toLocaleString()} card{result.created === 1 ? "" : "s"} imported
              into {result.deckName}
            </p>
            {(result.skippedDuplicates > 0 || result.skippedInvalid > 0) && (
              <p className="mt-1 text-sm font-medium text-muted">
                Skipped {result.skippedDuplicates} duplicate
                {result.skippedDuplicates === 1 ? "" : "s"} and {result.skippedInvalid} invalid
                row{result.skippedInvalid === 1 ? "" : "s"}.
              </p>
            )}
            <div className="mt-4">
              <ButtonLink href={`/decks/${result.deckId}`}>Open deck →</ButtonLink>
            </div>
          </div>
        </section>
      )}
    </form>
  );
}
