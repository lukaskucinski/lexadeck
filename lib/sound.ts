/**
 * Tiny WebAudio synth for study feedback — no audio assets, just short
 * envelope-shaped triangle tones. All client-side; every entry point no-ops
 * on the server and when the user has muted sounds.
 */

export type SoundEffect = "again" | "hard" | "good" | "easy" | "mastered" | "complete";

/* ---------- on/off preference (localStorage external store) ---------- */

const SOUND_KEY = "lexadeck-sounds";

let listeners: (() => void)[] = [];

export function subscribeSounds(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getSoundsSnapshot(): boolean {
  return localStorage.getItem(SOUND_KEY) !== "off";
}

export function setSoundsEnabled(on: boolean) {
  localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  for (const listener of listeners) listener();
}

/* ---------- synth ---------- */

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  const Ctor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  // a context created before the first user gesture starts suspended
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Note = [frequency: number, startMs: number, durationMs: number];

const EFFECTS: Record<SoundEffect, Note[]> = {
  again: [[196, 0, 150]], // low G — soft "not yet"
  hard: [[294, 0, 110]],
  good: [[392, 0, 90], [523.25, 70, 120]], // small upward step
  easy: [[523.25, 0, 80], [659.25, 60, 80], [783.99, 120, 140]], // C-E-G
  mastered: [[659.25, 0, 90], [987.77, 80, 200]], // bright two-note chime
  complete: [[523.25, 0, 110], [659.25, 100, 110], [783.99, 200, 110], [1046.5, 300, 280]],
};

export function playEffect(effect: SoundEffect) {
  if (typeof window === "undefined" || !getSoundsSnapshot()) return;
  const ac = audioContext();
  if (!ac) return;

  const base = ac.currentTime;
  for (const [frequency, startMs, durationMs] of EFFECTS[effect]) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = frequency;

    const t0 = base + startMs / 1000;
    const t1 = t0 + durationMs / 1000;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.06, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);

    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t1 + 0.05);
  }
}
