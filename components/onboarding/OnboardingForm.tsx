"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { completeOnboarding, type OnboardingState } from "@/lib/actions/onboarding";
import { CEFR_LEVELS } from "@/lib/ai/cefr";
import { isEnrichable, PICKER_LANGUAGES } from "@/lib/ai/languages";
import { DEFAULT_SUBJECT, isLanguageSubject, SUBJECT_OPTIONS } from "@/lib/ai/subjects";
import { AGE_RANGES } from "@/lib/onboarding";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

export function OnboardingForm({
  initialSubject = DEFAULT_SUBJECT,
  initialLanguage = "es",
}: {
  initialSubject?: string;
  initialLanguage?: string;
}) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    {},
  );
  const [subject, setSubject] = useState(initialSubject);
  const [language, setLanguage] = useState(initialLanguage);
  const offerStarter = isLanguageSubject(subject) && language === "es";

  return (
    <form action={formAction} className="mt-8">
      <div className="border-[1.5px] border-line">
        <label className="block border-b border-soft px-5 py-4">
          <span className="label-caps text-muted">What are you here to learn?</span>
          <Select
            name="primarySubject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-2 w-full max-w-xs"
          >
            {SUBJECT_OPTIONS.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.label}
              </option>
            ))}
          </Select>
          <span className="mt-1.5 block text-[0.7rem] text-muted">
            Languages teach a language; everything else is term → definition cards.
          </span>
        </label>

        {isLanguageSubject(subject) && (
          <>
            <label className="block border-b border-soft px-5 py-4">
              <span className="label-caps text-muted">Which language?</span>
              <Select
                name="primaryLanguage"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-2 w-full max-w-xs"
              >
                {PICKER_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.code}){isEnrichable(l.code) ? " · AI" : ""}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block border-b border-soft px-5 py-4">
              <span className="label-caps text-muted">Your level (optional)</span>
              <Select name="cefrLevel" defaultValue="" className="mt-2 w-full max-w-xs">
                <option value="">I&apos;m not sure</option>
                {CEFR_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </Select>
              <span className="mt-1.5 block text-[0.7rem] text-muted">
                CEFR band — tunes AI enrichment to your level. Leave it if you don&apos;t know.
              </span>
            </label>
          </>
        )}

        <label className="block border-b border-soft px-5 py-4">
          <span className="label-caps text-muted">Age range (optional)</span>
          <Select name="ageRange" defaultValue="" className="mt-2 w-full max-w-xs">
            <option value="">Prefer not to say</option>
            {AGE_RANGES.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.label}
              </option>
            ))}
          </Select>
        </label>

        {offerStarter && (
          <label className="flex items-start gap-3 border-b border-soft px-5 py-4">
            <input
              type="checkbox"
              name="starterDeck"
              defaultChecked
              className="mt-1 h-4 w-4 shrink-0 accent-coral"
            />
            <span className="text-sm leading-relaxed text-muted">
              Start me off with a{" "}
              <span className="font-bold text-ink">10-card Spanish starter deck</span> so
              there&apos;s something to study right away.
            </span>
          </label>
        )}

        <label className="flex items-start gap-3 px-5 py-4">
          <input
            type="checkbox"
            name="acceptedTerms"
            className="mt-1 h-4 w-4 shrink-0 accent-coral"
          />
          <span className="text-sm leading-relaxed text-muted">
            I understand cards can be enriched with AI-generated content that may contain
            mistakes, and I accept the{" "}
            <Link href="/terms" className="font-bold text-ink underline underline-offset-4">
              terms
            </Link>
            .
          </span>
        </label>
      </div>

      {state.error && <p className="mt-3 text-sm font-bold text-coral">{state.error}</p>}

      <div className="mt-5">
        <Button type="submit" disabled={pending}>
          {pending ? "Setting up…" : "Start studying →"}
        </Button>
      </div>
    </form>
  );
}
