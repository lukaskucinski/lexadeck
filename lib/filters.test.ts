import { describe, expect, it } from "vitest";
import { checkedCount, selectedSet, toggleAll, toggleValue } from "./filters";

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

describe("toggleAll (group-title click)", () => {
  it("unchecks a facet that is fully checked by default", () => {
    expect(toggleAll(null, ALL)).toBe("none");
  });

  it("checks everything from the all-unchecked state", () => {
    expect(toggleAll("none", ALL)).toBeNull();
  });

  it("checks everything from a partial subset", () => {
    expect(toggleAll("a,c", ALL)).toBeNull();
  });
});

describe("checkedCount (filter badge)", () => {
  it("an untouched facet contributes nothing", () => {
    expect(checkedCount(null, ALL)).toBe(0);
  });

  it("an all-unchecked facet contributes nothing", () => {
    expect(checkedCount("none", ALL)).toBe(0);
  });

  it("counts the checked subset", () => {
    expect(checkedCount("a,c", ALL)).toBe(2);
  });
});
