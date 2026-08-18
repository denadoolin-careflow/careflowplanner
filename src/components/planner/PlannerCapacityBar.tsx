import { useMemo } from "react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { useTimeBlocks } from "@/lib/time-blocks";
import { useBandColors, swatchClass, type BandId } from "@/lib/planner-band-colors";
import { ENERGY_COLOR, useDayPartEnergy, type DayPart, type Energy } from "@/lib/energy-by-part";
import { MOODS, useDayPartMood } from "@/lib/mood-by-part";
import { cn } from "@/lib/utils";
import { usePlannerCapacityLogger } from "@/lib/planner-capacity-log";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { dominantCondition, condTint } from "@/lib/planner/hour-weather";
import { ConditionIcon } from "@/components/weather/ConditionIcon";
import { isSameDay } from "date-fns";

const BANDS: { id: BandId; part: DayPart; label: string; startH: number; endH: number }[] = [
  { id: "morning", part: "morning", label: "Morning", startH: 5, endH: 12 },
  { id: "afternoon", part: "afternoon", label: "Afternoon", startH: 12, endH: 17 },
  { id: "evening", part: "evening", label: "Evening", startH: 17, endH: 22 },
];

const ENERGY_STEPS: { id: Energy; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

function hmToMin(v?: string | null): number | null {
  if (!v) return null;
  const [h, m] = v.split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
}

/** Planned vs available minutes for the day, with a per-band breakdown.
 *  Pass `part` to render just one band (compact, for time-of-day sections). */
export function PlannerCapacityBar({ date, className, part, compact }: {
  date: Date;
  className?: string;
  part?: DayPart;
  compact?: boolean;
}) {
  const { state } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const { blocks } = useTimeBlocks(iso, iso);
  const [colors] = useBandColors();
  const [energy, setEnergy] = useDayPartEnergy(iso);
  const [mood, setMood] = useDayPartMood(iso);
  const weatherSnap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const isToday = isSameDay(date, new Date());

  /** Dominant forecast hour for each band — matches the timeline's hourly colors. */
  const bandWeather = useMemo(() => {
    const out: Partial<Record<BandId, ReturnType<typeof dominantCondition>>> = {};
    if (!isToday) return out;
    const hours = weatherSnap?.todayHourly ?? [];
    for (const b of BANDS) {
      out[b.id] = dominantCondition(hours.filter(h => h.hour >= b.startH && h.hour < b.endH));
    }
    return out;
  }, [weatherSnap, isToday]);

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

  const shown = part ? rows.filter(r => r.part === part) : rows;
  const planned = shown.reduce((s, r) => s + r.planned, 0);
  const available = shown.reduce((s, r) => s + r.available, 0);

  // Persist the day's real load so Capacity Insights can learn from the planner.
  const completedMin = useMemo(
    () => state.tasks
      .filter(t => t.dueDate === iso && t.done)
      .reduce((s, t) => s + (t.estMinutes ?? 30), 0),
    [state.tasks, iso],
  );
  const dayPartLoad = useMemo(
    () => Object.fromEntries(rows.map(r => [r.part, { planned: r.planned, available: r.available }])),
    [rows],
  );
  const totalPlanned = useMemo(() => rows.reduce((s, r) => s + r.planned, 0), [rows]);
  usePlannerCapacityLogger(iso, totalPlanned, completedMin, dayPartLoad, !part);
  const hrs = (m: number) => `${Math.round((m / 60) * 10) / 10}h`;

  return (
    <section
      className={cn(
        compact
          ? "rounded-lg border border-border/40 bg-background/40 px-2 py-1.5"
          : "rounded-xl border border-border/50 bg-background/60 px-3 py-2",
        className,
      )}
      aria-label={part ? `${part} capacity` : "Day capacity"}
    >
      {!compact && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Capacity</p>
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">{hrs(planned)}</span> planned · {hrs(Math.max(0, available - planned))} free
          </p>
        </div>
      )}
      <div className={cn(compact ? "grid grid-cols-1 gap-2" : "mt-1.5 grid grid-cols-3 gap-2")}>
        {shown.map(r => {
          const pct = Math.min(100, Math.round((r.planned / r.available) * 100));
          const over = r.planned > r.available;
          const wx = bandWeather[r.id] ?? null;
          const tint = wx ? condTint(wx.condition, wx.isNight) : null;
          return (
            <div key={r.id}>
              <div className="flex items-baseline justify-between gap-1">
                <span className="truncate text-[10.5px] text-muted-foreground">{compact ? `${hrs(r.planned)} planned` : r.label}</span>
                <span className={cn("text-[10px] tabular-nums", over ? "text-destructive" : "text-muted-foreground/80")}>
                  {compact ? `${hrs(Math.max(0, r.available - r.planned))} free` : hrs(r.planned)}
                </span>
              </div>
              {wx && tint && (
                <div
                  className="mt-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] tabular-nums dark:brightness-[1.9]"
                  style={{ borderColor: tint.borderColor, background: tint.background, color: tint.color }}
                  title={`${r.label} · ${wx.conditionLabel}${wx.precipChance >= 10 ? ` · ${wx.precipChance}% precip` : ""}`}
                  aria-label={`${r.label} weather: ${wx.conditionLabel}, ${unit === "F" ? cToF(wx.tempC) : Math.round(wx.tempC)} degrees${wx.precipChance >= 10 ? `, ${wx.precipChance}% chance of precipitation` : ""}`}
                >
                  <ConditionIcon condition={wx.condition} isNight={wx.isNight} className="h-3 w-3" />
                  <span>{unit === "F" ? cToF(wx.tempC) : Math.round(wx.tempC)}°</span>
                  {wx.precipChance >= 10 && <span className="opacity-80">{wx.precipChance}%</span>}
                </div>
              )}
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
              <div className="mt-1.5 flex flex-wrap items-center gap-0.5" aria-label={`${r.label} mood`}>
                {MOODS.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    aria-label={`${r.label} mood ${m.label}`}
                    aria-pressed={mood[r.part] === m.id}
                    onClick={() => setMood(r.part, m.id)}
                    className={cn(
                      "rounded-full px-1 py-px text-[11px] leading-none transition",
                      mood[r.part] === m.id ? "bg-primary/15 ring-1 ring-primary/40" : "opacity-55 hover:opacity-100",
                    )}
                  >
                    {m.emoji}
                  </button>
                ))}
              </div>
              <div className="mt-1 flex items-center gap-0.5" aria-label={`${r.label} energy`}>
                {ENERGY_STEPS.map(e => (
                  <button
                    key={e.id}
                    type="button"
                    aria-label={`${r.label} energy ${e.label}`}
                    aria-pressed={energy[r.part] === e.id}
                    onClick={() => setEnergy(r.part, e.id)}
                    className={cn(
                      "flex-1 rounded-full border px-1 py-px text-[9.5px] leading-tight transition",
                      energy[r.part] === e.id
                        ? cn(ENERGY_COLOR[e.id].bg, ENERGY_COLOR[e.id].text, ENERGY_COLOR[e.id].border)
                        : "border-border/50 text-muted-foreground/70 hover:text-foreground",
                    )}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}