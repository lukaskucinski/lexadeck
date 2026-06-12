import { Heatmap } from "@/components/ui/Heatmap";
import { DEMO_STATS, DEMO_STREAK_DAYS, demoActivity } from "@/lib/landing-demo";
import { SRS_STATE_LABELS } from "@/lib/types";
import { srsStateVar } from "@/lib/wordTypeColors";

/** The dashboard's progress story with sample numbers: heatmap, streak, mix. */
export function TrackDemo() {
  const activity = demoActivity(95);

  return (
    <div className="border-[1.5px] border-line">
      <div className="grid sm:grid-cols-3">
        <div className="tnum border-b border-soft px-5 py-4 sm:border-b-0 sm:border-r">
          <p className="type-display text-4xl">{DEMO_STATS.reviews.toLocaleString()}</p>
          <p className="label-caps mt-1 text-muted">reviews</p>
        </div>
        <div className="tnum border-b border-soft px-5 py-4 sm:border-b-0 sm:border-r">
          <p className="type-display text-4xl">{DEMO_STREAK_DAYS} days</p>
          <p className="label-caps mt-1 text-muted">current streak</p>
        </div>
        <div className="tnum px-5 py-4">
          <p className="type-display text-4xl">{DEMO_STATS.mastered}</p>
          <p className="label-caps mt-1 text-muted">cards mastered</p>
        </div>
      </div>

      <div className="overflow-x-auto border-t border-line px-5 py-4">
        <p className="label-caps mb-3 text-muted">last 90 days</p>
        <Heatmap data={activity} weeks={14} />
      </div>

      <div className="border-t border-line px-5 py-4">
        <p className="label-caps mb-3 text-muted">where the deck stands</p>
        <div className="flex h-3 w-full gap-[2px]">
          {DEMO_STATS.distribution.map((seg) => (
            <div
              key={seg.state}
              // flex-grow weights, not % widths — rounded percentages
              // leave a subpixel gap at the bar's right edge
              style={{
                flexGrow: seg.count,
                flexBasis: 0,
                background: srsStateVar(seg.state),
              }}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {DEMO_STATS.distribution.map((seg) => (
            <span key={seg.state} className="label-caps inline-flex items-center gap-1.5 text-muted">
              <i className="h-2.5 w-2.5" style={{ background: srsStateVar(seg.state) }} />
              {SRS_STATE_LABELS[seg.state]} <b className="tnum text-ink">{seg.count}</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
