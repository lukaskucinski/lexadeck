import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getActiveHref,
  getTourActive,
  resetTourHighlight,
  setHighlight,
  setTourActive,
  subscribeHighlight,
} from "./highlightStore";

beforeEach(() => resetTourHighlight());

describe("highlightStore", () => {
  it("defaults to no highlight and an inactive tour", () => {
    expect(getActiveHref()).toBeNull();
    expect(getTourActive()).toBe(false);
  });

  it("tracks the active highlight href", () => {
    setHighlight("/decks");
    expect(getActiveHref()).toBe("/decks");
    setHighlight(null);
    expect(getActiveHref()).toBeNull();
  });

  it("tracks tour-active state", () => {
    setTourActive(true);
    expect(getTourActive()).toBe(true);
    setTourActive(false);
    expect(getTourActive()).toBe(false);
  });

  it("notifies subscribers on change and stops after unsubscribe", () => {
    const listener = vi.fn();
    const unsub = subscribeHighlight(listener);
    setHighlight("/progress");
    setTourActive(true);
    expect(listener).toHaveBeenCalledTimes(2);
    unsub();
    setHighlight("/library");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("does not notify when the value is unchanged", () => {
    setHighlight("/decks");
    const listener = vi.fn();
    subscribeHighlight(listener);
    setHighlight("/decks"); // no-op
    expect(listener).not.toHaveBeenCalled();
  });
});
