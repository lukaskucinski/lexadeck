import { Download } from "lucide-react";
import { ImportWizard } from "@/components/import/ImportWizard";
import { PageHeader } from "@/components/layout/PageHeader";
import { prisma } from "@/lib/db";
import { MAX_IMPORT_ROWS } from "@/lib/import/deckCsv";

export const dynamic = "force-dynamic";

const FORMAT_ROWS: [column: string, required: string, values: string, example: string][] = [
  ["Term", "required", "The word or phrase to learn", "el perro"],
  ["Translation", "", "English meaning", "dog"],
  [
    "Word Type",
    "",
    "Noun · Verb · Adjective · Adverb · Pronoun · Article · Conjunction · Preposition · Expression · Grammar · Other",
    "Noun",
  ],
  ["Gender", "", "Masculine/M · Feminine/F · Neuter · Either — nouns only", "F"],
  ["Card Type", "", "Vocab · Grammar · Expression (inferred from word type if blank)", "Vocab"],
  ["Example", "", "Example sentence in Spanish", "El perro corre."],
  ["Example Translation", "", "English gloss of the example", "The dog runs."],
  ["Notes", "", "Usage notes — for grammar cards this is the main content", ""],
  ["Conjugation", "", "Free text", "hablo, hablas, habla…"],
  ["Emoji", "", "Shown on the card", "🐶"],
];

const STEPS: [title: string, body: string][] = [
  [
    "Get the template",
    "Download the CSV template, or export your own sheet — Excel: File → Save As → “CSV UTF-8”; Google Sheets: File → Download → .csv. Comma, semicolon and tab delimiters are all detected.",
  ],
  [
    "One row per card",
    "Only Term is required; every other column is optional. Familiar header names (Word, English, Part of Speech…) are recognized automatically.",
  ],
  [
    "Upload, preview, import",
    `Preview shows what will be imported before anything is written. Terms already in the target deck are skipped, invalid rows are reported with their row numbers, and files are capped at ${MAX_IMPORT_ROWS.toLocaleString()} rows.`,
  ],
];

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string }>;
}) {
  const [decks, sp] = await Promise.all([
    prisma.deck.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    searchParams,
  ]);

  return (
    <div className="max-w-3xl">
      <PageHeader title="import">
        <a
          href="/lexadeck-import-template.csv"
          download
          className="inline-flex h-10 items-center justify-center gap-2 border-[1.5px] border-line px-4 text-[0.78rem] font-extrabold tracking-[0.08em] text-ink uppercase transition-colors hover:bg-ink hover:text-bg"
        >
          <Download size={15} />
          Template
        </a>
      </PageHeader>

      <div className="mb-8 grid grid-cols-1 border-[1.5px] border-line sm:grid-cols-3">
        {STEPS.map(([title, body], i) => (
          <div
            key={title}
            className="border-b border-soft px-5 py-4 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
          >
            <div className="tnum mb-1.5 text-sm font-extrabold text-coral">
              0{i + 1}
            </div>
            <h2 className="mb-1 text-sm font-bold">{title}</h2>
            <p className="text-[0.8rem] font-medium text-muted">{body}</p>
          </div>
        ))}
      </div>

      <ImportWizard decks={decks} initialDeckId={sp.deck} />

      <section className="mt-10">
        <h2 className="label-caps mb-3 text-muted">column reference</h2>
        <div className="overflow-x-auto border-[1.5px] border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="label-caps px-5 py-2.5 font-extrabold">Column</th>
                <th className="label-caps px-2 py-2.5 font-extrabold">Required</th>
                <th className="label-caps px-2 py-2.5 font-extrabold">Values</th>
                <th className="label-caps px-2 py-2.5 pr-5 font-extrabold">Example</th>
              </tr>
            </thead>
            <tbody>
              {FORMAT_ROWS.map(([column, required, values, example]) => (
                <tr key={column} className="border-b border-soft align-top last:border-b-0">
                  <td className="px-5 py-2.5 font-bold whitespace-nowrap">{column}</td>
                  <td className="px-2 py-2.5">
                    {required && <span className="label-caps text-coral">{required}</span>}
                  </td>
                  <td className="px-2 py-2.5 font-medium text-muted">{values}</td>
                  <td className="px-2 py-2.5 pr-5 font-medium whitespace-nowrap">{example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
