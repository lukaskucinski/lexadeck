"use client";

import { Award, RotateCcw } from "lucide-react";
import { useTransition } from "react";
import { queueCardForReview, setCardMastered } from "@/lib/actions/cards";
import { Button } from "@/components/ui/Button";
import type { SRSState } from "@/lib/types";

/** Master/unmaster + add-to-review controls on the card detail page. */
export function CardStatusActions({ cardId, srs }: { cardId: string; srs: SRSState }) {
  const [pending, startTransition] = useTransition();

  return (
    <>
      {srs === "mastered" ? (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => startTransition(() => queueCardForReview(cardId))}
          title="Clear mastered and bring the card back into review"
        >
          <RotateCcw size={14} /> Unmaster
        </Button>
      ) : (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => startTransition(() => setCardMastered(cardId, true))}
          title="Exclude this card from study sessions"
        >
          <Award size={14} /> Mark mastered
        </Button>
      )}
      {(srs === "scheduled" || srs === "learning") && (
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => startTransition(() => queueCardForReview(cardId))}
          title="Make this card due now"
        >
          Add to review
        </Button>
      )}
    </>
  );
}
