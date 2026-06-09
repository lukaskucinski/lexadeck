/**
 * Smoke test for the AI providers in .env — one tiny request each.
 *   npx tsx scripts/ai-smoke.ts
 */
import "dotenv/config";

async function testAzure(): Promise<void> {
  const key = process.env.AZURE_TRANSLATOR_KEY;
  const endpoint =
    process.env.AZURE_TRANSLATOR_ENDPOINT ?? "https://api.cognitive.microsofttranslator.com";
  const region = process.env.AZURE_TRANSLATOR_REGION;
  if (!key || !region) throw new Error("Azure env vars missing");

  const res = await fetch(`${endpoint}/translate?api-version=3.0&from=es&to=en`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Ocp-Apim-Subscription-Region": region,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([{ Text: "la bufanda" }, { Text: "fallecer" }]),
  });
  if (!res.ok) throw new Error(`Azure ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { translations: { text: string }[] }[];
  console.log("AZURE OK:");
  console.log(`  la bufanda → ${data[0].translations[0].text}`);
  console.log(`  fallecer   → ${data[1].translations[0].text}`);
}

async function testGemini(): Promise<void> {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  if (!key) throw new Error("GEMINI_API_KEY missing");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'Return JSON only: {"example": "<one short Spanish sentence using the verb fallecer>", "emoji": "<one emoji>"}',
              },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  console.log(`GEMINI OK (${model}):`);
  console.log(`  ${text.replaceAll("\n", " ").slice(0, 200)}`);
}

async function main() {
  let failed = false;
  try {
    await testAzure();
  } catch (err) {
    failed = true;
    console.error("AZURE FAILED:", (err as Error).message);
  }
  try {
    await testGemini();
  } catch (err) {
    failed = true;
    console.error("GEMINI FAILED:", (err as Error).message);
  }
  if (failed) process.exit(1);
  console.log("\nAI SMOKE: PASS");
}

main();
