"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesColumn,
  House,
  Layers,
  LibraryBig,
  Plus,
  Settings,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: House },
  { href: "/decks", label: "Decks", icon: Layers },
  { href: "/library", label: "Library", icon: LibraryBig },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumn },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function NavRail() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col items-center border-r-[1.5px] border-line bg-bg py-5 md:flex">
      <Link
        href="/"
        className="type-term mb-7 text-[1.45rem] text-ink"
        title="LexaDeck"
        aria-label="LexaDeck home"
      >
        lx<span className="text-coral">.</span>
      </Link>

      <div className="flex flex-col items-center gap-1.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`pressable flex h-10 w-10 items-center justify-center ${
                active ? "bg-ink text-bg" : "text-muted hover:bg-soft hover:text-ink"
              }`}
            >
              <Icon size={19} strokeWidth={active ? 2.4 : 2} />
            </Link>
          );
        })}
      </div>

      <Link
        href="/decks"
        title="Add cards"
        className="pressable mt-6 flex h-10 w-10 items-center justify-center border-[1.5px] border-line text-ink hover:bg-ink hover:text-bg"
      >
        <Plus size={19} />
      </Link>

      <div className="mt-auto flex flex-col items-center gap-1.5">
        <Link
          href="/settings"
          title="Settings"
          className={`pressable flex h-10 w-10 items-center justify-center ${
            isActive(pathname, "/settings")
              ? "bg-ink text-bg"
              : "text-muted hover:bg-soft hover:text-ink"
          }`}
        >
          <Settings size={19} />
        </Link>
        <ThemeToggle />
      </div>
    </nav>
  );
}
