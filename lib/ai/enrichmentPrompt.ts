/**
 * Builds the Gemini enrichment prompt for a batch of cards, parameterized by the
 * deck's LanguageProfile. This replaces the formerly inline Spanish-only template
 * in geminiEnrich; the Spanish profile reproduces that prompt's content so live
 * output (and behavior) for existing decks is unchanged.
 */
import { WordType } from "../types";
import { cefrPromptLevel } from "./cefr";
import type { EnrichableCard } from "./enrichment";
import type { LanguageProfile } from "./languages";
import { getSubjectProfile } from "./subjects";

const WORD_TYPES = Object.values(WordType)
  .filter((w) => w !== "GRAMMAR")
  .join(", ");

function genderLine(p: LanguageProfile): string {
  if (!p.gender.enabled) {
    return `- "gender": always "" (${p.name} has no grammatical gender).`;
  }
  return `- "gender": for NOUN terms only, ${p.gender.promptNote}; "" for any non-noun. If the card's gender is non-null, keep it.`;
}

function readingLine(p: LanguageProfile): string | null {
  if (!p.reading.enabled) return null;
  return `- "reading": ${p.reading.promptNote}. "" for non-${p.name} scripts or when there is no distinct reading.`;
}

function usagePatternLine(p: LanguageProfile): string {
  const eg = p.usagePatternNote ? `, e.g. ${p.usagePatternNote}` : "";
  return `- "usagePattern": the grammatical frame the term is typically used in${eg}. Use English grammatical labels (write "+ noun", not a target-language label). "" if there is no characteristic pattern.`;
}

/**
 * Subject context appended to the preamble. Empty (byte-identical to the
 * language-only prompt) for the default `languages` subject or an unknown slug.
 */
function subjectContext(subject: string | undefined): string {
  const profile = subject ? getSubjectProfile(subject) : null;
  if (!profile || !profile.promptContext) return "";
  return ` These cards come from a ${profile.label} deck. ${profile.promptContext}`;
}

/** Build the full enrichment prompt (instructions + the cards as JSON lines). */
export function buildEnrichmentPrompt(
  profile: LanguageProfile,
  cards: EnrichableCard[],
  subject?: string,
  level?: string | null,
): string {
  const cardLines = cards.map((c) =>
    JSON.stringify({
      id: c.id,
      term: c.term,
      translation: c.translation,
      wordType: c.wordType,
      gender: c.gender,
      notes: c.notes?.slice(0, 200) ?? null,
    }),
  );

  const fields = [
    `- "wordType": the part of speech, one of: ${WORD_TYPES}. If the card's wordType is non-null, keep it; if it is null, infer it from the term and translation.`,
    genderLine(profile),
    readingLine(profile),
    `- "example": one natural, useful ${profile.name} sentence (8-14 words) using the term in a common context. Match the term's register. For expressions, use the expression naturally.`,
    `- "exampleEn": a natural English translation of that sentence.`,
    `- "emoji": exactly one standard Unicode emoji character that best evokes the term's meaning ("" if nothing fits). Never use letters, words, or keycap combinations — a real emoji or "".`,
    usagePatternLine(profile),
    `- "collocations": 3-5 short, natural word combinations the term commonly appears in. [] if none are characteristic.`,
    `- "conjugation": for VERBS only, ${profile.conjugation.summaryNote}. "" for non-verbs.`,
    `- "etymology": a brief one-sentence origin note written in ENGLISH (the learner reads English), e.g. "From Latin 'nepos', meaning nephew or grandson." Return "" unless you are confident — never guess.`,
    `- "wordFamily": 2-4 closely related words sharing the same root. [] if none.`,
    `- "synonyms": 2-6 ${profile.name} synonyms or near-synonyms, each as {"es": <the ${profile.name} synonym>, "en": <its own short, direct English translation>}. ${profile.synonymExample}. The "en" is that synonym's gloss, not the headword's. [] if there are no good synonyms (e.g. proper nouns).`,
    `- "correction": "" in almost all cases. ONLY if the term or its given translation is clearly MISSPELLED — not merely a regional or stylistic variant — return a short ENGLISH note naming the likely intended form, e.g. "'<term>' looks misspelled — did you mean '<intended>'?". Respect valid regional spellings and accents; never flag a correct word.`,
  ].filter((line): line is string => line !== null);

  return `You are helping build ${profile.name}→English flashcards for an adult learner (${cefrPromptLevel(level)} level).${subjectContext(subject)}

For EACH card below, return one JSON object carrying the same "id", with these fields:
${fields.join("\n")}

Do not contradict the given translation. Write the explanatory fields — "etymology" and any "correction" — in ENGLISH for the English-speaking learner; only the target-language content ("example", "collocations", "conjugation", "wordFamily", "synonyms") is in ${profile.name}. Keep every field concise and practical. Return a JSON array with one object per card.

Cards:
${cardLines.join("\n")}`;
}
