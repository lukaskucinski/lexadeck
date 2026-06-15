"use client";

import { useEffect, useState } from "react";

/**
 * Registers the service worker (production only) and surfaces an "update
 * available" prompt when a new SW is waiting. On click we message the waiting
 * worker to skipWaiting, then reload on controllerchange — so a fresh deploy
 * never silently hides behind a stale cached shell (a problem Lukas hit before).
 * Renders nothing until an update is pending.
 */
export function ServiceWorkerRegistrar() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (cancelled) return;
        // only surface the toast for an actual UPDATE — i.e. a new worker is
        // installed while an old one already controls the page. The first-ever
        // install (no existing controller) takes over silently via clients.claim,
        // so a fresh visit is never interrupted by a reload.
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              setWaiting(next);
            }
          });
        });
      })
      .catch(() => {
        /* registration failure is non-fatal — the app still works online */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const applyUpdate = () => {
    if (!waiting) return;
    // reload exactly once, when the new worker takes control (explicit update
    // path only — never on first install)
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => window.location.reload(),
      { once: true },
    );
    waiting.postMessage({ type: "SKIP_WAITING" });
  };

  if (!waiting) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-50 mx-auto flex w-fit max-w-[92vw] items-center gap-3 border-[1.5px] border-line bg-bg px-4 py-3 md:bottom-6"
    >
      <span className="text-sm font-bold">New version available</span>
      <button
        type="button"
        onClick={applyUpdate}
        className="pressable label-caps border-[1.5px] border-line bg-ink px-3 py-1.5 text-bg transition-colors hover:bg-coral active:bg-coral"
      >
        Reload
      </button>
    </div>
  );
}
