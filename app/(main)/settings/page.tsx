import { PageHeader } from "@/components/layout/PageHeader";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { MAX_NEW_PER_SESSION, MAX_SESSION_SIZE } from "@/lib/study";
import { MASTERED_STABILITY_DAYS } from "@/lib/srs";

export const dynamic = "force-dynamic";

/**
 * Settings & account reference page (board item: "user account section…
 * options don't have to be wired — reference for future versions").
 * Appearance is live; the rest documents current behavior and reserves
 * the layout for v2 (Supabase auth + per-user preferences).
 */

function Section({
  title,
  children,
  v2 = false,
}: {
  title: string;
  children: React.ReactNode;
  v2?: boolean;
}) {
  return (
    <section className="border-[1.5px] border-line">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="label-caps">{title}</h2>
        {v2 && (
          <span className="label-caps border border-soft px-2 py-0.5 text-muted">
            v2 · not wired
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-soft px-5 py-3.5 last:border-b-0">
      <div>
        <div className="text-sm font-bold">{label}</div>
        {hint && <div className="mt-0.5 text-[0.74rem] font-medium text-muted">{hint}</div>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function StaticValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="tnum border-[1.5px] border-soft px-3 py-1.5 text-sm font-bold text-muted">
      {children}
    </span>
  );
}

function ProviderDot({ configured }: { configured: boolean }) {
  return (
    <span className="label-caps inline-flex items-center gap-2 text-muted">
      <i
        className="h-2.5 w-2.5"
        style={{ background: configured ? "var(--c-green)" : "var(--c-coral)" }}
      />
      {configured ? "configured" : "not configured"}
    </span>
  );
}

export default function SettingsPage() {
  const azure = Boolean(process.env.AZURE_TRANSLATOR_KEY && process.env.AZURE_TRANSLATOR_REGION);
  const gemini = Boolean(process.env.GEMINI_API_KEY);
  const deepl = Boolean(process.env.DEEPL_API_KEY);

  return (
    <div className="max-w-2xl">
      <PageHeader title="settings" />

      <div className="flex flex-col gap-8">
        <Section title="Appearance">
          <Row label="Theme" hint="Light / dark — stored on this device">
            <ThemeToggle />
          </Row>
        </Section>

        <Section title="Study">
          <Row label="Session cap" hint="Maximum cards per study session">
            <StaticValue>{MAX_SESSION_SIZE}</StaticValue>
          </Row>
          <Row label="New cards per session" hint="Interleaved among due cards">
            <StaticValue>{MAX_NEW_PER_SESSION}</StaticValue>
          </Row>
          <Row
            label="Mastered threshold"
            hint="FSRS stability at which a card counts as mastered"
          >
            <StaticValue>{MASTERED_STABILITY_DAYS}d</StaticValue>
          </Row>
          <Row
            label="Study direction"
            hint="Choose es→en or en→es on the session start screen"
          >
            <StaticValue>per session</StaticValue>
          </Row>
        </Section>

        <Section title="AI enrichment">
          <Row label="Azure AI Translator" hint="Primary translation provider (es→en)">
            <ProviderDot configured={azure} />
          </Row>
          <Row label="Gemini" hint="Example sentences, glosses and emoji">
            <ProviderDot configured={gemini} />
          </Row>
          <Row label="DeepL fallback" hint="Optional; lifetime free quota, off by default">
            <ProviderDot configured={deepl} />
          </Row>
        </Section>

        <Section title="Account" v2>
          <Row label="Display name" hint="Single-user passcode gate today">
            <StaticValue>lukas</StaticValue>
          </Row>
          <Row label="Email & password" hint="Arrives with Supabase auth">
            <StaticValue>—</StaticValue>
          </Row>
          <Row label="Multi-user decks" hint="Per-user decks, cards and review history">
            <StaticValue>—</StaticValue>
          </Row>
        </Section>

        <Section title="Data">
          <Row label="Notion import" hint="CSV import via npm run import:notion">
            <StaticValue>CLI</StaticValue>
          </Row>
          <Row label="Batch enrichment" hint="npm run enrich — two-pass, resumable">
            <StaticValue>CLI</StaticValue>
          </Row>
          <Row label="Export" hint="CSV/JSON export planned">
            <StaticValue>planned</StaticValue>
          </Row>
        </Section>
      </div>
    </div>
  );
}
