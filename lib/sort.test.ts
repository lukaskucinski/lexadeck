import { describe, expect, it } from "vitest";
import { SORT_OPTIONS, DEFAULT_SORT_OPTION, activeSortOption } from "./sort";

describe("SORT_OPTIONS", () => {
  it("exposes the six approved options as (label → sort/dir) pairs", () => {
    expect(SORT_OPTIONS.map((o) => [o.label, o.sort, o.dir])).toEqual([
      ["Recently added", "createdAt", "desc"],
      ["Oldest first", "createdAt", "asc"],
      ["A → Z", "term", "asc"],
      ["Z → A", "term", "desc"],
      ["Due soonest", "due", "asc"],
      ["Word type", "wordType", "asc"],
    ]);
  });

  it("has unique values", () => {
    const values = SORT_OPTIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("defaults to 'Recently added' (createdAt desc)", () => {
    expect(DEFAULT_SORT_OPTION.sort).toBe("createdAt");
    expect(DEFAULT_SORT_OPTION.dir).toBe("desc");
  });
});

describe("activeSortOption", () => {
  it("matches a listed (sort, dir) pair", () => {
    expect(activeSortOption("createdAt", "desc")?.label).toBe("Recently added");
    expect(activeSortOption("term", "asc")?.label).toBe("A → Z");
    expect(activeSortOption("wordType", "asc")?.label).toBe("Word type");
  });

  it("returns undefined for a combo the control doesn't offer", () => {
    // list-view header clicks can produce e.g. due desc, which has no dropdown entry
    expect(activeSortOption("due", "desc")).toBeUndefined();
    expect(activeSortOption("wordType", "desc")).toBeUndefined();
  });
});
