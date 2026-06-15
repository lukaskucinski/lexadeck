"use client";

import { useEffect, useReducer, useState, useSyncExternalStore } from "react";
import { installReducer, isIosSafariNonStandalone } from "@/lib/pwa/install";

/** Chrome/Android fire this; not in the standard TS lib. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Read a client-only boolean without a hydration mismatch (server snapshot = false). */
function useClientFlag(compute: () => boolean): boolean {
  return useSyncExternalStore(
    () => () => {},
    compute,
    () => false,
  );
}

/**
 * Install affordance for Settings. Android/desktop Chrome → an "Install app"
 * button (capturing beforeinstallprompt); iOS Safari → Share ▸ Add to Home Screen
 * instructions (no prompt event exists there). Hidden once the app is installed.
 */
export function InstallButton() {
  const [status, dispatch] = useReducer(installReducer, "idle");
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  const standalone = useClientFlag(
    () =>
      matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  );
  const iosInstructable = useClientFlag(() =>
    isIosSafariNonStandalone({
      ua: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints,
      standalone:
        matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
    }),
  );

  useEffect(() => {
    // event-driven (async) dispatches only — no synchronous setState in the effect
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      dispatch({ type: "installable" });
    };
    const onInstalled = () => {
      dispatch({ type: "installed" });
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
    dispatch({ type: "consumed" });
  };

  if (standalone || status === "installed") {
    return <span className="label-caps text-green">Installed ✓</span>;
  }

  if (status === "installable" && promptEvent) {
    return (
      <button
        type="button"
        onClick={install}
        className="pressable label-caps border-[1.5px] border-line bg-ink px-3 py-1.5 text-bg hover:bg-coral"
      >
        Install app
      </button>
    );
  }

  if (iosInstructable) {
    return <span className="label-caps text-right text-muted">Share&nbsp;▸&nbsp;Add to Home Screen</span>;
  }

  return <span className="label-caps text-right text-muted">From your browser menu</span>;
}
