/**
 * Subject (use-case / domain) registry — the single source of truth for a deck's
 * subject. Parallels the per-language `LanguageProfile` registry in `languages.ts`:
 * each profile supplies the deck-form label, the dashboard tagline word
 * ("flashcard <word> learning"), and the extra context layered into the Gemini
 * enrichment prompt. The `languages` subject is the default and a no-op for
 * enrichment (empty `promptContext`), so the language path stays unchanged.
 */

export interface SubjectProfile {
  /** Canonical slug stored on Deck.subject. */
  slug: string;
  /** Human label for the deck-creation Select. */
  label: string;
  /** Dashboard tagline word in "flashcard <word> learning". */
  taglineWord: string;
  /** Extra instruction injected into the enrichment prompt; "" = no injection. */
  promptContext: string;
}

const SUBJECTS: SubjectProfile[] = [
  {
    slug: "languages",
    label: "Languages",
    taglineWord: "language",
    promptContext: "",
  },
  {
    slug: "medicine",
    label: "Medicine",
    taglineWord: "medicine",
    promptContext:
      "Favor clinical and anatomical usage: prefer standard medical terminology and common abbreviations, with example sentences set in real healthcare contexts.",
  },
  {
    slug: "exams",
    label: "Exams",
    taglineWord: "exam",
    promptContext:
      "These are standardized-exam study terms: prefer the register and example contexts a test-taker will actually meet on the exam.",
  },
  {
    slug: "science",
    label: "Science",
    taglineWord: "science",
    promptContext:
      "Favor scientific usage: prefer precise technical terminology with example sentences from lab, research, or natural-science contexts.",
  },
  {
    slug: "law",
    label: "Law",
    taglineWord: "law",
    promptContext:
      "Favor legal usage: prefer precise legal terminology with example sentences drawn from contracts, courts, or statutes.",
  },
  {
    slug: "history",
    label: "History",
    taglineWord: "history",
    promptContext:
      "Favor historical usage: prefer terminology and example sentences set in their historical period and context.",
  },
  {
    slug: "coding",
    label: "Coding",
    taglineWord: "coding",
    promptContext:
      "Favor software-engineering usage: prefer programming terminology with example sentences about writing, running, or debugging code.",
  },
  {
    slug: "geography",
    label: "Geography",
    taglineWord: "geography",
    promptContext:
      "Favor geographic usage: prefer place, terrain, climate, and cartographic terminology with example sentences to match.",
  },
  {
    slug: "music",
    label: "Music",
    taglineWord: "music",
    promptContext:
      "Favor musical usage: prefer music-theory and performance terminology with example sentences from rehearsal, performance, or composition.",
  },
];

const PROFILES: Record<string, SubjectProfile> = Object.fromEntries(
  SUBJECTS.map((s) => [s.slug, s]),
);

/** Canonical subject slugs (for `z.enum` and the deck form). */
export const SUBJECT_SLUGS: readonly string[] = SUBJECTS.map((s) => s.slug);

/** `{ slug, label }` pairs for the deck-creation Select. */
export const SUBJECT_OPTIONS: readonly { slug: string; label: string }[] = SUBJECTS.map(
  ({ slug, label }) => ({ slug, label }),
);

/** Default subject — every deck today is a language deck. */
export const DEFAULT_SUBJECT = "languages";

function key(slug: string | null | undefined): string {
  return (slug ?? "").trim().toLowerCase();
}

/** The profile for a subject slug, or null if it isn't a known subject. */
export function getSubjectProfile(slug: string | null | undefined): SubjectProfile | null {
  return PROFILES[key(slug)] ?? null;
}

/** Dashboard tagline word for a subject, falling back to the languages word. */
export function subjectTaglineWord(slug: string | null | undefined): string {
  return (getSubjectProfile(slug) ?? PROFILES[DEFAULT_SUBJECT]).taglineWord;
}

/** True when the subject is the (default) languages subject. */
export function isLanguageSubject(slug: string | null | undefined): boolean {
  return key(slug) === DEFAULT_SUBJECT;
}
