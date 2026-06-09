import type { ReactNode } from "react";

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-[1.5px] border-line px-8 py-14 text-center">
      <p className="type-term text-2xl">{title}</p>
      {children && <div className="mt-3 text-sm text-muted">{children}</div>}
    </div>
  );
}
