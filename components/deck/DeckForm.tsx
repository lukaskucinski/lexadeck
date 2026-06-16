"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/actions/decks";
import { isEnrichable, PICKER_LANGUAGES } from "@/lib/ai/languages";
import { DEFAULT_SUBJECT, isLanguageSubject, SUBJECT_OPTIONS } from "@/lib/ai/subjects";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

const ACCENTS = [
  "blue",
  "coral",
  "green",
  "amber",
  "teal",
  "purple",
  "pink",
  "lavender",
] as const;

const LANGUAGES = PICKER_LANGUAGES;

export interface DeckFormValues {
  name?: string;
  language?: string;
  subject?: string | null;
  description?: string | null;
  accentColor?: string | null;
}

export function DeckForm({
  action,
  initial = {},
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: DeckFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  // Subject is the primary axis; the Language picker only exists under Languages.
  const [subject, setSubject] = useState(initial.subject ?? DEFAULT_SUBJECT);

  // keep an unusual existing code (edit flow) selectable even if not in the list
  const current = (initial.language ?? "es").toLowerCase();
  const options = LANGUAGES.some((l) => l.code === current)
    ? LANGUAGES
    : [{ code: current, name: current.toUpperCase() }, ...LANGUAGES];

  return (
    <form action={formAction} className="max-w-xl">
      <div className="border-[1.5px] border-line">
        <label className="block border-b border-soft px-5 py-4">
          <span className="label-caps text-muted">Name</span>
          <input
            name="name"
            defaultValue={initial.name ?? ""}
            required
            autoFocus
            className="mt-1.5 block w-full bg-transparent text-xl font-bold tracking-tight outline-none"
            placeholder="Español"
          />
        </label>

        <label className="block border-b border-soft px-5 py-4">
          <span className="label-caps text-muted">Subject</span>
          <Select
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1.5 w-full max-w-xs"
          >
            {SUBJECT_OPTIONS.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.label}
              </option>
            ))}
          </Select>
          <span className="mt-1.5 block text-[0.7rem] text-muted">
            Languages decks teach a language; other subjects are term → definition decks.
          </span>
        </label>

        {isLanguageSubject(subject) && (
          <label className="block border-b border-soft px-5 py-4">
            <span className="label-caps text-muted">Language</span>
            <Select name="language" defaultValue={current} className="mt-1.5 w-full max-w-xs">
              {options.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.code}){isEnrichable(l.code) ? " · AI" : ""}
                </option>
              ))}
            </Select>
            <span className="mt-1.5 block text-[0.7rem] text-muted">
              “· AI” languages support translation, enrichment, and conjugation.
            </span>
          </label>
        )}

        <label className="block border-b border-soft px-5 py-4">
          <span className="label-caps text-muted">Description</span>
          <textarea
            name="description"
            defaultValue={initial.description ?? ""}
            rows={2}
            className="mt-1.5 block w-full resize-none bg-transparent text-sm outline-none"
            placeholder="Optional"
          />
        </label>

        <fieldset className="px-5 py-4">
          <legend className="label-caps text-muted">Accent</legend>
          <div className="mt-2.5 flex gap-2.5">
            {ACCENTS.map((color) => (
              <label key={color} className="cursor-pointer">
                <input
                  type="radio"
                  name="accentColor"
                  value={color}
                  defaultChecked={(initial.accentColor ?? "coral") === color}
                  className="peer sr-only"
                />
                <span
                  title={color}
                  className="block h-7 w-7 border-2 border-transparent transition-all peer-checked:border-line peer-checked:scale-110"
                  style={{ background: `var(--c-${color})` }}
                />
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {state.error && (
        <p className="mt-3 text-sm font-bold text-coral">{state.error}</p>
      )}

      <div className="mt-5 flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
