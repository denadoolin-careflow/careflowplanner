import { useMemo } from "react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { useTimeBlocks } from "@/lib/time-blocks";
import { useBandColors, swatchClass, type BandId } from "@/lib/planner-band-colors";
import { cn } from "@/lib/utils";

const BANDS: { id: BandId; label: string; startH: number; endH: number }[] = [
  { id: "morning", label: "Morning", startH: 5, endH: 12 },
  { id: "afternoon", label: "Afternoon", startH: 12, endH: 17 },
  { id: "evening", label: "Evening", startH: 17, endH: 22 },
];

function hmToMin(v?: string | null): number | null {
  if (!v) return null;
  const [h, m] = v.split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
}

/** Planned vs available minutes for the day, with a per-band breakdown. */
export function PlannerCapacityBar({ date, className }: { date: Date; className?: string }) {
  const { state } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const { blocks } = useTimeBlocks(iso, iso);
  const [colors] = useBandColors();

  const rows = useMemo(() => {
    const spans: { start: number; dur: number }[] = [];
    const blockTaskIds = new Set(blocks.filter(b => b.taskId).map(b => b.taskId as string));
    for (const b of blocks) {
      const s = hmToMin(b.startTime); const e = hmToMin(b.endTime);
      if (s === null) continue;
      spans.push({ start: s, dur: Math.max(15, (e ?? s + 30) - s) });
    }
    for (const t of state.tasks) {
      if (t.dueDate !== iso || blockTaskIds.has(t.id)) continue;
      const s = hmToMin(t.startTime);
      if (s === null) continue;
      spans.push({ start: s, dur: t.estMinutes ?? 30 });
    }
    for (const a of state.appointments) {
      if (a.date !== iso) continue;
      const s = hmToMin(a.time); if (s === null) continue;
      const e = hmToMin(a.endTime);
      spans.push({ start: s, dur: Math.max(15, (e ?? s + 30) - s) });
    }
    return BANDS.map(b => {
      const available = (b.endH - b.startH) * 60;
      let planned = 0;
      for (const s of spans) {
        const overlap = Math.min(s.start + s.dur, b.endH * 60) - Math.max(s.start, b.startH * 60);
        if (overlap > 0) planned += overlap;
      }
      return { ...b, available, planned };
    });
  }, [state.tasks, state.appointments, blocks, iso]);

  const planned = rows.reduce((s, r) => s + r.planned, 0);
  const available = rows.reduce((s, r) => s + r.available, 0);
  const hrs = (m: number) => `${Math.round((m / 60) * 10) / 10}h`;

  return (
    <section className={cn("rounded-xl border border-border/50 bg-background/60 px-3 py-2", className)} aria-label="Day capacity">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Capacity</p>
        <p className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">{hrs(planned)}</span> planned · {hrs(Math.max(0, available - planned))} free
        </p>
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-2">
        {rows.map(r => {
          const pct = Math.min(100, Math.round((r.planned / r.available) * 100));
          const over = r.planned > r.available;
          return (
            <div key={r.id}>
              <div className="flex items-baseline justify-between gap-1">
                <span className="truncate text-[10.5px] text-muted-foreground">{r.label}</span>
                <span className={cn("text-[10px] tabular-nums", over ? "text-destructive" : "text-muted-foreground/80")}>
                  {hrs(r.planned)}
                </span>
              </div>
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label={`${r.label} capacity`}
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className={cn("h-full rounded-full", over ? "bg-destructive" : swatchClass(colors[r.id]))} style={{ width: `${Math.max(2, pct)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}