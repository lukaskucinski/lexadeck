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
  it("keeps the picked language for a Languages use-case", () => {
    expect(profileFromOnboarding({ primarySubject: "languages", primaryLanguage: "ja" })).toEqual({
      primarySubject: "languages",
      primaryLanguage: "ja",
    });
  });

  it("defaults a Languages use-case with no language to Spanish", () => {
    expect(profileFromOnboarding({ primarySubject: "languages", primaryLanguage: "" })).toEqual({
      primarySubject: "languages",
      primaryLanguage: "es",
    });
    expect(profileFromOnboarding({ primarySubject: "languages" })).toEqual({
      primarySubject: "languages",
      primaryLanguage: "es",
    });
  });

  it("stores null language for a domain use-case (ignores any picked language)", () => {
    expect(profileFromOnboarding({ primarySubject: "medicine", primaryLanguage: "es" })).toEqual({
      primarySubject: "medicine",
      primaryLanguage: null,
    });
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
});
