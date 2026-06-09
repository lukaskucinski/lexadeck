import { srsStateVar, wordTypeVar } from "@/lib/wordTypeColors";
import {
  SRS_STATE_LABELS,
  WORD_TYPE_LABELS,
  type Gender,
  type SRSState,
  type WordType,
} from "@/lib/types";

/** Flat color square — the Swiss functional-color unit. */
export function TypeSwatch({
  wordType,
  size = 11,
}: {
  wordType: WordType;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0"
      style={{ width: size, height: size, background: wordTypeVar(wordType) }}
    />
  );
}

export function WordTypeBadge({ wordType }: { wordType: WordType }) {
  return (
    <span className="label-caps inline-flex items-center gap-2 text-ink">
      <TypeSwatch wordType={wordType} />
      {WORD_TYPE_LABELS[wordType]}
    </span>
  );
}

/** SRS state as a small flat square, label optional. */
export function SRSBadge({
  state,
  withLabel = false,
}: {
  state: SRSState;
  withLabel?: boolean;
}) {
  const square = (
    <span
      aria-hidden
      className="inline-block h-[9px] w-[9px] shrink-0"
      style={{ background: srsStateVar(state) }}
    />
  );
  if (!withLabel) {
    return (
      <span title={SRS_STATE_LABELS[state]} className="inline-flex">
        {square}
      </span>
    );
  }
  return (
    <span className="label-caps inline-flex items-center gap-2 text-muted">
      {square}
      {SRS_STATE_LABELS[state]}
    </span>
  );
}

const GENDER_SHORT: Record<Gender, string> = {
  MASCULINE: "M",
  FEMININE: "F",
  NEUTER: "N",
  EITHER: "M·F",
};

export function GenderBadge({ gender }: { gender: Gender | null }) {
  if (!gender) return null;
  return (
    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center border border-line px-1 text-[0.6rem] font-bold tracking-wide">
      {GENDER_SHORT[gender]}
    </span>
  );
}
