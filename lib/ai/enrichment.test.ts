import { afterEach, describe, expect, it, vi } from "vitest";
import { azureTranslate, geminiEnrich } from "./enrichment";

// Values pasted into the Vercel dashboard can carry a BOM (U+FEFF) — these
// tests pin the env-sanitizing behavior that fixed enrichment in production.
const BOM = "\uFEFF";

function okJson(data: unknown) {
  return { ok: true, status: 200, json: async () => data, text: async () => "" };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("azureTranslate env hygiene", () => {
  it("strips BOM and whitespace from key/region before they hit headers", async () => {
    vi.stubEnv("AZURE_TRANSLATOR_KEY", `${BOM}azure-key `);
    vi.stubEnv("AZURE_TRANSLATOR_REGION", " eastus");
    vi.stubEnv("AZURE_TRANSLATOR_ENDPOINT", "");

    const fetchMock = vi
      .fn()
      .mockResolvedValue(okJson([{ translations: [{ text: "dog" }] }]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(azureTranslate(["perro"])).resolves.toEqual(["dog"]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("https://api.cognitive.microsofttranslator.com");
    expect(init.headers["Ocp-Apim-Subscription-Key"]).toBe("azure-key");
    expect(init.headers["Ocp-Apim-Subscription-Region"]).toBe("eastus");
  });

  it("treats a BOM/whitespace-only key as unset", async () => {
    vi.stubEnv("AZURE_TRANSLATOR_KEY", `${BOM} `);
    await expect(azureTranslate(["perro"])).rejects.toThrow(
      "AZURE_TRANSLATOR_KEY is not set",
    );
  });
});

describe("geminiEnrich env hygiene + fallback", () => {
  const card = {
    id: "c1",
    term: "perro",
    translation: "dog",
    wordType: "NOUN",
    gender: "MASCULINE",
    notes: null,
  };
  const enrichment = [{ id: "c1", example: "El perro.", exampleEn: "The dog.", emoji: "🐶" }];
  const geminiBody = okJson({
    candidates: [{ content: { parts: [{ text: JSON.stringify(enrichment) }] } }],
  });

  it("puts the cleaned key (no BOM) in the request URL", async () => {
    vi.stubEnv("GEMINI_API_KEY", `${BOM}gem-key `);
    vi.stubEnv("GEMINI_MODEL", "");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "");

    const fetchMock = vi.fn().mockResolvedValue(geminiBody);
    vi.stubGlobal("fetch", fetchMock);

    await expect(geminiEnrich([card])).resolves.toEqual(enrichment);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("models/gemini-2.5-flash:generateContent?key=gem-key");
    expect(url).not.toContain(BOM);
  });

  it("retries on the fallback model when the primary returns 429", async () => {
    vi.stubEnv("GEMINI_API_KEY", "gem-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "gemini-2.5-flash-lite");
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => "quota" })
      .mockResolvedValueOnce(geminiBody);
    vi.stubGlobal("fetch", fetchMock);

    await expect(geminiEnrich([card])).resolves.toEqual(enrichment);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain("models/gemini-2.5-flash-lite:");
  });
});
