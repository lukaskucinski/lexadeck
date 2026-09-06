/**
 * Hand-authored CEFR placement quiz items. Pure data + a language-keyed registry
 * so other languages drop in later without touching the scoring engine; Spanish
 * is the only bank for now (matches the Spanish-only starter deck + conjugation
 * tables). Imports NOTHING from the DB so it stays unit-testable.
 *
 * Each item probes one CEFR band; the bank has two items per band (A1–C2). The
 * `answer` index is the authoritative key — scoring re-derives correctness from
 * it, never from the client. Correct positions are varied so the quiz can't be
 * aced by always picking the same slot.
 */
import type { CefrLevel } from "@/lib/ai/cefr";

export interface PlacementItem {
  /** Stable id, e.g. "es-b1-1" — also the form field key (q_<id>). */
  id: string;
  /** The CEFR band this item probes. */
  level: CefrLevel;
  /** The Spanish cloze / question shown to the learner. */
  prompt: string;
  /** A short English instruction/gloss of the task. */
  promptEn: string;
  /** 3–4 answer options. */
  choices: string[];
  /** Index into `choices` of the correct option (server-side key). */
  answer: number;
}

export const ES_PLACEMENT_ITEMS: PlacementItem[] = [
  // — A1: greetings, ser/estar, basic vocabulary —
  {
    id: "es-a1-1",
    level: "A1",
    prompt: "«____ días, señora.»",
    promptEn: "Complete the morning greeting (“good morning”).",
    choices: ["Buenas", "Buenos", "Bueno", "Buena"],
    answer: 1,
  },
  {
    id: "es-a1-2",
    level: "A1",
    prompt: "Yo ____ de México.",
    promptEn: "“I ___ from Mexico.” (origin)",
    choices: ["soy", "estoy", "es", "eres"],
    answer: 0,
  },
  // — A2: preterite, gustar, everyday structures —
  {
    id: "es-a2-1",
    level: "A2",
    prompt: "Ayer ____ al cine con mis amigos.",
    promptEn: "“Yesterday I ___ to the cinema with my friends.”",
    choices: ["voy", "iré", "fui", "iba"],
    answer: 2,
  },
  {
    id: "es-a2-2",
    level: "A2",
    prompt: "¿____ gusta el café?",
    promptEn: "“Do you like coffee?” — “___ gusta el café?”",
    choices: ["Tú", "Tu", "Ti", "Te"],
    answer: 3,
  },
  // — B1: present subjunctive, por/para —
  {
    id: "es-b1-1",
    level: "B1",
    prompt: "Espero que ____ buen tiempo mañana.",
    promptEn: "“I hope the weather ___ nice tomorrow.”",
    choices: ["haga", "hace", "hará", "hacía"],
    answer: 0,
  },
  {
    id: "es-b1-2",
    level: "B1",
    prompt: "Estudié mucho ____ aprobar el examen.",
    promptEn: "“I studied a lot ___ pass the exam.” (purpose)",
    choices: ["por", "porque", "para", "pues"],
    answer: 2,
  },
  // — B2: past subjunctive / conditional, relative pronouns —
  {
    id: "es-b2-1",
    level: "B2",
    prompt: "Si ____ más dinero, viajaría por todo el mundo.",
    promptEn: "“If I ___ more money, I'd travel the world.”",
    choices: ["tengo", "tendré", "tuviera", "tenía"],
    answer: 2,
  },
  {
    id: "es-b2-2",
    level: "B2",
    prompt: "La casa ____ ventanas son azules es la mía.",
    promptEn: "“The house ___ windows are blue is mine.”",
    choices: ["que", "cuales", "quienes", "cuyas"],
    answer: 3,
  },
  // — C1: concessive/contrast connectors, subjunctive with time clauses —
  {
    id: "es-c1-1",
    level: "C1",
    prompt: "No es que no me guste, ____ que no tengo tiempo.",
    promptEn: "“It's not that I dislike it, ___ that I have no time.”",
    choices: ["pero", "aunque", "sino", "mientras"],
    answer: 2,
  },
  {
    id: "es-c1-2",
    level: "C1",
    prompt: "En cuanto ____ a casa, te llamaré.",
    promptEn: "“As soon as I ___ home, I'll call you.”",
    choices: ["llegue", "llego", "llegaré", "llegaba"],
    answer: 0,
  },
  // — C2: near-native register, idiom —
  {
    id: "es-c2-1",
    level: "C2",
    prompt: "Por más que ____, no logró convencerla.",
    promptEn: "“No matter how much he ___, he couldn't convince her.”",
    choices: ["insistía", "insistió", "insistiera", "insiste"],
    answer: 2,
  },
  {
    id: "es-c2-2",
    level: "C2",
    prompt: "Cada vez que habla, se va por los ____ de Úbeda.",
    promptEn: "Idiom: “irse por los ___ de Úbeda” = to wander off the point.",
    choices: ["montes", "valles", "cerros", "campos"],
    answer: 2,
  },
];

/** Language-code → item bank. Spanish only for now; ja/de drop in here later. */
const REGISTRY: Partial<Record<string, PlacementItem[]>> = {
  es: ES_PLACEMENT_ITEMS,
};

/** Items for a language, or null if no placement test exists for it yet. */
export function getPlacementItems(language: string): PlacementItem[] | null {
  return REGISTRY[language] ?? null;
}

/** Whether a placement test is available for the given language. */
export function hasPlacementTest(language: string | null | undefined): boolean {
  return language != null && language in REGISTRY;
}
