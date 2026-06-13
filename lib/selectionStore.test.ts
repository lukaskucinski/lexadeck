import { describe, expect, it, vi } from "vitest";
import {
  clearSelection,
  getSelectionSnapshot,
  setSelection,
  subscribeSelection,
  toggleSelection,
} from "./selectionStore";

describe("selectionStore", () => {
  it("starts empty for an untouched key", () => {
    expect(getSelectionSnapshot("empty-key").size).toBe(0);
  });

  it("toggles an id on and off", () => {
    const k = "toggle-key";
    toggleSelection(k, "a");
    expect([...getSelectionSnapshot(k)]).toEqual(["a"]);
    toggleSelection(k, "a");
    expect(getSelectionSnapshot(k).size).toBe(0);
  });

  it("setSelection adds and removes a batch", () => {
    const k = "batch-key";
    setSelection(k, ["a", "b", "c"], true);
    expect(new Set(getSelectionSnapshot(k))).toEqual(new Set(["a", "b", "c"]));
    setSelection(k, ["a", "c"], false);
    expect([...getSelectionSnapshot(k)]).toEqual(["b"]);
  });

  it("clears a key", () => {
    const k = "clear-key";
    setSelection(k, ["a", "b"], true);
    clearSelection(k);
    expect(getSelectionSnapshot(k).size).toBe(0);
  });

  it("keeps keys isolated", () => {
    toggleSelection("deck-1", "x");
    toggleSelection("deck-2", "y");
    expect([...getSelectionSnapshot("deck-1")]).toEqual(["x"]);
    expect([...getSelectionSnapshot("deck-2")]).toEqual(["y"]);
  });

  it("returns a STABLE snapshot reference between mutations, fresh after one (useSyncExternalStore contract)", () => {
    const k = "stable-key";
    toggleSelection(k, "a");
    const snap1 = getSelectionSnapshot(k);
    const snap2 = getSelectionSnapshot(k);
    expect(snap2).toBe(snap1); // no mutation → identical reference (no render loop)
    toggleSelection(k, "b");
    expect(getSelectionSnapshot(k)).not.toBe(snap1); // mutation → new reference
  });

  it("notifies subscribers on mutation and stops after unsubscribe", () => {
    const cb = vi.fn();
    const unsub = subscribeSelection(cb);
    toggleSelection("sub-key", "a");
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
    toggleSelection("sub-key", "b");
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
