"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/actions/decks";
import {
  CardType,
  Gender,
  WORD_TYPE_LABELS,
  WordType,
} from "@/lib/types";
import { wordTypeVar } from "@/lib/wordTypeColors";
import { Button } from "@/components/ui/Button";
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
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: CardFormValues;
  submitLabel: string;
  allowAddAnother?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [wordType, setWordType] = useState(initial.wordType ?? "NOUN");
  const [formKey, setFormKey] = useState(0);

  return (
    <form
      key={formKey}
      action={formAction}
      className="max-w-2xl"
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter;
        if (submitter?.getAttribute("value") === "true") {
          // "save + add another": remount the form after the action resolves
          setTimeout(() => setFormKey((k) => k + 1), 50);
        }
      }}
    >
      <div className="border-[1.5px] border-line">
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr]">
          <Field label="Term" className="sm:border-r">
            <input
              name="term"
              defaultValue={initial.term ?? ""}
              required
              autoFocus
              placeholder="fallecer"
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
            placeholder="to pass away; to die"
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
          <Field label="Example (Spanish)" className="sm:border-r">
            <input
              name="example"
              defaultValue={initial.example ?? ""}
              placeholder="El escritor falleció en París."
              className={`${inputCls} text-sm`}
            />
          </Field>
          <Field label="Example (English)">
            <input
              name="exampleEn"
              defaultValue={initial.exampleEn ?? ""}
              placeholder="The writer passed away in Paris."
              className={`${inputCls} text-sm`}
            />
          </Field>
        </div>

        <Field label="Conjugation">
          <textarea
            name="conjugation"
            defaultValue={initial.conjugation ?? ""}
            rows={3}
            placeholder={"fallezco (yo)\nfallece (él/ella)"}
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
      </div>
    </form>
  );
}
