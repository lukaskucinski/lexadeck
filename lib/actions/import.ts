"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseDeckCsv, type RowIssue } from "@/lib/import/deckCsv";
import { emptySchedulerFields } from "@/lib/srs";

const MAX_TEXT_LENGTH = 2_000_000; // ~2 MB of CSV text
const PREVIEW_LIST_CAP = 100;

export interface ImportPreview {
  fileName: string;
  deckName: string;
  totalRows: number;
  importable: number;
  /** Terms already in the target deck (capped at PREVIEW_LIST_CAP). */
  deckDuplicates: string[];
  deckDuplicateTotal: number;
  /** Rows skipped by validation (capped at PREVIEW_LIST_CAP). */
  issues: RowIssue[];
  issueTotal: number;
}

export interface ImportOutcome {
  deckId: string;
  deckName: string;
  created: number;
  skippedDuplicates: number;
  skippedInvalid: number;
}

export interface ImportState {
  error?: string;
  preview?: ImportPreview;
  result?: ImportOutcome;
}

const normalizeTerm = (term: string) => term.normalize("NFC").trim().toLowerCase();

/** Default deck name from the uploaded file name: "My Words.csv" → "My Words". */
const deckNameFromFile = (fileName: string) =>
  fileName.replace(/\.[a-z0-9]+$/i, "").trim() || "Imported deck";

export async function importCards(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const mode = formData.get("mode") === "import" ? "import" : "preview";
  const csvText = String(formData.get("csvText") ?? "");
  const fileName = String(formData.get("fileName") ?? "").trim() || "import.csv";
  const target = String(formData.get("deck") ?? "");

  if (!csvText.trim()) return { error: "Choose a CSV file first." };
  if (csvText.length > MAX_TEXT_LENGTH) {
    return { error: "That file is too large — imports are capped at about 2 MB." };
  }

  const parsed = parseDeckCsv(csvText);
  if (parsed.headerError) return { error: parsed.headerError };

  // resolve the target deck
  let deckId: string | null = null;
  let deckName: string;
  let deckLanguage = "es";
  let existingTerms = new Set<string>();

  if (target === "new") {
    deckName =
      String(formData.get("newDeckName") ?? "").trim() || deckNameFromFile(fileName);
  } else {
    const deck = await prisma.deck.findUnique({ where: { id: target } });
    if (!deck) return { error: "Choose a deck to import into." };
    deckId = deck.id;
    deckName = deck.name;
    deckLanguage = deck.language;
    const cards = await prisma.card.findMany({
      where: { deckId: deck.id },
      select: { term: true },
    });
    existingTerms = new Set(cards.map((c) => normalizeTerm(c.term)));
  }

  const deckDuplicates: string[] = [];
  const importable = parsed.cards.filter((card) => {
    if (existingTerms.has(normalizeTerm(card.term))) {
      deckDuplicates.push(card.term);
      return false;
    }
    return true;
  });

  if (mode === "preview") {
    return {
      preview: {
        fileName,
        deckName,
        totalRows: parsed.totalRows,
        importable: importable.length,
        deckDuplicates: deckDuplicates.slice(0, PREVIEW_LIST_CAP),
        deckDuplicateTotal: deckDuplicates.length,
        issues: parsed.issues.slice(0, PREVIEW_LIST_CAP),
        issueTotal: parsed.issues.length,
      },
    };
  }

  if (importable.length === 0) {
    return {
      error:
        parsed.totalRows === 0
          ? "The file has no card rows."
          : "Nothing to import — every row is either already in the deck or invalid.",
    };
  }

  const resolvedDeckId = await prisma.$transaction(async (tx) => {
    const id =
      deckId ??
      (await tx.deck.create({ data: { name: deckName, language: deckLanguage } })).id;
    await tx.card.createMany({
      data: importable.map((card) => ({
        deckId: id,
        language: deckLanguage,
        ...card,
        ...emptySchedulerFields(),
      })),
    });
    return id;
  });

  revalidatePath("/decks");
  revalidatePath(`/decks/${resolvedDeckId}`);
  revalidatePath("/library");
  revalidatePath("/");

  return {
    result: {
      deckId: resolvedDeckId,
      deckName,
      created: importable.length,
      skippedDuplicates: deckDuplicates.length,
      skippedInvalid: parsed.issues.length,
    },
  };
}
