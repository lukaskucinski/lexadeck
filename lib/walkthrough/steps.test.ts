import { describe, expect, it } from "vitest";
import { AGE_RANGE_SLUGS } from "@/lib/onboarding";
import {
  getTourSteps,
  TOUR_NAV_HREFS,
  tourPlanForAge,
  tourVariantForAge,
  type TourVariant,
} from "./steps";

const VARIANTS: TourVariant[] = ["young", "standard", "senior"];

describe("tourVariantForAge", () => {
  it("maps the age extremes to fuller variants, middle bands to standard", () => {
    expect(tourVariantForAge("under-18")).toBe("young");
    expect(tourVariantForAge("18-24")).toBe("standard");
    expect(tourVariantForAge("25-34")).toBe("standard");
    expect(tourVariantForAge("35-49")).toBe("standard");
    expect(tourVariantForAge("50-64")).toBe("senior");
    expect(tourVariantForAge("65-plus")).toBe("senior");
  });

  it("falls back to standard for null / undefined / unknown", () => {
    expect(tourVariantForAge(null)).toBe("standard");
    expect(tourVariantForAge(undefined)).toBe("standard");
    expect(tourVariantForAge("")).toBe("standard");
    expect(tourVariantForAge("ancient")).toBe("standard");
  });

  it("returns a known variant for every real AGE_RANGE slug", () => {
    for (const slug of AGE_RANGE_SLUGS) {
      expect(VARIANTS, slug).toContain(tourVariantForAge(slug));
    }
  });
});

describe("getTourSteps", () => {
  it("returns a non-empty step list for each variant", () => {
    for (const v of VARIANTS) expect(getTourSteps(v).length, v).toBeGreaterThan(0);
  });

  it("gives the extremes a fuller tour than the standard middle", () => {
    expect(getTourSteps("standard").length).toBeLessThan(getTourSteps("senior").length);
    expect(getTourSteps("standard").length).toBeLessThan(getTourSteps("young").length);
  });

  it("only highlights real nav hrefs (or nothing)", () => {
    const allowed = new Set<string>(TOUR_NAV_HREFS);
    for (const v of VARIANTS) {
      for (const step of getTourSteps(v)) {
        if (step.highlightHref != null) {
          expect(allowed.has(step.highlightHref), `${v}:${step.id}`).toBe(true);
        }
      }
    }
  });

  it("has unique step ids and non-empty copy within a variant", () => {
    for (const v of VARIANTS) {
      const steps = getTourSteps(v);
      const ids = steps.map((s) => s.id);
      expect(new Set(ids).size, v).toBe(ids.length);
      for (const s of steps) {
        expect(s.title.trim().length, `${v}:${s.id} title`).toBeGreaterThan(0);
        expect(s.body.trim().length, `${v}:${s.id} body`).toBeGreaterThan(0);
      }
    }
  });

  it("never references age (silent tailoring)", () => {
    const banned = /\bage\b|years? old|\bsenior\b|\byoung(er)?\b|\bolder\b|tailor|customi[sz]/i;
    for (const v of VARIANTS) {
      for (const s of getTourSteps(v)) {
        expect(banned.test(s.title), `${v}:${s.id} title`).toBe(false);
        expect(banned.test(s.body), `${v}:${s.id} body`).toBe(false);
        if (s.cta) expect(banned.test(s.cta), `${v}:${s.id} cta`).toBe(false);
      }
    }
  });
});

describe("tourPlanForAge", () => {
  it("bundles the variant and its steps", () => {
    const plan = tourPlanForAge("65-plus");
    expect(plan.variant).toBe("senior");
    expect(plan.steps).toEqual(getTourSteps("senior"));
  });

  it("plans a standard tour when age is unknown", () => {
    expect(tourPlanForAge(null).variant).toBe("standard");
  });
});
