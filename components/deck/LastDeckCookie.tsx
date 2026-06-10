"use client";

import { useEffect } from "react";
import { LAST_DECK_COOKIE } from "@/lib/decks";

function writeCookie(deckId: string) {
  document.cookie = `${LAST_DECK_COOKIE}=${encodeURIComponent(deckId)}; path=/; max-age=31536000; samesite=lax`;
}

/** Renders nothing; marks this deck as the last one visited (/decks auto-opens it). */
export function LastDeckCookie({ deckId }: { deckId: string }) {
  useEffect(() => {
    writeCookie(deckId);
  }, [deckId]);

  return null;
}
