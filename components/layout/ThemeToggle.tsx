"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

let listeners: (() => void)[] = [];

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function setTheme(next: Theme) {
  if (next === "dark") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
  localStorage.setItem("lexadeck-theme", next);
  for (const listener of listeners) listener();
}

export function ThemeToggle({
  className = "",
  variant = "rail",
}: {
  className?: string;
  /** "rail" = square icon button (NavRail) · "bar" = labeled BottomNav slot */
  variant?: "rail" | "bar";
}) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light" as Theme);
  const Icon = theme === "dark" ? Sun : Moon;

  if (variant === "bar") {
    return (
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
        className={`flex flex-col items-center gap-0.5 px-1 py-2.5 text-[0.58rem] font-bold tracking-[0.14em] text-muted uppercase ${className}`}
      >
        <Icon size={20} strokeWidth={2} />
        Theme
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      title="Toggle theme"
      className={`flex h-10 w-10 items-center justify-center text-muted transition-colors hover:bg-soft hover:text-ink ${className}`}
    >
      <Icon size={19} />
    </button>
  );
}
