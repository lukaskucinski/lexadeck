"use client";

import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

/**
 * Native <select> (keyboard + a11y for free) dressed to match the design
 * system: bordered box, label-caps typography, custom chevron.
 */
export function Select({
  className = "",
  disabled,
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <span className={`relative block ${className}`}>
      <select
        disabled={disabled}
        className="h-10 w-full cursor-pointer appearance-none border-[1.5px] border-line bg-bg pr-8 pl-3 text-sm font-bold tracking-wide uppercase outline-none transition-colors hover:bg-soft/60 focus-visible:border-ink disabled:cursor-not-allowed disabled:border-soft disabled:bg-transparent disabled:text-muted/50"
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={15}
        strokeWidth={2.4}
        className={`pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 ${
          disabled ? "text-muted/40" : "text-muted"
        }`}
      />
    </span>
  );
}
