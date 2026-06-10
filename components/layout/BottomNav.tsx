"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesColumn,
  House,
  Layers,
  LibraryBig,
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

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t-[1.5px] border-line bg-bg pb-[env(safe-area-inset-bottom)] md:hidden">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.58rem] font-bold tracking-[0.14em] uppercase ${
              active ? "text-ink" : "text-muted"
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.4 : 2} />
            {label}
          </Link>
        );
      })}
      <ThemeToggle variant="bar" />
    </nav>
  );
}
