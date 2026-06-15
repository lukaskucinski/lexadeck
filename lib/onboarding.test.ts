import { describe, expect, it } from "vitest";
import { onboardingGateDecision, parseOnboarding, profileFromOnboarding } from "./onboarding";

describe("onboardingGateDecision", () => {
  it("sends a non-allowlisted user to request-access (even if somehow onboarded)", () => {
    expect(onboardingGateDecision({ allowed: false, onboardingCompletedAt: null })).toBe(
      "request-access",
    );
    expect(onboardingGateDecision({ allowed: false, onboardingCompletedAt: new Date() })).toBe(
      "request-access",
    );
  });

  it("sends an allowlisted but not-yet-onboarded user to onboarding", () => {
    expect(onboardingGateDecision({ allowed: true, onboardingCompletedAt: null })).toBe(
      "onboarding",
    );
    expect(onboardingGateDecision({ allowed: true, onboardingCompletedAt: undefined })).toBe(
      "onboarding",
    );
  });

  it("lets an allowlisted, onboarded user through", () => {
    expect(onboardingGateDecision({ allowed: true, onboardingCompletedAt: new Date() })).toBe("ok");
  });
});

describe("profileFromOnboarding", () => {
  it("keeps the picked language + CEFR for a Languages use-case", () => {
    expect(
      profileFromOnboarding({ primarySubject: "languages", primaryLanguage: "ja", cefrLevel: "B2" }),
    ).toEqual({
      primarySubject: "languages",
      primaryLanguage: "ja",
      ageRange: null,
      cefrLevel: "B2",
    });
  });

  it("defaults a Languages use-case with no language to Spanish", () => {
    expect(profileFromOnboarding({ primarySubject: "languages", primaryLanguage: "" })).toEqual({
      primarySubject: "languages",
      primaryLanguage: "es",
      ageRange: null,
      cefrLevel: null,
    });
    expect(profileFromOnboarding({ primarySubject: "languages" })).toEqual({
      primarySubject: "languages",
      primaryLanguage: "es",
      ageRange: null,
      cefrLevel: null,
    });
  });

  it("stores null language + null CEFR for a domain use-case (CEFR never applies)", () => {
    expect(
      profileFromOnboarding({ primarySubject: "medicine", primaryLanguage: "es", cefrLevel: "C1" }),
    ).toEqual({
      primarySubject: "medicine",
      primaryLanguage: null,
      ageRange: null,
      cefrLevel: null,
    });
  });

  it("carries the age range through for any subject", () => {
    expect(
      profileFromOnboarding({ primarySubject: "law", ageRange: "25-34" }).ageRange,
    ).toBe("25-34");
    expect(
      profileFromOnboarding({ primarySubject: "languages", ageRange: "65-plus" }).ageRange,
    ).toBe("65-plus");
  });
});

describe("parseOnboarding", () => {
  it("requires accepted terms", () => {
    const r = parseOnboarding({ primarySubject: "languages", primaryLanguage: "es" });
    expect(r.success).toBe(false);
  });

  it("accepts a valid submission and defaults the subject to languages", () => {
    const r = parseOnboarding({ acceptedTerms: "on" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.primarySubject).toBe("languages");
      expect(r.data.acceptedTerms).toBe(true);
    }
  });

  it("rejects an unknown subject", () => {
    const r = parseOnboarding({ primarySubject: "astrology", acceptedTerms: "on" });
    expect(r.success).toBe(false);
  });

  it("treats empty age/CEFR selections as undefined (both skippable)", () => {
    const r = parseOnboarding({ acceptedTerms: "on", ageRange: "", cefrLevel: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.ageRange).toBeUndefined();
      expect(r.data.cefrLevel).toBeUndefined();
    }
  });

  it("accepts valid age + CEFR selections", () => {
    const r = parseOnboarding({ acceptedTerms: "on", ageRange: "25-34", cefrLevel: "B1" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.ageRange).toBe("25-34");
      expect(r.data.cefrLevel).toBe("B1");
    }
  });
});
