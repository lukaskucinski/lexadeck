/**
 * Read an Anki `.apkg` (a ZIP containing a SQLite "collection" database) into
 * the shared {@link AnkiSource} shape, reusing the same mapping + CSV pipeline
 * as the `.txt` importer.
 *
 * The heavy parsing deps (unzip / SQLite-wasm / zstd) are dynamically imported
 * so they only load when a user actually picks an `.apkg`. Client-only — relies
 * on the browser sql.js build and the self-hosted `/sql-wasm.wasm`.
 */
import { ankiModelFields, buildAnkiSource, type AnkiSource } from "./anki";

// Newest first; .anki21b is zstd-compressed, the others are raw SQLite.
const COLLECTION_FILES = ["collection.anki21b", "collection.anki21", "collection.anki2"];

type SqlDb = import("sql.js").Database;

export function isApkgName(name: string): boolean {
  return /\.apkg$/i.test(name);
}

export async function parseApkg(buffer: ArrayBuffer): Promise<AnkiSource> {
  const { unzipSync } = await import("fflate");
  const files = unzipSync(new Uint8Array(buffer), {
    filter: (f) => COLLECTION_FILES.includes(f.name),
  });

  const name = COLLECTION_FILES.find((n) => files[n]);
  if (!name) throw new Error("No Anki collection was found inside this .apkg file.");

  let dbBytes: Uint8Array = files[name];
  if (name.endsWith("b")) {
    const { decompress } = await import("fzstd"); // collection.anki21b is zstd
    dbBytes = decompress(dbBytes);
  }

  const sqlModule = await import("sql.js");
  const initSqlJs = (sqlModule.default ?? sqlModule) as typeof import("sql.js").default;
  const SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });

  const db = new SQL.Database(dbBytes);
  try {
    const notes = readNotes(db);
    if (notes.length === 0) throw new Error("This .apkg has no notes to import.");

    // field names come from the note type the most notes use
    const counts = new Map<string, number>();
    for (const n of notes) counts.set(n.mid, (counts.get(n.mid) ?? 0) + 1);
    const mid = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];

    let fieldNames = ankiModelFields(readModelsJson(db), mid);
    if (!fieldNames.length) fieldNames = readModernFields(db, mid); // newer schema

    return buildAnkiSource(fieldNames.length ? fieldNames : null, notes);
  } finally {
    db.close();
  }
}

function readNotes(db: SqlDb): { mid: string; flds: string }[] {
  const res = db.exec("SELECT mid, flds FROM notes");
  return (res[0]?.values ?? []).map((r) => ({ mid: String(r[0]), flds: String(r[1] ?? "") }));
}

function readModelsJson(db: SqlDb): string {
  try {
    const res = db.exec("SELECT models FROM col LIMIT 1");
    return String(res[0]?.values?.[0]?.[0] ?? "{}");
  } catch {
    return "{}"; // modern schema may not carry col.models
  }
}

/** Modern Anki (2.1.50+) keeps note-type fields in a dedicated `fields` table. */
function readModernFields(db: SqlDb, mid: string): string[] {
  if (!/^\d+$/.test(mid)) return [];
  try {
    const res = db.exec(`SELECT name FROM fields WHERE ntid = ${mid} ORDER BY ord`);
    return (res[0]?.values ?? []).map((r) => String(r[0]));
  } catch {
    return [];
  }
}
