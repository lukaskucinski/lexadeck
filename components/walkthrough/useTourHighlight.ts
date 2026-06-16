"use client";

import { useSyncExternalStore } from "react";
import {
  getActiveHref,
  getTourActive,
  subscribeHighlight,
} from "@/lib/walkthrough/highlightStore";

/** True when `href` is the nav item the current tour step is spotlighting. */
export function useTourHighlight(href: string): boolean {
  return useSyncExternalStore(
    subscribeHighlight,
    () => getActiveHref() === href,
    () => false,
  );
}

/** True while a first-run tour is running (the nav lifts above the dim). */
export function useTourActive(): boolean {
  return useSyncExternalStore(subscribeHighlight, getTourActive, () => false);
}
