import { getSRSState } from "@/lib/srs";
import type { CardType, Gender, SRSState, WordType } from "@/lib/types";

/** Serialized card slice passed from RSC pages into client view components. */
export interface CardRow {
  id: string;
  deckId: string;
  term: string;
  translation: string | null;
  wordType: WordType;
  gender: Gender | null;
  cardType: CardType;
  emoji: string | null;
  srs: SRSState;
  due: Date;
  deckName?: string;
}

interface CardLike {
  id: string;
  deckId: string;
  term: string;
  translation: string | null;
  wordType: string;
  gender: string | null;
  cardType: string;
  emoji: string | null;
  due: Date;
  state: number;
  stability: number;
}

export function toCardRow(card: CardLike, now: Date, deckName?: string): CardRow {
  return {
    id: card.id,
    deckId: card.deckId,
    term: card.term,
    translation: card.translation,
    wordType: card.wordType as WordType,
    gender: card.gender as Gender | null,
    cardType: card.cardType as CardType,
    emoji: card.emoji,
    srs: getSRSState(card, now),
    due: card.due,
    deckName,
  };
}
