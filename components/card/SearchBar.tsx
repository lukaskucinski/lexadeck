"use client";

import { Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { useViewParams } from "./useViewParams";

export function SearchBar({ placeholder = "Search term or translation" }) {
  const { searchParams, setParams } = useViewParams();
  const urlQ = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQ);
  const [lastUrlQ, setLastUrlQ] = useState(urlQ);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // derived-state sync when the URL changes externally (e.g. filters cleared)
  if (lastUrlQ !== urlQ) {
    setLastUrlQ(urlQ);
    setValue(urlQ);
  }

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setParams({ q: next || null }), 300);
  }

  return (
    <div className="flex h-9 items-center gap-2 border-[1.5px] border-line px-3">
      <Search size={15} className="shrink-0 text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-44 bg-transparent text-sm font-semibold outline-none placeholder:text-muted md:w-64"
      />
      {value && (
        <button onClick={() => onChange("")} className="text-muted hover:text-ink">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
