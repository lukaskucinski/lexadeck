"use client";

import { Columns3, LayoutGrid, Rows3 } from "lucide-react";
import { useViewParams } from "@/components/card/useViewParams";

const VIEWS = [
  { key: "kanban", label: "Kanban", icon: Columns3 },
  { key: "grid", label: "Grid", icon: LayoutGrid },
  { key: "list", label: "List", icon: Rows3 },
] as const;

export function ViewToggle({ active }: { active: string }) {
  const { setParams } = useViewParams();

  return (
    <div className="flex border-[1.5px] border-line">
      {VIEWS.map(({ key, label, icon: Icon }, i) => (
        <button
          key={key}
          onClick={() => setParams({ view: key }, { resetPage: true })}
          title={label}
          className={`flex h-9 items-center gap-2 px-3.5 text-[0.68rem] font-extrabold tracking-[0.12em] uppercase transition-colors ${
            i > 0 ? "border-l border-line" : ""
          } ${active === key ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
        >
          <Icon size={15} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
