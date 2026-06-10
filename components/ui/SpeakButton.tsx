"use client";

import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Hydration-safe Web Speech support check (server snapshot = false). */
function useSpeechSupported(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => "speechSynthesis" in window,
    () => false,
  );
}

/**
 * Prefer the major Spanish variants (local voices first — they sound best
 * and work offline); otherwise first voice matching the language prefix.
 */
function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const prefix = lang.toLowerCase();
  const matches = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(prefix));
  if (matches.length === 0) return undefined;

  for (const target of ["es-es", "es-mx", "es-us"]) {
    const subset = matches.filter((v) => v.lang.toLowerCase().replace("_", "-") === target);
    if (subset.length) return subset.find((v) => v.localService) ?? subset[0];
  }
  return matches.find((v) => v.localService) ?? matches[0];
}

export function SpeakButton({
  text,
  lang = "es",
  size = 16,
  className = "",
}: {
  text: string;
  /** BCP-47 language (or prefix) of the text, e.g. "es" / "en" */
  lang?: string;
  size?: number;
  className?: string;
}) {
  const supported = useSpeechSupported();
  const [speaking, setSpeaking] = useState(false);
  // held so Chrome doesn't GC the utterance mid-speech (drops onend)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startedRef = useRef(false);

  // stop speech if the button unmounts mid-utterance (e.g. card advanced)
  useEffect(
    () => () => {
      if (startedRef.current) window.speechSynthesis.cancel();
    },
    [],
  );

  if (!supported) return null;

  function speak(e: React.MouseEvent) {
    e.stopPropagation(); // hosts may reveal/navigate on click
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(lang);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? (lang === "es" ? "es-ES" : lang);
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    startedRef.current = true;
    setSpeaking(true);
    synth.speak(utterance);
  }

  return (
    <button
      type="button"
      onClick={speak}
      aria-label={`Pronounce “${text}”`}
      title="Listen"
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center transition-colors ${
        speaking ? "text-coral" : "text-muted hover:text-ink"
      } ${className}`}
    >
      <Volume2 size={size} strokeWidth={2.2} />
    </button>
  );
}
