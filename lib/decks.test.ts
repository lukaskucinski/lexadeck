import { describe, expect, it } from "vitest";
import { resolveDeckLanding } from "./decks";

const IDS = ["deck-a", "deck-b"];

describe("resolveDeckLanding (/decks auto-open)", () => {
  it("a single deck always opens directly", () => {
    expect(resolveDeckLanding(["deck-a"], undefined, false)).toBe("deck-a");
  });

  it("multiple decks open the most recently visited one", () => {
    expect(resolveDeckLanding(IDS, "deck-b", false)).toBe("deck-b");
  });

  it("a stale or absent last-visited id falls back to the index", () => {
    expect(resolveDeckLanding(IDS, "deleted-deck", false)).toBeNull();
    expect(resolveDeckLanding(IDS, undefined, false)).toBeNull();
  });

  it("the all flag forces the index (breadcrumb escape hatch)", () => {
    expect(resolveDeckLanding(["deck-a"], "deck-a", true)).toBeNull();
    expect(resolveDeckLanding(IDS, "deck-b", true)).toBeNull();
  });

  it("no decks renders the index empty state", () => {
    expect(resolveDeckLanding([], undefined, false)).toBeNull();
  });
});
