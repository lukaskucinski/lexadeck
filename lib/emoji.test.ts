import { describe, expect, it } from "vitest";
import { sanitizeEmoji } from "./emoji";

describe("sanitizeEmoji", () => {
  it("accepts simple emoji", () => {
    expect(sanitizeEmoji("🐶")).toBe("🐶");
    expect(sanitizeEmoji("☀️")).toBe("☀️");
    expect(sanitizeEmoji("🌅")).toBe("🌅");
  });

  it("accepts multi-codepoint sequences (ZWJ, skin tones, flags, keycaps)", () => {
    expect(sanitizeEmoji("👩‍🚀")).toBe("👩‍🚀");
    expect(sanitizeEmoji("👍🏽")).toBe("👍🏽");
    expect(sanitizeEmoji("🇪🇸")).toBe("🇪🇸");
    expect(sanitizeEmoji("1️⃣")).toBe("1️⃣");
  });

  it("accepts up to three emoji, rejects more", () => {
    expect(sanitizeEmoji("🌧️🌈")).toBe("🌧️🌈");
    expect(sanitizeEmoji("🐶🐱🐭")).toBe("🐶🐱🐭");
    expect(sanitizeEmoji("🐶🐱🐭🐹")).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeEmoji(" 🐶 ")).toBe("🐶");
  });

  it("rejects letters, words, and punctuation", () => {
    expect(sanitizeEmoji("X")).toBeNull();
    expect(sanitizeEmoji("dog")).toBeNull();
    expect(sanitizeEmoji("?")).toBeNull();
  });

  it("rejects non-emoji symbols that render as tofu boxes", () => {
    expect(sanitizeEmoji("✦")).toBeNull(); // BLACK FOUR POINTED STAR — not RGI
    expect(sanitizeEmoji("⌘")).toBeNull();
    expect(sanitizeEmoji("□")).toBeNull(); // WHITE SQUARE
    expect(sanitizeEmoji("�")).toBeNull(); // REPLACEMENT CHARACTER
  });

  it("rejects text-presentation characters missing the emoji variation selector", () => {
    // U+2600 SUN without VS16 is text-presentation; many fonts lack a glyph
    expect(sanitizeEmoji("☀")).toBeNull();
  });

  it("rejects emoji mixed with text", () => {
    expect(sanitizeEmoji("🐶 dog")).toBeNull();
    expect(sanitizeEmoji("a🐶")).toBeNull();
  });

  it("rejects bare modifiers and broken surrogate halves", () => {
    expect(sanitizeEmoji("‍")).toBeNull(); // lone ZWJ
    expect(sanitizeEmoji("\uD83D")).toBeNull(); // unpaired high surrogate
    expect(sanitizeEmoji("️")).toBeNull(); // lone variation selector
  });

  it("maps empty/blank/nullish input to null", () => {
    expect(sanitizeEmoji("")).toBeNull();
    expect(sanitizeEmoji("   ")).toBeNull();
    expect(sanitizeEmoji(null)).toBeNull();
    expect(sanitizeEmoji(undefined)).toBeNull();
  });
});
