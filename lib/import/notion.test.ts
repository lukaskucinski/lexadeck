import { describe, expect, it } from "vitest";
import {
  buildTranslationMap,
  joinKey,
  parseMdFile,
  parseNotionExport,
  stripBom,
} from "./notion";

const BOM = "﻿";

const SAMPLE_MD = `# Acogedor

Last Review: April 3, 2023
Next Review: April 3, 2023
Stage: Adjectives

- Answer: Cozy

    <aside>
    💡

    </aside>


---

## Notes:
`;

const GRAMMAR_MD = `# Adjectives almost always come after the noun

Stage: Grammar Rules

- Answer:
`;

function csv(rows: string[]): string {
  return [
    `Vocab Word,Audio,Conjugation,Description,Last Review,Next Review,Resource,Stage`,
    ...rows,
  ].join("\n");
}

describe("stripBom", () => {
  it("removes a leading BOM", () => {
    expect(stripBom(`${BOM}Vocab Word`)).toBe("Vocab Word");
  });

  it("leaves clean text alone", () => {
    expect(stripBom("Vocab Word")).toBe("Vocab Word");
  });
});

describe("parseMdFile", () => {
  it("extracts term, stage and answer", () => {
    expect(parseMdFile(SAMPLE_MD)).toEqual({
      term: "Acogedor",
      stage: "Adjectives",
      answer: "Cozy",
    });
  });

  it("returns null answer when the Answer line is empty", () => {
    expect(parseMdFile(GRAMMAR_MD)).toEqual({
      term: "Adjectives almost always come after the noun",
      stage: "Grammar Rules",
      answer: null,
    });
  });

  it("does not slurp the aside block after an empty Answer line", () => {
    const md = `# El Año

Last Review: April 3, 2023
Stage: Nouns (Male)

- Answer:

    <aside>
    💡

    </aside>
`;
    expect(parseMdFile(md)).toEqual({
      term: "El Año",
      stage: "Nouns (Male)",
      answer: null,
    });
  });

  it("handles accented terms with NFC-stable keys", () => {
    const md = `# Añadir\n\nStage: Verbs\n\n- Answer: To add\n`;
    const entry = parseMdFile(md)!;
    expect(joinKey(entry.term, entry.stage)).toBe(joinKey("añadir", "verbs"));
  });
});

describe("parseNotionExport", () => {
  it("parses CSV with BOM and maps stages", () => {
    const { cards, report } = parseNotionExport({
      csvText:
        BOM +
        csv([
          `Acogedor,,,,"April 3, 2023","April 3, 2023",,Adjectives`,
          `La Bufanda,,,,"April 3, 2023","April 3, 2023",,Nouns Female`,
          `Estar,,"Está (Formal)",,"April 3, 2023","April 3, 2023",,Verbs`,
        ]),
      mdContents: [SAMPLE_MD],
    });

    expect(report.csvRows).toBe(3);
    expect(report.imported).toBe(3);
    expect(cards[0]).toMatchObject({
      term: "Acogedor",
      wordType: "ADJECTIVE",
      translation: "Cozy",
    });
    expect(cards[1]).toMatchObject({
      term: "La Bufanda",
      wordType: "NOUN",
      gender: "FEMININE",
      translation: null,
    });
    expect(cards[2]).toMatchObject({
      term: "Estar",
      wordType: "VERB",
      conjugation: "Está (Formal)",
    });
  });

  it("merges exact (term, stage) duplicates, filling missing fields", () => {
    const { cards, report } = parseNotionExport({
      csvText: csv([
        `Despertarse,,,,,,,Verbs`,
        `Despertarse,,,"To wake oneself",,,,Verbs`,
      ]),
      mdContents: [],
    });

    expect(report.imported).toBe(1);
    expect(report.duplicatesMerged).toBe(1);
    expect(cards[0].notes).toBe("To wake oneself");
  });

  it("keeps cross-type repeats as separate cards", () => {
    const { report } = parseNotionExport({
      csvText: csv([`Bien,,,,,,,Adjectives`, `Bien,,,,,,,Adverbs`]),
      mdContents: [],
    });
    expect(report.imported).toBe(2);
    expect(report.duplicatesMerged).toBe(0);
  });

  it("never assigns translations to grammar rules", () => {
    const { cards } = parseNotionExport({
      csvText: csv([
        `"Adjectives almost always come after the noun",,,"In most cases...",,,,Grammar Rules`,
      ]),
      mdContents: [
        `# Adjectives almost always come after the noun\n\nStage: Grammar Rules\n\n- Answer: Should never appear\n`,
      ],
    });
    expect(cards[0].cardType).toBe("GRAMMAR");
    expect(cards[0].translation).toBeNull();
  });

  it("flags unknown stages and maps them to OTHER", () => {
    const { cards, report } = parseNotionExport({
      csvText: csv([`Algo,,,,,,,Mystery Stage`]),
      mdContents: [],
    });
    expect(cards[0].wordType).toBe("OTHER");
    expect(report.unknownStages).toEqual(["Mystery Stage"]);
  });

  it("counts translation coverage in the report", () => {
    const { report } = parseNotionExport({
      csvText: csv([`Acogedor,,,,,,,Adjectives`, `Lograr,,,,,,,Verbs`]),
      mdContents: [SAMPLE_MD],
    });
    expect(report.withTranslation).toBe(1);
    expect(report.mdAnswersFound).toBe(1);
    expect(report.mdAnswersMatched).toBe(1);
  });
});

describe("buildTranslationMap", () => {
  it("indexes by (term, stage) and skips empty answers", () => {
    const { map, parsed, answers } = buildTranslationMap([SAMPLE_MD, GRAMMAR_MD]);
    expect(parsed).toBe(2);
    expect(answers).toBe(1);
    expect(map.get(joinKey("Acogedor", "Adjectives"))).toBe("Cozy");
  });
});
