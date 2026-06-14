import { describe, expect, it, vi } from "vitest";
import {
  clearSelection,
  getSelectionSnapshot,
  subscribeSelection,
  toggleSelection,
} from "./selectionStore";

describe("selectionStore", () => {
  it("starts empty for an untouched key", () => {
    expect(getSelectionSnapshot("empty-key").size).toBe(0);
  });

  it("toggles an id on (recording its word type) and off", () => {
    const k = "toggle-key";
    toggleSelection(k, "a", "VERB");
    const snap = getSelectionSnapshot(k);
    expect(snap.has("a")).toBe(true);
    expect(snap.get("a")).toBe("VERB");
    toggleSelection(k, "a", "VERB");
    expect(getSelectionSnapshot(k).size).toBe(0);
  });

  it("exposes word types so callers can tell when a verb is selected", () => {
    const k = "verb-key";
    toggleSelection(k, "n1", "NOUN");
    expect([...getSelectionSnapshot(k).values()].some((wt) => wt === "VERB")).toBe(false);
    toggleSelection(k, "v1", "VERB");
    expect([...getSelectionSnapshot(k).values()].some((wt) => wt === "VERB")).toBe(true);
  });

  it("clears a key", () => {
    const k = "clear-key";
    toggleSelection(k, "a", "NOUN");
    toggleSelection(k, "b", "NOUN");
    clearSelection(k);
    expect(getSelectionSnapshot(k).size).toBe(0);
  });

  it("keeps keys isolated", () => {
    toggleSelection("deck-1", "x", "NOUN");
    toggleSelection("deck-2", "y", "VERB");
    expect([...getSelectionSnapshot("deck-1").keys()]).toEqual(["x"]);
    expect([...getSelectionSnapshot("deck-2").keys()]).toEqual(["y"]);
  });

  it("returns a STABLE snapshot reference between mutations, fresh after one", () => {
    const k = "stable-key";
    toggleSelection(k, "a", "NOUN");
    const snap1 = getSelectionSnapshot(k);
    const snap2 = getSelectionSnapshot(k);
    expect(snap2).toBe(snap1); // no mutation → identical reference (no render loop)
    toggleSelection(k, "b", "NOUN");
    expect(getSelectionSnapshot(k)).not.toBe(snap1); // mutation → new reference
  });

  it("notifies subscribers on mutation and stops after unsubscribe", () => {
    const cb = vi.fn();
    const unsub = subscribeSelection(cb);
    toggleSelection("sub-key", "a", "NOUN");
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
    toggleSelection("sub-key", "b", "NOUN");
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
