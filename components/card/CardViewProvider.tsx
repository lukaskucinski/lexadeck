"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { parseCardViewParams, type CardViewParams } from "@/lib/cardViewParams";

type Patch = Record<string, string | null>;
export type SetParams = (patch: Patch, opts?: { resetPage?: boolean }) => void;

interface CardViewValue {
  /** Mirrors the previous useViewParams() shape so controls work unchanged. */
  searchParams: URLSearchParams;
  setParams: SetParams;
  /** Parsed once here so the workspace can filter/sort without re-parsing. */
  vp: CardViewParams;
}

const CardViewContext = createContext<CardViewValue | null>(null);

export function useViewParams(): CardViewValue {
  const ctx = useContext(CardViewContext);
  if (!ctx) throw new Error("useViewParams must be used within <CardViewProvider>");
  return ctx;
}

/**
 * Holds the deck/library view params as CLIENT state so the controls update the
 * view instantly — no `router.replace()` / server round-trip. The URL is kept in
 * sync via `window.history.replaceState` (shareable links preserved; Next keeps
 * `useSearchParams` consistent), and `popstate` restores state on back/forward.
 */
export function CardViewProvider({
  initialQuery,
  children,
}: {
  initialQuery: string;
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState(initialQuery);

  const searchParams = useMemo(() => new URLSearchParams(query), [query]);
  const vp = useMemo(() => parseCardViewParams(Object.fromEntries(searchParams)), [searchParams]);

  const setParams = useCallback<SetParams>((patch, { resetPage = true } = {}) => {
    setQuery((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      if (resetPage) next.delete("page");
      return next.toString();
    });
  }, []);

  // Push state changes to the URL without a navigation. Skip the first render so
  // we don't rewrite the URL on mount.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const url = query ? `?${query}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [query]);

  // Back/forward navigates the in-page state, not the server.
  useEffect(() => {
    const onPop = () => setQuery(window.location.search.replace(/^\?/, ""));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const value = useMemo(() => ({ searchParams, setParams, vp }), [searchParams, setParams, vp]);
  return <CardViewContext.Provider value={value}>{children}</CardViewContext.Provider>;
}
