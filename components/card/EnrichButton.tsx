"use client";

import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { enrichCard } from "@/lib/actions/cards";
import { Button } from "@/components/ui/Button";

/** "AI enrich" — fills translation / example / emoji via Azure + Gemini. */
export function EnrichButton({
  cardId,
  enriched,
}: {
  cardId: string;
  /** card already has enrichedAt — relabel as a re-run */
  enriched: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        variant="outline"
        disabled={pending}
        title="Fill translation, example sentence and emoji with AI"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await enrichCard(cardId);
            if (res.error) setError(res.error);
          })
        }
      >
        <Sparkles size={14} />
        {pending ? "Enriching…" : enriched ? "Re-enrich" : "AI enrich"}
      </Button>
      {error && <span className="text-sm font-bold text-coral">{error}</span>}
    </>
  );
}
