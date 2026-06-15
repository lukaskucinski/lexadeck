import { describe, expect, it } from "vitest";
import {
  DEFAULT_SUBJECT,
  getSubjectProfile,
  isLanguageSubject,
  SUBJECT_OPTIONS,
  SUBJECT_SLUGS,
  subjectTaglineWord,
} from "./subjects";

describe("getSubjectProfile", () => {
  it("returns a profile for each known subject slug", () => {
    expect(getSubjectProfile("languages")?.label).toBe("Languages");
    expect(getSubjectProfile("medicine")?.label).toBe("Medicine");
    expect(getSubjectProfile("coding")?.label).toBe("Coding");
  });

  it("is case-insensitive and tolerates whitespace", () => {
    expect(getSubjectProfile("MEDICINE")?.slug).toBe("medicine");
    expect(getSubjectProfile(" law ")?.slug).toBe("law");
  });

  it("returns null for an unknown or empty subject", () => {
    expect(getSubjectProfile("astrology")).toBeNull();
    expect(getSubjectProfile("")).toBeNull();
    expect(getSubjectProfile(null)).toBeNull();
    expect(getSubjectProfile(undefined)).toBeNull();
  });
});

describe("subject registry shape", () => {
  it("SUBJECT_SLUGS lists exactly the nine canonical subjects", () => {
    expect([...SUBJECT_SLUGS].sort()).toEqual(
      [
        "coding",
        "exams",
        "geography",
        "history",
        "languages",
        "law",
        "medicine",
        "music",
        "science",
      ].sort(),
    );
  });

  it("every subject has a non-empty label and tagline word", () => {
    for (const slug of SUBJECT_SLUGS) {
      const profile = getSubjectProfile(slug)!;
      expect(profile.label.length).toBeGreaterThan(0);
      expect(profile.taglineWord.length).toBeGreaterThan(0);
    }
  });

  it("SUBJECT_OPTIONS exposes one {slug,label} per subject for the form", () => {
    expect(SUBJECT_OPTIONS.map((o) => o.slug).sort()).toEqual([...SUBJECT_SLUGS].sort());
    expect(SUBJECT_OPTIONS.every((o) => o.label.length > 0)).toBe(true);
  });

  it("the default subject is languages", () => {
    expect(DEFAULT_SUBJECT).toBe("languages");
    expect(getSubjectProfile(DEFAULT_SUBJECT)?.slug).toBe("languages");
  });
});

describe("promptContext gating", () => {
  it("the languages subject carries no extra prompt context (no-op on the language path)", () => {
    expect(getSubjectProfile("languages")!.promptContext).toBe("");
  });

  it("every non-language subject carries a non-empty prompt context", () => {
    for (const slug of SUBJECT_SLUGS) {
      if (slug === "languages") continue;
      expect(getSubjectProfile(slug)!.promptContext.length).toBeGreaterThan(0);
    }
  });
});

describe("subjectTaglineWord", () => {
  it("returns the subject's tagline word", () => {
    expect(subjectTaglineWord("languages")).toBe("language");
    expect(subjectTaglineWord("medicine")).toBe("medicine");
  });

  it("falls back to the language word for an unknown subject", () => {
    expect(subjectTaglineWord("astrology")).toBe("language");
    expect(subjectTaglineWord(null)).toBe("language");
  });
});

describe("isLanguageSubject", () => {
  it("is true only for the languages subject", () => {
    expect(isLanguageSubject("languages")).toBe(true);
    expect(isLanguageSubject("LANGUAGES")).toBe(true);
    expect(isLanguageSubject("medicine")).toBe(false);
    expect(isLanguageSubject(null)).toBe(false);
  });
});
