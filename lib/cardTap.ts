/**
 * Decide what a plain card click/tap should do, given the input context. The
 * long-press gesture (touch) is handled separately and is what first populates
 * the selection; this only governs ordinary taps/clicks.
 *
 * - Desktop (fine pointer): plain click always opens; shift-click toggles —
 *   identical to the pre-mobile behavior.
 * - Touch (coarse pointer): once a selection exists, a plain tap toggles
 *   (Google-Photos style — long-press starts it, taps extend it); with nothing
 *   selected, a tap opens.
 */
export function resolveCardTap(o: {
  shiftKey: boolean;
  coarse: boolean;
  hasSelection: boolean;
}): "toggle" | "open" {
  if (o.shiftKey) return "toggle";
  if (o.coarse && o.hasSelection) return "toggle";
  return "open";
}
