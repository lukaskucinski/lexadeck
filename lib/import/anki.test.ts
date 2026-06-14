import { describe, expect, it } from "vitest";
import { parseDeckCsv } from "./deckCsv";
import {
  analyzeAnki,
  analyzeSource,
  ankiModelFields,
  ankiNotesToSource,
  ankiToCsv,
  defaultMapping,
  isAnkiExport,
  sourceToCsv,
  stripAnkiHtml,
} from "./anki";

const lines = (...l: string[]) => l.join("\n");

describe("isAnkiExport", () => {
  it("detects Anki directive headers", () => {
    expect(isAnkiExport(lines("#separator:tab", "#html:true", "hola\thello"))).toBe(true);
    expect(isAnkiExport("#columns:Front\tBack\nhola\thello")).toBe(true);
  });

  it("treats normal CSV / TSV as not Anki", () => {
    expect(isAnkiExport("Term,Translation\nhola,hello")).toBe(false);
    expect(isAnkiExport("Term\tTranslation\nhola\thello")).toBe(false);
    expect(isAnkiExport("")).toBe(false);
  });
});

describe("analyzeAnki", () => {
  const sample = lines(
    "#separator:tab",
    "#html:true",
    "#columns:Front\tBack\tTags",
    "#tags column:3",
    "hola\t<b>hello</b>\tgreeting",
    "adiós\tgoodbye\tgreeting",
  );

  it("reads separator, html flag, column names and meta columns", () => {
    const a = analyzeAnki(sample);
    expect(a.separator).toBe("\t");
    expect(a.html).toBe(true);
    expect(a.fieldNames).toEqual(["Front", "Back", "Tags"]);
    expect(a.columnCount).toBe(3);
    expect(a.dataRowCount).toBe(2);
    expect(a.ignoreColumns).toContain(2); // #tags column:3 → 0-based index 2
    expect(a.sampleRows[0][0]).toBe("hola");
  });
});

describe("defaultMapping", () => {
  it("pre-fills from #columns names and ignores meta columns", () => {
    const a = analyzeAnki(
      lines("#separator:tab", "#columns:Front\tBack\tTags", "#tags column:3", "hola\thello\tx"),
    );
    expect(defaultMapping(a)).toEqual(["term", "translation", "ignore"]);
  });

  it("falls back to positional term/translation with no column names", () => {
    const a = analyzeAnki(lines("#separator:tab", "hola\thello\textra"));
    expect(defaultMapping(a)).toEqual(["term", "translation", "ignore"]);
  });

  it("guarantees a Term column when no name maps to one", () => {
    const a = analyzeAnki(lines("#separator:tab", "#columns:Reading\tMeaning", "よむ\tto read"));
    const m = defaultMapping(a);
    expect(m[0]).toBe("term"); // Reading promoted since nothing else is a term
    expect(m[1]).toBe("translation"); // Meaning → translation alias
  });
});

describe("stripAnkiHtml", () => {
  it("strips tags, converts breaks, decodes entities, drops media", () => {
    expect(stripAnkiHtml("<b>hola</b>")).toBe("hola");
    expect(stripAnkiHtml("line1<br>line2")).toBe("line1\nline2");
    expect(stripAnkiHtml("a&nbsp;b &amp; c")).toBe("a b & c");
    expect(stripAnkiHtml("hi[sound:audio.mp3]")).toBe("hi");
    expect(stripAnkiHtml('<img src="x.png">word')).toBe("word");
  });
});

describe("ankiModelFields (.apkg col.models JSON)", () => {
  const models = JSON.stringify({
    "123": { name: "Basic", flds: [{ name: "Front", ord: 0 }, { name: "Back", ord: 1 }] },
    "999": { name: "Other", flds: [{ name: "X", ord: 0 }] },
  });

  it("returns a model's field names ordered by ord", () => {
    expect(ankiModelFields(models, "123")).toEqual(["Front", "Back"]);
  });

  it("tolerates out-of-order flds", () => {
    const m = JSON.stringify({ "1": { flds: [{ name: "B", ord: 1 }, { name: "A", ord: 0 }] } });
    expect(ankiModelFields(m, "1")).toEqual(["A", "B"]);
  });

  it("returns [] for empty or invalid models json", () => {
    expect(ankiModelFields("{}", "123")).toEqual([]);
    expect(ankiModelFields("not json", "123")).toEqual([]);
  });
});

describe("ankiNotesToSource (.apkg notes)", () => {
  const models = JSON.stringify({
    "1": { name: "Verb", flds: [{ name: "Infinitiv", ord: 0 }, { name: "Bedeutung", ord: 1 }] },
  });

  it("splits flds on the \\x1f separator and uses the dominant model's fields", () => {
    const src = ankiNotesToSource(models, [
      { mid: "1", flds: "seinto be" },
      { mid: "1", flds: "habento have" },
    ]);
    expect(src.fieldNames).toEqual(["Infinitiv", "Bedeutung"]);
    expect(src.rows).toEqual([
      ["sein", "to be"],
      ["haben", "to have"],
    ]);
    expect(src.html).toBe(true); // Anki note fields are HTML
  });

  it("feeds the mapping pipeline and strips HTML through parseDeckCsv", () => {
    const src = ankiNotesToSource(
      JSON.stringify({ "1": { flds: [{ name: "Front", ord: 0 }, { name: "Back", ord: 1 }] } }),
      [{ mid: "1", flds: "Hund<b>dog</b>[sound:hund.mp3]" }],
    );
    const analysis = analyzeSource(src);
    expect(analysis.columnCount).toBe(2);
    expect(analysis.fieldNames).toEqual(["Front", "Back"]);

    const parsed = parseDeckCsv(sourceToCsv(src, ["term", "translation"]));
    expect(parsed.cards[0]).toMatchObject({ term: "Hund", translation: "dog" });
  });
});

describe("ankiToCsv → parseDeckCsv round-trip", () => {
  it("maps columns to canonical fields and strips HTML", () => {
    const text = lines("#separator:tab", "#html:true", "hola\t<b>hello</b>", "adiós\tgoodbye");
    const parsed = parseDeckCsv(ankiToCsv(text, ["term", "translation"]));
    expect(parsed.headerError).toBeUndefined();
    expect(parsed.cards.map((c) => [c.term, c.translation])).toEqual([
      ["hola", "hello"],
      ["adiós", "goodbye"],
    ]);
  });

  it("joins multiple columns mapped to the same field", () => {
    const text = lines("#separator:tab", "hola\treading\tmeaning");
    const parsed = parseDeckCsv(ankiToCsv(text, ["term", "notes", "notes"]));
    expect(parsed.cards[0].notes).toBe("reading\nmeaning");
  });

  it("drops ignored columns", () => {
    const text = lines("#separator:tab", "hola\thello\tguid-xyz");
    const parsed = parseDeckCsv(ankiToCsv(text, ["term", "translation", "ignore"]));
    expect(parsed.cards[0]).toMatchObject({ term: "hola", translation: "hello" });
  });

  it("produces a header-less-Term CSV that parseDeckCsv rejects when no Term is mapped", () => {
    const text = lines("#separator:tab", "hola\thello");
    const parsed = parseDeckCsv(ankiToCsv(text, ["ignore", "translation"]));
    expect(parsed.headerError).toMatch(/term/i);
  });
});
