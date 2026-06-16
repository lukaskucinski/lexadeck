"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartNoAxesColumn,
  House,
  Layers,
  LibraryBig,
  type LucideIcon,
  Plus,
  Settings,
} from "lucide-react";
import { useTourActive, useTourHighlight } from "@/components/walkthrough/useTourHighlight";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: House },
  { href: "/decks", label: "Decks", icon: Layers },
  { href: "/library", label: "Library", icon: LibraryBig },
  { href: "/progress", label: "Progress", icon: ChartNoAxesColumn },
] as const;

// A 2px coral ring used to spotlight a nav item during the first-run tour.
const TOUR_GLOW = "shadow-[0_0_0_2px_var(--c-coral)]";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavRailItem({
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
      title={label}
      className={`pressable relative flex h-10 w-10 items-center justify-center ${
        active ? "bg-ink text-bg" : "text-muted hover:bg-soft hover:text-ink"
      } ${lit ? TOUR_GLOW : ""}`}
    >
      <Icon size={19} strokeWidth={active ? 2.4 : 2} />
    </Link>
  );
}

export function NavRail() {
  const pathname = usePathname();
  const tourActive = useTourActive();

  return (
    <nav
      className={`fixed inset-y-0 left-0 hidden w-16 flex-col items-center border-r-[1.5px] border-line bg-bg py-5 md:flex ${
        tourActive ? "pointer-events-none z-[55]" : "z-40"
      }`}
    >
      <Link
        href="/"
        className="type-term mb-7 text-[1.45rem] text-ink"
        title="LexaDeck"
        aria-label="LexaDeck home"
      >
        lx<span className="text-coral">.</span>
      </Link>

      <div className="flex flex-col items-center gap-1.5">
        {NAV_ITEMS.map(({ href, label, icon }) => (
          <NavRailItem
            key={href}
            href={href}
            label={label}
            Icon={icon}
            active={isActive(pathname, href)}
          />
        ))}
      </div>

      <Link
        href="/decks"
        title="Add cards"
        className="pressable mt-6 flex h-10 w-10 items-center justify-center border-[1.5px] border-line text-ink hover:bg-ink hover:text-bg"
      >
        <Plus size={19} />
      </Link>

      <div className="mt-auto flex flex-col items-center gap-1.5">
        <NavRailItem
          href="/settings"
          label="Settings"
          Icon={Settings}
          active={isActive(pathname, "/settings")}
        />
        <ThemeToggle />
      </div>
    </nav>
  );
}
