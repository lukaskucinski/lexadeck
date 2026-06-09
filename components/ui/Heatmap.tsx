export interface DayCount {
  /** YYYY-MM-DD (local) */
  day: string;
  count: number;
}

function intensity(count: number, max: number): string {
  if (count === 0) return "var(--c-soft)";
  const t = Math.min(1, count / Math.max(1, max * 0.75));
  if (t < 0.34) return "color-mix(in srgb, var(--c-teal) 35%, var(--c-soft))";
  if (t < 0.67) return "color-mix(in srgb, var(--c-teal) 65%, var(--c-soft))";
  return "var(--c-teal)";
}

function localDayString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * GitHub-style activity grid. Columns are weeks (Mon-first), newest on the
 * right, `weeks` columns wide.
 */
export function Heatmap({ data, weeks = 13 }: { data: DayCount[]; weeks?: number }) {
  const countByDay = new Map(data.map((d) => [d.day, d.count]));
  const max = Math.max(0, ...data.map((d) => d.count));

  // end at today; pad so the last column ends on Sunday
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + ((7 - ((today.getDay() + 6) % 7) - 1) % 7));

  const columns: { day: string; count: number; inFuture: boolean }[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const col: { day: string; count: number; inFuture: boolean }[] = [];
    for (let d = 6; d >= 0; d--) {
      const date = new Date(end);
      date.setDate(end.getDate() - w * 7 - d);
      const key = localDayString(date);
      col.push({
        day: key,
        count: countByDay.get(key) ?? 0,
        inFuture: date > today,
      });
    }
    columns.push(col);
  }

  return (
    <div className="flex gap-[3px]">
      {columns.map((col, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {col.map(({ day, count, inFuture }) => (
            <div
              key={day}
              title={inFuture ? undefined : `${day} · ${count} review${count === 1 ? "" : "s"}`}
              className="h-[11px] w-[11px]"
              style={{
                background: inFuture ? "transparent" : intensity(count, max),
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
