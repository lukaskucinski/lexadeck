"use client";

import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

/**
 * Long-press detector for touch/pen (the mobile multi-select entry gesture).
 * Mouse is ignored — desktop selects via shift-click. A press that moves beyond
 * `moveTolerance` (scroll / kanban drag) cancels, so the gesture only fires on a
 * deliberate stationary hold. After firing, `consumedClick()` swallows the click
 * the browser emits on release so the card isn't also opened/toggled.
 */
export function useLongPress({
  onLongPress,
  delay = 400,
  moveTolerance = 10,
}: {
  onLongPress: () => void;
  delay?: number;
  moveTolerance?: number;
}) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  function clear() {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    start.current = null;
  }

  function onPointerDown(e: ReactPointerEvent) {
    if (e.pointerType === "mouse") return; // touch/pen only
    fired.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    timer.current = window.setTimeout(() => {
      fired.current = true;
      onLongPress();
      clear();
    }, delay);
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!start.current || timer.current === null) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (dx * dx + dy * dy > moveTolerance * moveTolerance) clear(); // moved → not a long-press
  }

  function onPointerUp() {
    clear();
  }
  function onPointerCancel() {
    clear();
  }

  /** call from the card's onClick: true means a long-press just fired — swallow the click */
  function consumedClick(): boolean {
    if (fired.current) {
      fired.current = false;
      return true;
    }
    return false;
  }

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    consumedClick,
  };
}
