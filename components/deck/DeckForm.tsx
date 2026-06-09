"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions/decks";
import { Button } from "@/components/ui/Button";

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

export interface DeckFormValues {
  name?: string;
  language?: string;
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
          <span className="label-caps text-muted">Language (ISO code)</span>
          <input
            name="language"
            defaultValue={initial.language ?? "es"}
            required
            maxLength={8}
            className="mt-1.5 block w-24 bg-transparent text-sm font-bold uppercase tracking-[0.14em] outline-none"
          />
        </label>

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
