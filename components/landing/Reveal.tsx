"use client";

import { type ComponentType, type ReactNode, useEffect, useState } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Scroll-reveal wrapper for the landing demo sections. Renders its children
 * statically first (so the below-the-fold demos are server-rendered and
 * `motion` stays out of the initial bundle), then lazy-imports the animated
 * RevealMotion after hydration to play the rise-and-fade on scroll.
 */
export function Reveal({ children, delay, className }: RevealProps) {
  const [Motion, setMotion] = useState<ComponentType<RevealProps> | null>(null);

  useEffect(() => {
    let active = true;
    import("./RevealMotion").then((m) => {
      if (active) setMotion(() => m.RevealMotion);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!Motion) return <div className={className}>{children}</div>;
  return (
    <Motion delay={delay} className={className}>
      {children}
    </Motion>
  );
}
