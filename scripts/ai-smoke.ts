/**
 * Smoke test for the AI providers in .env — one tiny request each.
 *   npx tsx scripts/ai-smoke.ts
 */
import "dotenv/config";
import { geminiConjugate, geminiEnrich, normalizeEnrichment } from "../lib/ai/enrichment";
import { getConjugationSpec } from "../lib/conjugation";

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
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  // exercise the real enrichment path, including the expanded detail layer
  const [raw] = await geminiEnrich([
    { id: "smoke", term: "gozar", translation: "to enjoy", wordType: null, gender: null, notes: null },
  ]);
  if (!raw) throw new Error("Gemini returned no item");
  const item = normalizeEnrichment(raw);
  const dash = (s: string) => s || "—";
  console.log(`GEMINI OK (${model}):`);
  console.log(`  wordType=${item.wordType} gender=${item.gender ?? "—"} emoji=${dash(item.emoji)}`);
  console.log(`  example:      ${dash(item.example)}`);
  console.log(`  usagePattern: ${dash(item.usagePattern)}`);
  console.log(`  collocations: ${dash(item.collocations.join(" · "))}`);
  console.log(`  conjugation:  ${dash(item.conjugation.replace(/\n/g, " / "))}`);
  console.log(`  etymology:    ${dash(item.etymology)}`);
  console.log(`  wordFamily:   ${dash(item.wordFamily.join(" · "))}`);
  console.log(`  synonyms:     ${dash(item.synonyms.map((s) => `${s.es} (${s.en})`).join(", "))}`);
  console.log(`  correction:   ${dash(item.correction)}`);
}

async function testConjugation(): Promise<void> {
  // pedir is the e→i stem-changer the deterministic JS libs got wrong
  const spec = getConjugationSpec("es")!;
  const raw = await geminiConjugate("pedir", spec);
  const data = spec.build("pedir", raw);
  const tenses = data.groups.flatMap((g) => g.tenses);
  const present = tenses.find((t) => t.label === "Present");
  const presentPerfect = tenses.find((t) => t.label === "Present perfect");
  console.log("GEMINI CONJUGATION OK (pedir):");
  console.log(`  present:    ${present?.forms.join(", ")}`);
  console.log(`  headers:    ${data.headers.map((h) => `${h.label}=${h.value}`).join("  ")}`);
  console.log(`  pres.perfect (derived): ${presentPerfect?.forms.join(", ")}`);
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
  try {
    await testConjugation();
  } catch (err) {
    failed = true;
    console.error("GEMINI CONJUGATION FAILED:", (err as Error).message);
  }
  if (failed) process.exit(1);
  console.log("\nAI SMOKE: PASS");
}

main();
