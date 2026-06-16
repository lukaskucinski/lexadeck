"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesColumn,
  House,
  Layers,
  LibraryBig,
  type LucideIcon,
  Settings,
} from "lucide-react";
import { useTourActive, useTourHighlight } from "@/components/walkthrough/useTourHighlight";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: House },
  { href: "/decks", label: "Decks", icon: Layers },
  { href: "/library", label: "Library", icon: LibraryBig },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumn },
  { href: "/settings", label: "More", icon: Settings },
] as const;

// A 2px coral ring used to spotlight a nav item during the first-run tour.
const TOUR_GLOW = "shadow-[0_0_0_2px_var(--c-coral)]";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function BottomNavItem({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
}) {
  const lit = useTourHighlight(href);
  return (
    <Link
      href={href}
      className={`pressable relative flex flex-col items-center gap-0.5 px-1 py-2.5 text-[0.58rem] font-bold tracking-[0.14em] uppercase ${
        active ? "text-ink" : "text-muted"
      } ${lit ? TOUR_GLOW : ""}`}
    >
      <Icon size={20} strokeWidth={active ? 2.4 : 2} />
      {label}
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const tourActive = useTourActive();

  return (
    /* equal GAPS, not equal slots: labels vary in width, so centering them in
       identical cells reads as uneven (LIBRARY/PROGRESS nearly touch while
       HOME/DECKS sit far apart). justify-evenly spaces the natural-width
       items with identical whitespace between every pair and at the edges. */
    <nav
      className={`fixed inset-x-0 bottom-0 flex items-stretch justify-evenly border-t-[1.5px] border-line bg-bg pb-[env(safe-area-inset-bottom)] md:hidden ${
        tourActive ? "pointer-events-none z-[55]" : "z-40"
      }`}
    >
      {NAV_ITEMS.map(({ href, label, icon }) => (
        <BottomNavItem
          key={href}
          href={href}
          label={label}
          Icon={icon}
          active={isActive(pathname, href)}
        />
      ))}
      <ThemeToggle variant="bar" />
    </nav>
  );
}
