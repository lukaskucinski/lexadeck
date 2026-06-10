"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { STUDY_EXCLUDE_COOKIE } from "@/lib/study";
import { WORD_TYPE_LABELS, WordType } from "@/lib/types";

function writeExcludeCookie(excluded: ReadonlySet<WordType>) {
  document.cookie = excluded.size
    ? `${STUDY_EXCLUDE_COOKIE}=${encodeURIComponent([...excluded].join(","))}; path=/; max-age=31536000; samesite=lax`
    : `${STUDY_EXCLUDE_COOKIE}=; path=/; max-age=0`;
}

/**
 * Word types excluded from study sessions (board item: "filter out grammar
 * or expressions… as a configuration option for studying"). Stored in a
 * cookie so the server can honor it when building queues and badges.
 */
export function StudyExcludeChips({ initial }: { initial: WordType[] }) {
  const router = useRouter();
  const [excluded, setExcluded] = useState<ReadonlySet<WordType>>(new Set(initial));

  function toggle(wordType: WordType) {
    const next = new Set(excluded);
    if (next.has(wordType)) next.delete(wordType);
    else next.add(wordType);
    setExcluded(next);

    writeExcludeCookie(next);
    // server components re-read the cookie (study badges, queue building)
    router.refresh();
  }

  return (
    <div className="flex max-w-sm flex-wrap justify-end gap-1.5">
      {Object.values(WordType).map((wordType) => {
        const off = excluded.has(wordType);
        return (
          <button
            key={wordType}
            type="button"
            onClick={() => toggle(wordType)}
            aria-pressed={off}
            title={
              off
                ? `${WORD_TYPE_LABELS[wordType]} cards are excluded from study — click to include`
                : `Exclude ${WORD_TYPE_LABELS[wordType].toLowerCase()} cards from study`
            }
            className={`border-[1.5px] px-2.5 py-1 text-[0.62rem] font-extrabold tracking-[0.1em] uppercase transition-colors ${
              off
                ? "border-line bg-ink text-bg line-through"
                : "border-soft text-muted hover:border-line hover:text-ink"
            }`}
          >
            {WORD_TYPE_LABELS[wordType]}
          </button>
        );
      })}
    </div>
  );
}
