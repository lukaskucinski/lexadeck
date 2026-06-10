import { describe, expect, it } from "vitest";
import { selectedSet, toggleValue } from "./filters";

const ALL = ["a", "b", "c"] as const;

describe("selectedSet", () => {
  it("treats an absent param as everything checked", () => {
    expect(selectedSet(null, ALL)).toEqual(new Set(ALL));
  });

  it('treats "none" as nothing checked', () => {
    expect(selectedSet("none", ALL)).toEqual(new Set());
  });

  it("parses a CSV subset", () => {
    expect(selectedSet("a,c", ALL)).toEqual(new Set(["a", "c"]));
  });
});

describe("toggleValue", () => {
  it("unchecking one option from the default writes the remaining set", () => {
    expect(toggleValue(null, "b", ALL)).toBe("a,c");
  });

  it('unchecking the last option yields the "none" sentinel', () => {
    expect(toggleValue("a", "a", ALL)).toBe("none");
  });

  it('checking an option from "none" starts a fresh subset', () => {
    expect(toggleValue("none", "b", ALL)).toBe("b");
  });

  it("re-checking the final option clears the param back to default", () => {
    expect(toggleValue("a,b", "c", ALL)).toBeNull();
  });

  it("keeps option order canonical regardless of toggle order", () => {
    expect(toggleValue("c", "a", ALL)).toBe("a,c");
  });
});
