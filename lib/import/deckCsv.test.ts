import { describe, expect, it } from "vitest";
import { MAX_IMPORT_ROWS, parseDeckCsv, TEMPLATE_HEADER } from "./deckCsv";

const FULL_HEADER =
  "Term,Translation,Word Type,Gender,Card Type,Example,Example Translation,Notes,Conjugation,Emoji";

describe("parseDeckCsv · file structure", () => {
  it("parses a comma CSV with every column populated", () => {
    const csv = [
      FULL_HEADER,
      'el perro,dog,Noun,Masculine,Vocab,El perro corre.,The dog runs.,Common pet,,🐶',
    ].join("\n");

    const result = parseDeckCsv(csv);

    expect(result.headerError).toBeUndefined();
    expect(result.issues).toEqual([]);
    expect(result.totalRows).toBe(1);
    expect(result.cards).toEqual([
      {
        term: "el perro",
        translation: "dog",
        wordType: "NOUN",
        gender: "MASCULINE",
        cardType: "VOCAB",
        example: "El perro corre.",
        exampleEn: "The dog runs.",
        notes: "Common pet",
        conjugation: null,
        emoji: "🐶",
      },
    ]);
  });

  it("strips a UTF-8 BOM before the header", () => {
    const csv = "\u{FEFF}Term,Translation\nhablar,to speak";
    const result = parseDeckCsv(csv);
    expect(result.headerError).toBeUndefined();
    expect(result.cards[0].term).toBe("hablar");
  });

  it("sniffs semicolon-delimited files (European Excel exports)", () => {
    const csv = "Term;Translation;Word Type\nla casa;house;Noun";
    const result = parseDeckCsv(csv);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].translation).toBe("house");
  });

  it("sniffs tab-delimited files (TSV)", () => {
    const csv = "Term\tTranslation\ncorrer\tto run";
    const result = parseDeckCsv(csv);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].term).toBe("correr");
  });

  it("handles quoted fields containing commas and escaped quotes", () => {
    const csv = [
      "Term,Translation,Example",
      '"sin embargo","however, nevertheless","Dijo ""sí"", sin embargo."',
    ].join("\r\n");
    const result = parseDeckCsv(csv);
    expect(result.cards[0].translation).toBe("however, nevertheless");
    expect(result.cards[0].example).toBe('Dijo "sí", sin embargo.');
  });

  it("skips blank lines but keeps original row numbers in issues", () => {
    const csv = ["Term,Translation", "uno,one", "", ",missing term", "dos,two"].join("\n");
    const result = parseDeckCsv(csv);
    expect(result.cards.map((c) => c.term)).toEqual(["uno", "dos"]);
    // the bad row is the 4th physical line of the file
    expect(result.issues).toEqual([
      { row: 4, term: null, message: "Term is required" },
    ]);
  });

  it("reports a header error when no term column is present", () => {
    const result = parseDeckCsv("English,Notes\ndog,common");
    expect(result.headerError).toMatch(/term/i);
    expect(result.cards).toEqual([]);
  });

  it("reports a header error for an empty file", () => {
    expect(parseDeckCsv("").headerError).toBeTruthy();
    expect(parseDeckCsv("\n\n").headerError).toBeTruthy();
  });

  it("reports a header error past the row cap", () => {
    const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `word${i}`);
    const result = parseDeckCsv(`Term\n${rows.join("\n")}`);
    expect(result.headerError).toMatch(/rows/i);
  });

  it("maps friendly header aliases onto canonical fields", () => {
    const csv = [
      "Word,English,Part of Speech,Example (Spanish),Example (English),Description",
      "gato,cat,Noun,El gato duerme.,The cat sleeps.,A feline",
    ].join("\n");
    const result = parseDeckCsv(csv);
    expect(result.cards[0]).toMatchObject({
      term: "gato",
      translation: "cat",
      wordType: "NOUN",
      example: "El gato duerme.",
      exampleEn: "The cat sleeps.",
      notes: "A feline",
    });
  });

  it("ignores unrecognized columns", () => {
    const csv = "Term,Translation,My Custom Column\nadiós,goodbye,whatever";
    const result = parseDeckCsv(csv);
    expect(result.headerError).toBeUndefined();
    expect(result.cards[0]).toMatchObject({ term: "adiós", translation: "goodbye" });
  });

  it("exports a template header that round-trips through the parser", () => {
    const result = parseDeckCsv(`${TEMPLATE_HEADER}\nprueba,test,Noun,Feminine,Vocab,,,,,`);
    expect(result.headerError).toBeUndefined();
    expect(result.cards[0]).toMatchObject({ term: "prueba", gender: "FEMININE" });
  });
});

describe("parseDeckCsv · values", () => {
  it("requires a term and reports the row", () => {
    const csv = "Term,Translation\n,orphan";
    const result = parseDeckCsv(csv);
    expect(result.cards).toEqual([]);
    expect(result.issues[0]).toMatchObject({ row: 2, message: "Term is required" });
  });

  it.each([
    ["Noun", "NOUN"],
    ["noun", "NOUN"],
    ["NOUNS", "NOUN"],
    ["verb", "VERB"],
    ["Adjectives", "ADJECTIVE"],
    ["expression", "EXPRESSION"],
  ])("coerces word type %s → %s", (input, expected) => {
    const result = parseDeckCsv(`Term,Word Type\npalabra,${input}`);
    expect(result.cards[0].wordType).toBe(expected);
  });

  it("defaults an empty word type to OTHER", () => {
    const result = parseDeckCsv("Term\npalabra");
    expect(result.cards[0].wordType).toBe("OTHER");
  });

  it("flags an unrecognized word type and skips the row", () => {
    const result = parseDeckCsv("Term,Word Type\npalabra,gerund");
    expect(result.cards).toEqual([]);
    expect(result.issues[0]).toMatchObject({
      row: 2,
      term: "palabra",
      message: 'Unknown word type "gerund"',
    });
  });

  it.each([
    ["m", "MASCULINE"],
    ["Masc", "MASCULINE"],
    ["FEMININE", "FEMININE"],
    ["f", "FEMININE"],
    ["either", "EITHER"],
    ["both", "EITHER"],
  ])("coerces gender %s → %s on nouns", (input, expected) => {
    const result = parseDeckCsv(`Term,Word Type,Gender\nla cosa,Noun,${input}`);
    expect(result.cards[0].gender).toBe(expected);
  });

  it("silently drops gender on non-nouns (mirrors the card form)", () => {
    const result = parseDeckCsv("Term,Word Type,Gender\ncorrer,Verb,m");
    expect(result.cards[0].gender).toBeNull();
    expect(result.issues).toEqual([]);
  });

  it("flags an unrecognized gender", () => {
    const result = parseDeckCsv("Term,Word Type,Gender\nla cosa,Noun,xyz");
    expect(result.cards).toEqual([]);
    expect(result.issues[0].message).toBe('Unknown gender "xyz"');
  });

  it("defaults card type from the word type (grammar/expression), else VOCAB", () => {
    const csv = [
      "Term,Word Type",
      "ser vs estar,Grammar",
      "dar en el clavo,Expression",
      "rojo,Adjective",
    ].join("\n");
    const result = parseDeckCsv(csv);
    expect(result.cards.map((c) => c.cardType)).toEqual(["GRAMMAR", "EXPRESSION", "VOCAB"]);
  });

  it("derives the word type from an explicit grammar card type", () => {
    const result = parseDeckCsv("Term,Card Type\nsubjunctive mood,Grammar");
    expect(result.cards[0]).toMatchObject({ cardType: "GRAMMAR", wordType: "GRAMMAR" });
  });

  it("flags an unrecognized card type", () => {
    const result = parseDeckCsv("Term,Card Type\npalabra,flashcard");
    expect(result.cards).toEqual([]);
    expect(result.issues[0].message).toBe('Unknown card type "flashcard"');
  });

  it("enforces field length caps", () => {
    const long = "x".repeat(201);
    const result = parseDeckCsv(`Term,Translation\n${long},too long`);
    expect(result.cards).toEqual([]);
    expect(result.issues[0].message).toMatch(/term.*200/i);
  });

  it("skips in-file duplicate terms case-insensitively, first row wins", () => {
    const csv = ["Term,Translation", "El Perro,dog", "el perro,hound", "gata,cat"].join("\n");
    const result = parseDeckCsv(csv);
    expect(result.cards.map((c) => c.term)).toEqual(["El Perro", "gata"]);
    expect(result.issues[0]).toMatchObject({
      row: 3,
      term: "el perro",
      message: "Duplicate of row 2",
    });
  });

  it("trims whitespace and stores empty optional fields as null", () => {
    const result = parseDeckCsv("Term,Translation,Notes\n  hola  ,  hello ,   ");
    expect(result.cards[0]).toMatchObject({ term: "hola", translation: "hello", notes: null });
  });
});
