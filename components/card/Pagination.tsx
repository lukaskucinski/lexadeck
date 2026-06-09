"use client";

import { useViewParams } from "./useViewParams";

export function Pagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const { setParams } = useViewParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-5 flex items-center justify-between">
      <span className="tnum text-[0.78rem] font-semibold text-muted">
        {from}–{to} of {total.toLocaleString()}
      </span>
      <div className="flex border-[1.5px] border-line">
        <button
          disabled={page <= 1}
          onClick={() => setParams({ page: String(page - 1) }, { resetPage: false })}
          className="label-caps px-4 py-2 text-ink disabled:text-muted/50"
        >
          ← Prev
        </button>
        <button
          disabled={page >= pages}
          onClick={() => setParams({ page: String(page + 1) }, { resetPage: false })}
          className="label-caps border-l border-line px-4 py-2 text-ink disabled:text-muted/50"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
