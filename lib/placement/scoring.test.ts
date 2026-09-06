import { describe, expect, it } from "vitest";
import { CEFR_LEVELS, type CefrLevel } from "@/lib/ai/cefr";
import type { PlacementItem } from "./items";
import { bandWeight, parsePlacementResponses, scorePlacement } from "./scoring";

// A synthetic 2-items-per-band bank (A1..C2 = 12 items) mirroring the real
// Spanish bank's shape, so scoring tests don't depend on the Spanish content.
const ITEMS: PlacementItem[] = CEFR_LEVELS.flatMap((level, b) =>
  [0, 1].map((n) => ({
    id: `${level}-${n}`,
    level,
    prompt: `q ${level} ${n}`,
    promptEn: `q ${level} ${n}`,
    choices: ["a", "b", "c", "d"],
    // vary the correct index so "always pick 0" doesn't ace the test
    answer: (b + n) % 4,
  })),
);

/** Responses that answer the first `count` items (ordered easy→hard) correctly. */
function correctThrough(count: number) {
  return ITEMS.slice(0, count).map((i) => ({ id: i.id, choice: i.answer }));
}

describe("bandWeight", () => {
  it("ranks A1=1 … C2=6", () => {
    expect(bandWeight("A1")).toBe(1);
    expect(bandWeight("A2")).toBe(2);
    expect(bandWeight("B1")).toBe(3);
    expect(bandWeight("C2")).toBe(6);
  });
});

describe("scorePlacement", () => {
  it("floors at A1 when nothing is correct", () => {
    expect(scorePlacement(ITEMS, [])).toBe("A1");
    const allWrong = ITEMS.map((i) => ({ id: i.id, choice: (i.answer + 1) % 4 }));
    expect(scorePlacement(ITEMS, allWrong)).toBe("A1");
  });

  it("caps at C2 when everything is correct", () => {
    expect(scorePlacement(ITEMS, correctThrough(ITEMS.length))).toBe("C2");
  });

  it("places at the band the learner aces up to", () => {
    // 2 items per band: acing through band index N lands in that band.
    expect(scorePlacement(ITEMS, correctThrough(2))).toBe("A1"); // through A1
    expect(scorePlacement(ITEMS, correctThrough(4))).toBe("A2"); // through A2
    expect(scorePlacement(ITEMS, correctThrough(6))).toBe("B1"); // through B1
    expect(scorePlacement(ITEMS, correctThrough(8))).toBe("B2"); // through B2
    expect(scorePlacement(ITEMS, correctThrough(10))).toBe("C1"); // through C1
  });

  it("does not let a couple of lucky hard hits vault a beginner to the top", () => {
    const onlyTwoC2 = ITEMS.filter((i) => i.level === "C2").map((i) => ({
      id: i.id,
      choice: i.answer,
    }));
    expect(scorePlacement(ITEMS, onlyTwoC2)).toBe("B1"); // weight 6+6 = 12
  });

  it("is monotonic: adding a correct item never lowers the band", () => {
    const order: CefrLevel[] = [];
    for (let n = 0; n <= ITEMS.length; n++) {
      order.push(scorePlacement(ITEMS, correctThrough(n)));
    }
    for (let i = 1; i < order.length; i++) {
      expect(CEFR_LEVELS.indexOf(order[i])).toBeGreaterThanOrEqual(
        CEFR_LEVELS.indexOf(order[i - 1]),
      );
    }
  });

  it("treats unknown response ids as wrong (ignored)", () => {
    const bogus = [{ id: "nope", choice: 0 }];
    expect(scorePlacement(ITEMS, bogus)).toBe("A1");
  });
});

describe("parsePlacementResponses", () => {
  it("reads q_<id> fields and ignores blank / out-of-range / unknown", () => {
    const fields: Record<string, string> = {
      "q_A1-0": String(ITEMS[0].answer),
      "q_A1-1": "", // blank → skipped
      "q_A2-0": "9", // out of range → skipped
      q_unrelated: "1", // not an item → skipped
    };
    const got = parsePlacementResponses((k) => fields[k] ?? null, ITEMS);
    expect(got).toEqual([{ id: "A1-0", choice: ITEMS[0].answer }]);
  });

  it("round-trips through scoring", () => {
    const fields: Record<string, string> = {};
    for (const i of ITEMS) fields[`q_${i.id}`] = String(i.answer);
    const responses = parsePlacementResponses((k) => fields[k] ?? null, ITEMS);
    expect(scorePlacement(ITEMS, responses)).toBe("C2");
  });
});
