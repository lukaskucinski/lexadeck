import type { SchedulerFields } from "./srs";
import type { CardType, Gender, WordType } from "./types";

export const MAX_SESSION_SIZE = 50;
export const MAX_NEW_PER_SESSION = 10;
/** Re-queue a rated card into the running session if it comes due this soon. */
export const REQUEUE_WINDOW_MS = 12 * 60_000;

/** Everything the study UI needs to render one card. */
export interface StudyCard {
  id: string;
  term: string;
  translation: string | null;
  cardType: CardType;
  wordType: WordType;
  gender: Gender | null;
  emoji: string | null;
  example: string | null;
  exampleEn: string | null;
  notes: string | null;
  conjugation: string | null;
  language: string;
  isNew: boolean;
  srs: SchedulerFields;
}

export interface SessionCounts {
  due: number;
  fresh: number;
  total: number;
}

/**
 * What a session started right now would actually contain — the same caps the
 * queue builder applies. Keeps "Study (N)" badges honest (board item: badge
 * said 50, session gave 10).
 */
export function sessionCounts(dueCount: number, newCount: number): SessionCounts {
  const due = Math.min(dueCount, MAX_SESSION_SIZE);
  const fresh = Math.min(
    newCount,
    MAX_NEW_PER_SESSION,
    Math.max(0, MAX_SESSION_SIZE - due),
  );
  return { due, fresh, total: due + fresh };
}

/**
 * Interleave new cards among due cards at a regular cadence rather than
 * appending them as a block (spec §4).
 */
export function interleaveQueue<T>(due: T[], fresh: T[]): T[] {
  if (fresh.length === 0) return [...due];
  if (due.length === 0) return [...fresh];

  const result: T[] = [];
  const interval = Math.ceil((due.length + fresh.length) / fresh.length);
  let dueIdx = 0;
  let freshIdx = 0;

  for (let position = 0; dueIdx < due.length || freshIdx < fresh.length; position++) {
    const shouldInsertFresh =
      freshIdx < fresh.length &&
      (dueIdx >= due.length || (position + 1) % interval === 0);
    if (shouldInsertFresh) result.push(fresh[freshIdx++]);
    else result.push(due[dueIdx++]);
  }

  return result;
}
