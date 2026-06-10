import type { ReactNode } from "react";

export function PageHeader({
  title,
  children,
}: {
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 border-b-[3px] border-line pb-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="type-display text-4xl md:text-5xl">{title}</h1>
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </header>
  );
}
