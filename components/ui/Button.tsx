import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-ink text-bg hover:bg-coral hover:text-bg",
  outline: "border-[1.5px] border-line text-ink hover:bg-ink hover:text-bg",
  ghost: "text-muted hover:text-ink",
  danger: "border-[1.5px] border-coral text-coral hover:bg-coral hover:text-bg",
};

const BASE =
  "inline-flex h-10 items-center justify-center gap-2 px-4 text-[0.78rem] font-extrabold tracking-[0.08em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; children: ReactNode }) {
  return (
    <Link className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`} {...props}>
      {children}
    </Link>
  );
}
