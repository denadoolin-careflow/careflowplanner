import { useMemo, useState } from "react";
import { seasonsInMonth } from "@/lib/seasons/zodiac-seasons";
import { ELEMENT_CLASSES } from "@/lib/seasons/element-classes";
import { phaseSignAdvice } from "@/lib/cosmic/moon-energy";
import { addDays, eachMonthOfInterval, endOfYear, format, isSameDay, startOfMonth, startOfWeek, startOfYear, differenceInCalendarDays, endOfMonth, endOfWeek, isSameMonth } from "date-fns";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { lunarRhythmAt, LUNAR_RHYTHM } from "@/lib/cosmic/lunar-rhythm";
import { PHASE_ICONS } from "./PhaseRibbon";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { getMoonSign } from "@/lib/zodiac";

const noon = (d: Date) => { const x = new Date(d); x.setHours(12, 0, 0, 0); return x; };
const moonOf = (d: Date) => MOON_INFO[getMoonPhase(noon(d))];
const signOf = (d: Date) => getMoonSign(noon(d));

const phaseOf = (d: Date) => { const x = new Date(d); x.setHours(12, 0, 0, 0); return lunarRhythmAt(x); };

/** Twelve mini-months with load shading — a year at a glance. */
export function PlannerYearView({ date, onSelectDay, onSelectMonth }: {
  date: Date;
  onSelectDay: (d: Date) => void;
  onSelectMonth?: (d: Date) => void;
}) {
  const { state } = useStore() as any;
  const months = eachMonthOfInterval({ start: startOfYear(date), end: endOfYear(date) });
  const today = new Date();
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    const bump = (k?: string) => { if (k) m.set(k, (m.get(k) ?? 0) + 1); };
    for (const t of state.tasks ?? []) bump(t.dueDate);
    for (const a of state.appointments ?? []) bump(a.date);
    for (const meal of state.meals ?? []) bump(meal.date);
    return m;
  }, [state.tasks, state.appointments, state.meals]);

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
      {months.map(mo => {
        const gStart = startOfWeek(startOfMonth(mo), { weekStartsOn: 1 });
        const gEnd = endOfWeek(endOfMonth(mo), { weekStartsOn: 1 });
        const total = differenceInCalendarDays(gEnd, gStart) + 1;
        const days = Array.from({ length: total }, (_, i) => addDays(gStart, i));
        const monthCount = days.reduce((s, d) => s + (isSameMonth(d, mo) ? (counts.get(format(d, "yyyy-MM-dd")) ?? 0) : 0), 0);
        const isCurrentMonth = isSameMonth(mo, today);
        const segs: { phase: ReturnType<typeof phaseOf>; start: Date; days: number }[] = [];
        for (let d = startOfMonth(mo); d <= endOfMonth(mo); d = addDays(d, 1)) {
          const ph = phaseOf(d); const last = segs[segs.length - 1];
          if (last && last.phase === ph) last.days++; else segs.push({ phase: ph, start: d, days: 1 });
        }
        return (
          <div
            key={format(mo, "yyyy-MM")}
            className={cn(
              "rounded-lg border border-border/60 bg-card/40 p-1.5 sm:p-2",
              isCurrentMonth && "border-primary/40 bg-primary/[0.04]",
            )}
          >
            <button
              type="button"
               onClick={() => (onSelectMonth ?? onSelectDay)(mo)}
              className="mb-1 flex min-h-10 w-full items-center justify-between gap-1 text-left hover:text-primary"
            >
              <span className={cn("truncate font-display text-[13px] font-semibold sm:text-sm", isCurrentMonth && "text-primary")}>
                {format(mo, "MMM")}
              </span>
              {monthCount > 0 && (
                <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground">{monthCount}</span>
              )}
            </button>
            {(() => {
              const spans = seasonsInMonth(mo);
              const s = spans[spans.length - 1].season;
              const el = ELEMENT_CLASSES[s.element];
              return (
                <div className={cn("mb-1.5 rounded-md border px-1.5 py-1 text-[10px] leading-tight", el.bg, el.border)}>
                  <p className={cn("font-semibold", el.text)}>
                    {spans.map(x => x.season.glyph).join(" ")} {spans.map(x => x.season.sign).join(" → ")} season
                  </p>
                  <p className="text-muted-foreground">{spans.map(x => x.season.theme).join(" · ")}</p>
                </div>
              );
            })()}
            <div className="grid grid-cols-7 gap-[2px] text-center text-[9px] text-muted-foreground">
              {["M","T","W","T","F","S","S"].map((d, i) => (
                <div key={i} className={cn("leading-4", i > 4 && "text-muted-foreground/60")}>{d}</div>
              ))}
              {days.map((d, i) => {
                const key = format(d, "yyyy-MM-dd");
                const n = counts.get(key) ?? 0;
                const dim = !isSameMonth(d, mo);
                const ph = phaseOf(d);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSelectDay(d)}
                    aria-label={`${format(d, "MMMM d")} · ${LUNAR_RHYTHM[ph].label} · ${moonOf(d).label} in ${signOf(d).name}${n ? ` — ${n} planned` : ""}`}
                    className={cn(
                       "flex min-h-[30px] flex-col items-center justify-center rounded-[5px] text-[10px] leading-none transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      dim && "opacity-25",
                      isSameDay(d, today) && "bg-primary font-semibold text-primary-foreground",
                    )}
                    style={!dim && !isSameDay(d, today)
                      ? { backgroundColor: `hsl(var(--rhythm-${ph}-tint))`, color: `hsl(var(--rhythm-${ph}-deep))`, fontWeight: n ? 700 : undefined, boxShadow: n ? `inset 0 -2px 0 hsl(var(--rhythm-${ph}-deep) / ${Math.min(0.9, 0.35 + n * 0.15)})` : undefined }
                      : undefined}
                  >
                    {dim ? "" : (<>
                      <span>{format(d, "d")}</span>
                      <span className="mt-px flex items-center gap-px text-[7px] leading-none opacity-90" aria-hidden>{moonOf(d).glyph}<span>{signOf(d).symbol}</span></span>
                    </>)}
                  </button>
                );
              })}
            </div>
            <ul aria-label={`${format(mo, "MMMM")} phases`} className="mt-1.5 space-y-0.5">
              {segs.map((sg, si) => {
                const Icon = PHASE_ICONS[sg.phase];
                const m = moonOf(sg.start); const z = signOf(sg.start);
                const id = `${format(mo, "yyyy-MM")}-${si}`;
                const open = openId === id;
                return (
                  <li key={si} className="rounded-md" style={{ background: `hsl(var(--rhythm-${sg.phase}-tint))`, color: `hsl(var(--rhythm-${sg.phase}-deep))` }}>
                    <button type="button" aria-expanded={open} onClick={() => setOpenId(open ? null : id)}
                      className="flex min-h-7 w-full items-center gap-1 rounded-md px-1 text-left text-[10px] leading-tight hover:bg-muted/40">
                      <span className="w-9 shrink-0 font-semibold tabular-nums">{format(sg.start, "MMM d")}</span>
                      <Icon className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="shrink-0 font-semibold">{LUNAR_RHYTHM[sg.phase].label}</span>
                      <span className="min-w-0 flex-1 truncate text-right">{m.glyph} {z.symbol} {z.name}</span>
                    </button>
                    {open && (
                      <div className="px-1.5 pb-1.5 text-[10px] leading-snug">
                        <p>{phaseSignAdvice(sg.phase, z.name)}</p>
                        <button type="button" onClick={() => onSelectDay(sg.start)} className="mt-1 min-h-7 font-semibold underline underline-offset-2">
                          Open day
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
