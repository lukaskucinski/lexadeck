import { describe, expect, it } from "vitest";
import { planCardMove } from "./kanbanMove";

const cards = [
  { id: "a", wordType: "VERB" },
  { id: "b", wordType: "VERB" },
  { id: "c", wordType: "NOUN" },
];

describe("planCardMove", () => {
  it("moves a single unselected card (no selection)", () => {
    expect(planCardMove("a", "NOUN", new Set(), cards)).toEqual({
      moveIds: ["a"],
      clearSelection: false,
    });
  });

  it("dragging an unselected card moves only it and clears the selection", () => {
    expect(planCardMove("a", "NOUN", new Set(["b", "c"]), cards)).toEqual({
      moveIds: ["a"],
      clearSelection: true,
    });
  });

  it("dragging a selected card moves the whole selection", () => {
    expect(planCardMove("a", "NOUN", new Set(["a", "b"]), cards)).toEqual({
      moveIds: ["a", "b"],
      clearSelection: false,
    });
  });

  it("skips cards already in the target column", () => {
    // b is selected but already NOUN-bound here; c is NOUN already
    const mixed = [
      { id: "a", wordType: "VERB" },
      { id: "b", wordType: "NOUN" },
    ];
    expect(planCardMove("a", "NOUN", new Set(["a", "b"]), mixed)).toEqual({
      moveIds: ["a"],
      clearSelection: false,
    });
  });

  it("is a no-op when the dragged selected card is already in the target", () => {
    expect(planCardMove("c", "NOUN", new Set(["c"]), cards)).toEqual({
      moveIds: [],
      clearSelection: false,
    });
  });
});
