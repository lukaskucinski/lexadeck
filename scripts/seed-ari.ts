/**
 * One-off: starter deck for Ari — 50 common Japanese words.
 * Idempotent: skips if the deck already exists on his account.
 *
 *   npx tsx scripts/seed-ari.ts
 */
import "dotenv/config";
import { prisma } from "../lib/db";
import { emptySchedulerFields } from "../lib/srs";
import type { WordType } from "../lib/types";

const OWNER_EMAIL = "ari.j.herman@gmail.com";
const DECK_NAME = "Japanese Essentials";

interface SeedWord {
  term: string;
  reading: string; // kana (romaji)
  translation: string;
  wordType: WordType;
  emoji?: string;
  conjugation?: string;
}

const W = (
  term: string,
  reading: string,
  translation: string,
  wordType: WordType,
  emoji?: string,
  conjugation?: string,
): SeedWord => ({ term, reading, translation, wordType, emoji, conjugation });

const WORDS: SeedWord[] = [
  // ---- nouns (20) ----
  W("水", "みず (mizu)", "water", "NOUN", "💧"),
  W("人", "ひと (hito)", "person", "NOUN", "🧍"),
  W("日", "ひ (hi)", "day; sun", "NOUN", "☀️"),
  W("時間", "じかん (jikan)", "time", "NOUN", "⏰"),
  W("友達", "ともだち (tomodachi)", "friend", "NOUN", "🤝"),
  W("家", "いえ (ie)", "house; home", "NOUN", "🏠"),
  W("食べ物", "たべもの (tabemono)", "food", "NOUN", "🍱"),
  W("犬", "いぬ (inu)", "dog", "NOUN", "🐶"),
  W("猫", "ねこ (neko)", "cat", "NOUN", "🐱"),
  W("本", "ほん (hon)", "book", "NOUN", "📖"),
  W("学校", "がっこう (gakkō)", "school", "NOUN", "🏫"),
  W("車", "くるま (kuruma)", "car", "NOUN", "🚗"),
  W("電車", "でんしゃ (densha)", "train", "NOUN", "🚃"),
  W("お金", "おかね (okane)", "money", "NOUN", "💴"),
  W("仕事", "しごと (shigoto)", "work; job", "NOUN", "💼"),
  W("名前", "なまえ (namae)", "name", "NOUN", "📛"),
  W("国", "くに (kuni)", "country", "NOUN", "🗾"),
  W("山", "やま (yama)", "mountain", "NOUN", "⛰️"),
  W("海", "うみ (umi)", "sea; ocean", "NOUN", "🌊"),
  W("言葉", "ことば (kotoba)", "word; language", "NOUN", "💬"),
  // ---- verbs (15) ----
  W("食べる", "たべる (taberu)", "to eat", "VERB", "🍽️", "食べます (polite) · 食べない (negative) · 食べた (past)"),
  W("飲む", "のむ (nomu)", "to drink", "VERB", "🥤", "飲みます (polite) · 飲まない (negative) · 飲んだ (past)"),
  W("行く", "いく (iku)", "to go", "VERB", "🚶", "行きます (polite) · 行かない (negative) · 行った (past)"),
  W("来る", "くる (kuru)", "to come", "VERB", "👋", "来ます (polite) · 来ない (negative) · 来た (past) — irregular"),
  W("見る", "みる (miru)", "to see; to watch", "VERB", "👀", "見ます (polite) · 見ない (negative) · 見た (past)"),
  W("聞く", "きく (kiku)", "to listen; to ask", "VERB", "👂", "聞きます (polite) · 聞かない (negative) · 聞いた (past)"),
  W("話す", "はなす (hanasu)", "to speak", "VERB", "🗣️", "話します (polite) · 話さない (negative) · 話した (past)"),
  W("読む", "よむ (yomu)", "to read", "VERB", "📚", "読みます (polite) · 読まない (negative) · 読んだ (past)"),
  W("書く", "かく (kaku)", "to write", "VERB", "✍️", "書きます (polite) · 書かない (negative) · 書いた (past)"),
  W("買う", "かう (kau)", "to buy", "VERB", "🛒", "買います (polite) · 買わない (negative) · 買った (past)"),
  W("する", "する (suru)", "to do", "VERB", "✅", "します (polite) · しない (negative) · した (past) — irregular"),
  W("ある", "ある (aru)", "to exist (things)", "VERB", "📦", "あります (polite) · ない (negative) · あった (past)"),
  W("いる", "いる (iru)", "to exist (people, animals)", "VERB", "🐾", "います (polite) · いない (negative) · いた (past)"),
  W("寝る", "ねる (neru)", "to sleep", "VERB", "😴", "寝ます (polite) · 寝ない (negative) · 寝た (past)"),
  W("分かる", "わかる (wakaru)", "to understand", "VERB", "💡", "分かります (polite) · 分からない (negative) · 分かった (past)"),
  // ---- adjectives (10) ----
  W("大きい", "おおきい (ōkii)", "big", "ADJECTIVE", "🐘"),
  W("小さい", "ちいさい (chiisai)", "small", "ADJECTIVE", "🐭"),
  W("新しい", "あたらしい (atarashii)", "new", "ADJECTIVE", "✨"),
  W("古い", "ふるい (furui)", "old (things)", "ADJECTIVE", "🏺"),
  W("良い", "いい (ii)", "good", "ADJECTIVE", "👍"),
  W("悪い", "わるい (warui)", "bad", "ADJECTIVE", "👎"),
  W("高い", "たかい (takai)", "expensive; tall", "ADJECTIVE", "💸"),
  W("安い", "やすい (yasui)", "cheap", "ADJECTIVE", "🏷️"),
  W("暑い", "あつい (atsui)", "hot (weather)", "ADJECTIVE", "🥵"),
  W("寒い", "さむい (samui)", "cold (weather)", "ADJECTIVE", "🥶"),
  // ---- pronouns (5) ----
  W("私", "わたし (watashi)", "I; me", "PRONOUN", "🙋"),
  W("あなた", "あなた (anata)", "you", "PRONOUN", "🫵"),
  W("彼", "かれ (kare)", "he; him", "PRONOUN", "👨"),
  W("彼女", "かのじょ (kanojo)", "she; her", "PRONOUN", "👩"),
  W("これ", "これ (kore)", "this (thing)", "PRONOUN", "👇"),
];

async function main() {
  const [owner] = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM auth.users WHERE email = ${OWNER_EMAIL}
  `;
  if (!owner) throw new Error(`No auth user for ${OWNER_EMAIL} — run create-users.ts first`);

  const existing = await prisma.deck.findFirst({
    where: { userId: owner.id, name: DECK_NAME },
    include: { _count: { select: { cards: true } } },
  });
  if (existing) {
    console.log(`= "${DECK_NAME}" already exists (${existing._count.cards} cards) — nothing to do`);
    return;
  }

  const deck = await prisma.deck.create({
    data: {
      userId: owner.id,
      name: DECK_NAME,
      language: "ja",
      description: "50 starter words — nouns, verbs, adjectives, pronouns",
      accentColor: "teal",
    },
  });

  await prisma.card.createMany({
    data: WORDS.map((w) => ({
      deckId: deck.id,
      language: "ja",
      term: w.term,
      translation: w.translation,
      wordType: w.wordType,
      cardType: "VOCAB",
      notes: `Reading: ${w.reading}`,
      conjugation: w.conjugation ?? null,
      emoji: w.emoji ?? null,
      ...emptySchedulerFields(),
    })),
  });

  console.log(`+ "${DECK_NAME}" created for ${OWNER_EMAIL} with ${WORDS.length} cards`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
