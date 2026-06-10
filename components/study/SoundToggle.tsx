"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSyncExternalStore } from "react";
import { getSoundsSnapshot, setSoundsEnabled, subscribeSounds } from "@/lib/sound";

/** Mute/unmute study sound effects — persisted on this device. */
export function SoundToggle({ size = 15, className = "" }: { size?: number; className?: string }) {
  const enabled = useSyncExternalStore(subscribeSounds, getSoundsSnapshot, () => true);

  return (
    <button
      type="button"
      onClick={() => setSoundsEnabled(!enabled)}
      aria-pressed={enabled}
      title={enabled ? "Mute study sounds" : "Unmute study sounds"}
      className={`cursor-pointer transition-colors ${
        enabled ? "text-ink" : "text-muted hover:text-ink"
      } ${className}`}
    >
      {enabled ? <Volume2 size={size} strokeWidth={2.2} /> : <VolumeX size={size} strokeWidth={2.2} />}
    </button>
  );
}
