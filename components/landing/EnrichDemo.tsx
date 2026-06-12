import { DEMO_ENRICH } from "@/lib/landing-demo";
import { wordTypeVar } from "@/lib/wordTypeColors";

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-52 flex-col border-[1.5px] border-line bg-bg">
      <div className="flex items-center gap-2 border-b border-soft px-3.5 py-2">
        <i className="h-2.5 w-2.5" style={{ background: wordTypeVar("NOUN") }} />
        <span className="label-caps text-muted">
          noun <em className="not-italic">· {DEMO_ENRICH.gender}</em>
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center px-4 py-4">{children}</div>
    </div>
  );
}

/** Before/after pair: what one click of "AI enrich" adds to a bare card. */
export function EnrichDemo() {
  const { term, enriched } = DEMO_ENRICH;
  return (
    <div className="grid items-stretch gap-4 sm:grid-cols-[1fr_auto_1fr]">
      <CardShell>
        <p className="type-term text-2xl leading-tight">{term}</p>
        <p className="mt-1.5 text-sm font-medium text-muted">—</p>
      </CardShell>

      <div className="flex items-center justify-center sm:flex-col">
        <span className="label-caps whitespace-nowrap border-[1.5px] border-line px-3 py-1.5 text-coral">
          AI enrich <span className="hidden sm:inline">→</span>
          <span className="sm:hidden">↓</span>
        </span>
      </div>

      <CardShell>
        <p className="type-term text-2xl leading-tight">
          {term}
          <span className="ml-2 text-xl">{enriched.emoji}</span>
        </p>
        <p className="mt-1.5 text-sm font-medium text-muted">{enriched.translation}</p>
        <div className="mt-3 border-l-2 border-line pl-3">
          <p className="text-sm font-medium">{enriched.example}</p>
          <p className="mt-0.5 text-xs text-muted">{enriched.exampleEn}</p>
        </div>
      </CardShell>
    </div>
  );
}
