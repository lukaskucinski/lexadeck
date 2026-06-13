import { describe, expect, it } from "vitest";
import { chunkIds, ENRICH_BATCH_SIZE, isQuotaError } from "./enrichBatch";

describe("chunkIds", () => {
  it("splits into fixed-size chunks with a remainder", () => {
    expect(chunkIds(["a", "b", "c", "d", "e"], 2)).toEqual([["a", "b"], ["c", "d"], ["e"]]);
  });

  it("returns one chunk when size >= length", () => {
    expect(chunkIds(["a", "b"], 10)).toEqual([["a", "b"]]);
  });

  it("returns [] for an empty list", () => {
    expect(chunkIds([], 5)).toEqual([]);
  });

  it("rejects a non-positive size rather than looping forever", () => {
    expect(() => chunkIds(["a"], 0)).toThrow();
    expect(() => chunkIds(["a"], -3)).toThrow();
  });

  it("ships a sane default batch size", () => {
    expect(ENRICH_BATCH_SIZE).toBeGreaterThan(0);
    expect(ENRICH_BATCH_SIZE).toBeLessThanOrEqual(40);
  });
});

describe("isQuotaError", () => {
  it("flags Gemini daily free-tier exhaustion (429 / RESOURCE_EXHAUSTED)", () => {
    expect(isQuotaError("Gemini 429: { error: { status: 'RESOURCE_EXHAUSTED' } }")).toBe(true);
    expect(isQuotaError("Gemini 429: quota exceeded for this project")).toBe(true);
  });

  it("flags an Azure Translator rate-limit / quota response", () => {
    expect(isQuotaError("Azure Translator 429: too many requests")).toBe(true);
    expect(isQuotaError("quota exceeded")).toBe(true);
  });

  it("does NOT flag a transient overload (503) as a hard quota stop", () => {
    expect(isQuotaError("Gemini 503: model is overloaded")).toBe(false);
  });

  it("does NOT flag unrelated errors", () => {
    expect(isQuotaError("Card not found")).toBe(false);
    expect(isQuotaError("")).toBe(false);
  });
});
