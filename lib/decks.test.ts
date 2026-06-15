import { describe, expect, it } from "vitest";
import { pickActiveDeck, resolveDeckLanding } from "./decks";

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

describe("pickActiveDeck (current deck the user works in)", () => {
  const day = (n: number) => new Date(2026, 0, n);
  const decks = [
    { id: "a", lastStudied: day(1) },
    { id: "b", lastStudied: day(3) },
    { id: "c", lastStudied: null },
  ];

  it("prefers the last-opened deck even over a more recently studied one", () => {
    expect(pickActiveDeck(decks, "c")?.id).toBe("c");
  });

  it("falls back to the most recently studied deck when the cookie is stale or absent", () => {
    expect(pickActiveDeck(decks, "deleted")?.id).toBe("b");
    expect(pickActiveDeck(decks, undefined)?.id).toBe("b");
  });

  it("falls back to the first deck when none have been studied", () => {
    const unstudied = [
      { id: "x", lastStudied: null },
      { id: "y", lastStudied: null },
    ];
    expect(pickActiveDeck(unstudied, undefined)?.id).toBe("x");
  });

  it("returns undefined for an empty deck list", () => {
    expect(pickActiveDeck([], undefined)).toBeUndefined();
  });
});
