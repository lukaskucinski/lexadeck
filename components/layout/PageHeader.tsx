import type { ReactNode } from "react";

export function PageHeader({
  index,
  title,
  children,
}: {
  index?: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 border-b-[3px] border-line pb-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {index && (
            <div className="label-caps mb-2 text-muted">
              <b className="mr-2 text-ink">{index}</b>
            </div>
          )}
          <h1 className="type-display text-4xl md:text-5xl">{title}</h1>
        </div>
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </header>
  );
}
