"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// The palette is opened only by Cmd/Ctrl+K (no on-screen trigger; unusable on
// mobile), yet its chunk — lucide icons + the searchCards action — used to ship
// on every authenticated page. Deferring it behind this tiny loader keeps that
// weight out of the initial bundle until the shortcut is actually pressed.
const CommandPalette = dynamic(
  () => import("./CommandPalette").then((m) => m.CommandPalette),
  { ssr: false },
);

export function CommandPaletteLoader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return open ? <CommandPalette onClose={() => setOpen(false)} /> : null;
}
