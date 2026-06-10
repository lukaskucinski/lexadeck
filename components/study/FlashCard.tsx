"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { STABILITY_HINT } from "@/lib/srs";
import { WORD_TYPE_LABELS } from "@/lib/types";
import type { StudyCard } from "@/lib/study";
import { wordTypeVar } from "@/lib/wordTypeColors";
import { SpeakButton } from "@/components/ui/SpeakButton";

function termSizeClass(term: string): string {
  if (term.length <= 12) return "text-5xl md:text-6xl";
  if (term.length <= 22) return "text-4xl md:text-5xl";
  return "text-3xl md:text-4xl";
}

const GENDER_LABEL: Record<string, string> = {
  MASCULINE: "m",
  FEMININE: "f",
  NEUTER: "n",
  EITHER: "m·f",
};

export function FlashCard({
  card,
  revealed,
  reversed = false,
  onReveal,
}: {
  card: StudyCard;
  revealed: boolean;
  /** en→es mode: prompt with the translation, answer with the term */
  reversed?: boolean;
  onReveal: () => void;
}) {
  const isGrammar = card.cardType === "GRAMMAR";
  // grammar cards carry their substance in notes — surface them immediately
  const [notesOpen, setNotesOpen] = useState(isGrammar);
  const accent = wordTypeVar(card.wordType);
  const prompt = reversed ? card.translation! : card.term;
  const promptLang = reversed ? "en" : card.language;

  return (
    <div className="perspective-1200 w-full">
      <motion.div
        className="preserve-3d relative min-h-[420px] w-full"
        animate={{ rotateY: revealed ? 180 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* ---------- front ---------- */}
        <div
          className="backface-hidden absolute inset-0 flex cursor-pointer flex-col border-[1.5px] border-line bg-bg"
          onClick={() => !revealed && onReveal()}
        >
          <div className="flex items-center gap-3 border-b border-line px-5 py-3">
            <i className="h-3 w-3" style={{ background: accent }} />
            <span className="label-caps">
              {WORD_TYPE_LABELS[card.wordType]}
              {card.gender && (
                <em className="ml-1.5 text-muted not-italic">{GENDER_LABEL[card.gender]}</em>
              )}
            </span>
            <span className="label-caps ml-auto text-muted">{promptLang}</span>
            {card.isNew && (
              <span className="bg-blue px-1.5 py-0.5 text-[0.58rem] font-extrabold tracking-[0.1em] text-bg uppercase">
                New
              </span>
            )}
          </div>

          <div className="flex flex-1 flex-col items-start justify-center gap-6 px-7 py-8">
            <h2 className={`type-display ${termSizeClass(prompt)}`}>
              {prompt}
              <SpeakButton text={prompt} lang={promptLang} size={22} className="ml-3 align-middle" />
            </h2>
            <span className="label-caps text-muted">Space to reveal ↓</span>
          </div>

          <div className="grid grid-cols-2 border-t border-line text-[0.62rem] font-semibold tracking-[0.1em] text-muted uppercase">
            <div className="tnum border-r border-soft px-5 py-2.5">
              <b className="text-ink">{card.srs.reps}</b> reviews
            </div>
            <div className="tnum cursor-help px-5 py-2.5" title={STABILITY_HINT}>
              <b className="text-ink">{card.srs.stability.toFixed(1)}d</b>{" "}
              <span className="underline decoration-dotted underline-offset-2">stability</span>
            </div>
          </div>
        </div>

        {/* ---------- back ---------- */}
        <div
          className="backface-hidden absolute inset-0 flex flex-col overflow-y-auto border-[1.5px] border-line bg-bg"
          style={{ transform: "rotateY(180deg)" }}
        >
          <div className="flex items-center gap-3 border-b border-line px-5 py-3">
            <i className="h-3 w-3" style={{ background: accent }} />
            <span className="type-term text-lg leading-none">{prompt}</span>
            {card.emoji && <span className="text-lg leading-none">{card.emoji}</span>}
            <span className="label-caps ml-auto text-muted">
              {WORD_TYPE_LABELS[card.wordType]}
              {card.gender && ` · ${GENDER_LABEL[card.gender]}`}
            </span>
          </div>

          <div className="flex-1 px-7 py-6">
            {/* grammar cards legitimately have no translation — only word
                cards show the missing-translation placeholder */}
            {reversed ? (
              <p className="type-term text-3xl tracking-tight md:text-4xl">
                {card.term}
                <SpeakButton
                  text={card.term}
                  lang={card.language}
                  size={20}
                  className="ml-3 align-middle"
                />
              </p>
            ) : (
              (card.translation || !isGrammar) && (
                <p className="text-3xl font-medium tracking-tight md:text-4xl">
                  {card.translation ?? <span className="text-muted/60">no translation yet</span>}
                </p>
              )
            )}

            {(card.example || card.exampleEn) && (
              <div className="mt-6 border-l-2 border-line pl-4">
                {card.example && (
                  <p className="font-medium">
                    {card.example}
                    <SpeakButton
                      text={card.example}
                      lang={card.language}
                      className="ml-2 align-text-bottom"
                    />
                  </p>
                )}
                {card.exampleEn && <p className="mt-1 text-sm text-muted">{card.exampleEn}</p>}
              </div>
            )}

            {card.conjugation && (
              <div className="mt-6">
                <p className="label-caps mb-1.5 text-muted">Conjugation</p>
                <pre className="whitespace-pre-wrap font-[inherit] text-sm font-semibold leading-relaxed">
                  {card.conjugation}
                </pre>
              </div>
            )}

            {card.notes && (
              <div className="mt-6">
                <button
                  onClick={() => setNotesOpen((v) => !v)}
                  className="label-caps text-muted hover:text-ink"
                >
                  Notes {notesOpen ? "−" : "+"}
                </button>
                {notesOpen && (
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{card.notes}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
