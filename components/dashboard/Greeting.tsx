"use client";

import { useSyncExternalStore } from "react";
import { greetingFor, greetingForDate } from "@/lib/greeting";

// Stable false on the server and during hydration, then true once mounted.
// Lets us render the server-provided hour first (no hydration mismatch) and
// swap to the browser-local greeting after hydration.
const noopSubscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Time-of-day greeting computed from the user's *own* clock. The server
 * passes a fallback hour for the first paint; after hydration the greeting
 * is recomputed from the browser's local time so it's correct regardless of
 * where the server runs.
 */
export function Greeting({
  greetingLang,
  displayName,
  serverHour,
}: {
  greetingLang: string;
  displayName: string;
  serverHour: number;
}) {
  const hydrated = useHydrated();
  const greeting = hydrated
    ? greetingForDate(greetingLang)
    : greetingFor(greetingLang, serverHour);

  return (
    <h1 className="type-display text-5xl md:text-7xl">
      {greeting},
      <br />
      <span className="text-coral">{displayName.toLowerCase()}.</span>
    </h1>
  );
}
