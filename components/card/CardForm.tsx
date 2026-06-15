"use client";

import { Sparkles } from "lucide-react";
import { useActionState, useRef, useState, useTransition } from "react";
import type { ActionState } from "@/lib/actions/decks";
import { getLanguageProfile } from "@/lib/ai/languages";
import type { CardDetails, EnrichmentPreview } from "@/lib/cardDetails";
import type { ConjugationData } from "@/lib/conjugation";
import {
  CardType,
  Gender,
  WORD_TYPE_LABELS,
  WordType,
} from "@/lib/types";
import { wordTypeVar } from "@/lib/wordTypeColors";
import { ConjugationTable } from "@/components/card/ConjugationTable";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

export interface CardFormValues {
  term?: string;
  translation?: string | null;
  cardType?: string;
  wordType?: string;
  gender?: string | null;
  notes?: string | null;
  conjugation?: string | null;
  example?: string | null;
  exampleEn?: string | null;
  emoji?: string | null;
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block border-b border-soft px-5 py-3.5 ${className}`}>
      <span className="label-caps text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "mt-1.5 block w-full bg-transparent outline-none placeholder:text-muted/60";

export function CardForm({
  action,
  initial = {},
  submitLabel,
  allowAddAnother = false,
  cancelHref,
  enrich,
  conjugate,
  language = "es",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: CardFormValues;
  submitLabel: string;
  allowAddAnother?: boolean;
  cancelHref?: string;
  /** when set, shows an AI "Auto-fill from term" control (create flow, enrichable decks) */
  enrich?: (term: string) => Promise<{ preview?: EnrichmentPreview; error?: string }>;
  /** when set, shows "Generate all tenses" for verb cards (table-capable languages) */
  conjugate?: (term: string) => Promise<{ table?: ConjugationData; error?: string }>;
  /** deck language (ISO code) — drives the target-language field label */
  language?: string;
}) {
  const profile = getLanguageProfile(language);
  const targetLang = profile?.name ?? language.toUpperCase();
  const [state, formAction, pending] = useActionState(action, {});
  const [wordType, setWordType] = useState(initial.wordType ?? "NOUN");
  const [formKey, setFormKey] = useState(0);
  const [autofillDetails, setAutofillDetails] = useState<CardDetails | null>(null);
  const [conjTable, setConjTable] = useState<ConjugationData | null>(null);
  const [showConj, setShowConj] = useState(false);
  const [correction, setCorrection] = useState<string | null>(null);
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const [conjError, setConjError] = useState<string | null>(null);
  const [autofilling, startAutofill] = useTransition();
  const [conjugating, startConjugate] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Only verbs in a table-capable language (es/ja/de) get the conjugation control.
  const showConjugate = !!conjugate && wordType === "VERB" && !!profile?.conjugation.table;
  // The hidden detail layer carried to createCard: the AI auto-fill details plus,
  // for a verb, the generated conjugation table. Empty string ⇒ no detail layer.
  const mergedDetails: CardDetails = {
    ...(autofillDetails ?? {}),
    ...(conjTable && wordType === "VERB" ? { conjugationTable: conjTable } : {}),
  };
  const detailsJson = Object.keys(mergedDetails).length ? JSON.stringify(mergedDetails) : "";

  function handleAutofill() {
    if (!enrich || !formRef.current) return;
    const term = String(new FormData(formRef.current).get("term") ?? "").trim();
    setAutofillError(null);
    startAutofill(async () => {
      const res = await enrich(term);
      const form = formRef.current;
      if (!form) return;
      if (res.error || !res.preview) {
        setAutofillError(res.error ?? "No suggestion returned");
        return;
      }
      const p = res.preview;
      const set = (name: string, value: string) => {
        const el = form.elements.namedItem(name) as
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement
          | null;
        if (el) el.value = value;
      };
      setWordType(p.wordType); // controlled Select — re-renders + toggles gender
      set("translation", p.translation ?? "");
      set("gender", p.gender ?? "");
      set("example", p.example);
      set("exampleEn", p.exampleEn);
      set("emoji", p.emoji);
      set("conjugation", p.conjugation);
      setAutofillDetails(p.details);
      setCorrection(p.correction || null);
    });
  }

  function handleConjugate() {
    if (!conjugate || !formRef.current) return;
    const term = String(new FormData(formRef.current).get("term") ?? "").trim();
    setConjError(null);
    startConjugate(async () => {
      const res = await conjugate(term);
      if (res.error || !res.table) {
        setConjError(res.error ?? "No conjugation returned");
        return;
      }
      setConjTable(res.table);
      setShowConj(true);
    });
  }

  return (
    <form
      key={formKey}
      ref={formRef}
      action={formAction}
      className="max-w-2xl"
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter;
        if (submitter?.getAttribute("value") === "true") {
          // "save + add another": remount the form after the action resolves
          setTimeout(() => {
            setFormKey((k) => k + 1);
            setAutofillDetails(null);
            setConjTable(null);
            setShowConj(false);
            setCorrection(null);
            setAutofillError(null);
            setConjError(null);
          }, 50);
        }
      }}
    >
      {(enrich || conjugate) && (
        <input type="hidden" name="details" value={detailsJson} readOnly />
      )}
      {(enrich || showConjugate) && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {enrich && (
            <Button
              type="button"
              variant="outline"
              disabled={autofilling}
              title="Use AI to fill translation, word type, example, and details from the term"
              onClick={handleAutofill}
            >
              <Sparkles size={14} />
              {autofilling ? "Auto-filling…" : "Auto-fill from term"}
            </Button>
          )}
          {showConjugate && !conjTable && (
            <Button
              type="button"
              variant="outline"
              disabled={conjugating}
              title="Use AI to generate the full conjugation table — saved with the card"
              onClick={handleConjugate}
            >
              <Sparkles size={14} />
              {conjugating ? "Conjugating…" : "Generate all tenses"}
            </Button>
          )}
          {autofillError && (
            <span className="text-sm font-bold text-coral">{autofillError}</span>
          )}
          {conjError && <span className="text-sm font-bold text-coral">{conjError}</span>}
          {correction && <span className="text-sm font-medium text-coral">{correction}</span>}
          {showConjugate && conjTable && (
            <button
              type="button"
              onClick={() => setShowConj((v) => !v)}
              className="label-caps text-muted hover:text-ink"
            >
              ✓ all tenses ready — {showConj ? "hide" : "preview"}
            </button>
          )}
        </div>
      )}
      {showConjugate && conjTable && showConj && (
        <div className="mb-4 border-[1.5px] border-line px-5 py-4">
          <ConjugationTable data={conjTable} />
        </div>
      )}
      <div className="border-[1.5px] border-line">
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr]">
          <Field label="Term" className="sm:border-r">
            <input
              name="term"
              defaultValue={initial.term ?? ""}
              required
              autoFocus
              placeholder="word or phrase"
              className={`${inputCls} type-term text-2xl`}
            />
          </Field>
          <Field label="Emoji">
            <input
              name="emoji"
              defaultValue={initial.emoji ?? ""}
              maxLength={16}
              placeholder="✦"
              className={`${inputCls} text-2xl`}
            />
          </Field>
        </div>

        <Field label="Translation">
          <input
            name="translation"
            defaultValue={initial.translation ?? ""}
            placeholder="English translation"
            className={`${inputCls} text-lg font-medium`}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3">
          <Field label="Word type" className="sm:border-r">
            <div className="mt-2 flex items-center gap-2.5">
              <i className="h-3 w-3 shrink-0" style={{ background: wordTypeVar(wordType as WordType) }} />
              <Select
                name="wordType"
                value={wordType}
                onChange={(e) => setWordType(e.target.value)}
                className="w-full"
              >
                {Object.values(WordType).map((wt) => (
                  <option key={wt} value={wt}>
                    {WORD_TYPE_LABELS[wt]}
                  </option>
                ))}
              </Select>
            </div>
          </Field>

          <Field label="Gender" className="sm:border-r">
            <Select
              name="gender"
              defaultValue={initial.gender ?? ""}
              disabled={wordType !== "NOUN"}
              className="mt-2"
            >
              <option value="">—</option>
              {Object.values(Gender).map((g) => (
                <option key={g} value={g}>
                  {g.toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Card type">
            <Select name="cardType" defaultValue={initial.cardType ?? "VOCAB"} className="mt-2">
              {Object.values(CardType).map((ct) => (
                <option key={ct} value={ct}>
                  {ct.toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          <Field label={`Example (${targetLang})`} className="sm:border-r">
            <input
              name="example"
              defaultValue={initial.example ?? ""}
              placeholder="example sentence"
              className={`${inputCls} text-sm`}
            />
          </Field>
          <Field label="Example (English)">
            <input
              name="exampleEn"
              defaultValue={initial.exampleEn ?? ""}
              placeholder="its English translation"
              className={`${inputCls} text-sm`}
            />
          </Field>
        </div>

        <Field label="Conjugation">
          <textarea
            name="conjugation"
            defaultValue={initial.conjugation ?? ""}
            rows={3}
            placeholder="key conjugated forms"
            className={`${inputCls} resize-y text-sm`}
          />
        </Field>

        <Field label="Notes" className="border-b-0">
          <textarea
            name="notes"
            defaultValue={initial.notes ?? ""}
            rows={3}
            placeholder="Usage notes, grammar explanation…"
            className={`${inputCls} resize-y text-sm`}
          />
        </Field>
      </div>

      {state.error && <p className="mt-3 text-sm font-bold text-coral">{state.error}</p>}

      <div className="mt-5 flex gap-3">
        <Button type="submit" name="addAnother" value="false" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {allowAddAnother && (
          <Button type="submit" name="addAnother" value="true" variant="outline" disabled={pending}>
            Save + add another
          </Button>
        )}
        {cancelHref && (
          <ButtonLink href={cancelHref} variant="ghost">
            Cancel
          </ButtonLink>
        )}
      </div>
    </form>
  );
}
