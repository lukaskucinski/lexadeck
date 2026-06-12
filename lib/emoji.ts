/**
 * Emoji validation for the Card.emoji field.
 *
 * Gemini occasionally returns non-emoji characters (dingbats, letters,
 * text-presentation symbols) that render as tofu boxes (▯/X) on devices
 * whose fonts lack a glyph. \p{RGI_Emoji} matches only complete,
 * fully-qualified sequences from the RGI emoji set — the ones with
 * guaranteed color-emoji glyphs everywhere — including ZWJ sequences,
 * skin tones, flags, and keycaps. Requires the regex `v` flag (Node 20+,
 * all evergreen browsers since 2023).
 */
const RGI_EMOJI_RE = new RegExp("^\\p{RGI_Emoji}{1,3}$", "v");

/**
 * Returns the trimmed value when it is 1–3 genuine emoji, otherwise null.
 * Null/empty/blank input is normalized to null.
 */
export function sanitizeEmoji(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  return RGI_EMOJI_RE.test(value) ? value : null;
}
