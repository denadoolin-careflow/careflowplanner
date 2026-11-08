import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MoonPhase, EclipticGeoMoon } from "astronomy-engine";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META, type CyclePhase } from "@/lib/cycle";
import { lunarRhythmAt, LUNAR_RHYTHM } from "@/lib/cosmic/lunar-rhythm";
import { PHASE_ICONS } from "@/lib/phase-icons";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";
import { cn } from "@/lib/utils";

const ORDER: RhythmPhase[] = ["plan", "grow", "care", "letgo"];
export const CYCLE_TO_RHYTHM: Record<CyclePhase, RhythmPhase> = { menstrual: "plan", follicular: "grow", ovulatory: "care", luteal: "letgo" };
const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const tone = (p: RhythmPhase, k: "light" | "tint" | "deep" = "light") => `hsl(var(--rhythm-${p}${k === "light" ? "" : `-${k}`}))`;

function Ring({ r, frac, active, faded }: { r: number; frac: number | null; active: RhythmPhase | null; faded?: boolean }) {
  const c = 2 * Math.PI * r;
  return (
    <g opacity={faded ? 0.35 : 1}>
      {ORDER.map((p, i) => {
        const Icon = PHASE_ICONS[p];
        const a = (i + 0.5) * (Math.PI / 2);
        const s = active === p ? 14 : 10;
        return (
          <g key={p}>
            <circle r={r} fill="none" stroke={tone(p)} strokeWidth={active === p ? 16 : 12} strokeOpacity={active === p ? 1 : 0.5}
              strokeDasharray={`${c / 4 - 3} ${c}`} strokeDashoffset={-(c / 4) * i} transform="rotate(-90)" />
            <g transform={`translate(${r * Math.sin(a) - s / 2} ${-r * Math.cos(a) - s / 2})`} style={{ color: tone(p, "deep") }}>
              <Icon width={s} height={s} strokeWidth={2.4} />
            </g>
          </g>
        );
      })}
      {frac != null && (
        <circle r={6} cx={r * Math.sin(frac * 2 * Math.PI)} cy={-r * Math.cos(frac * 2 * Math.PI)}
          fill="hsl(var(--card))" stroke="hsl(var(--foreground))" strokeWidth={2} />
      )}
    </g>
  );
}

export function useDayRhythms(date: Date) {
  const { periods, settings } = useCycle();
  return useMemo(() => {
    const angle = MoonPhase(date);
    const info = getPhaseInfo(date, periods, settings);
    return {
      moon: lunarRhythmAt(date), moonFrac: angle / 360,
      sign: SIGNS[Math.floor((((EclipticGeoMoon(date).lon % 360) + 360) % 360) / 30)],
      cycle: info?.phase ?? null, cycleFrac: info ? (info.cycleDay - 1) / info.cycleLength : null,
      cycleDay: info?.cycleDay ?? null,
    };
  }, [date, periods, settings]);
}

export function TwinRingsWidget({ date }: { date: Date }) {
  const base = useMemo(() => startOfDay(date), [date]);
  const [sel, setSel] = useState(base);
  useEffect(() => setSel(base), [base]);
  const days = useMemo(() => Array.from({ length: 56 }, (_, i) => addDays(base, i - 14)), [base]);
  const { periods, settings } = useCycle();
  const d = useDayRhythms(sel);
  const cyc = d.cycle ? CYCLE_TO_RHYTHM[d.cycle] : null;
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = stripRef.current;
    const selected = strip?.querySelector<HTMLElement>("[aria-pressed='true']");
    if (!strip || !selected) return;
    const stripBox = strip.getBoundingClientRect();
    const selectedBox = selected.getBoundingClientRect();
    // Center only this horizontal rail; scrollIntoView also moves the page.
    strip.scrollTo({
      left: strip.scrollLeft + selectedBox.left - stripBox.left - (strip.clientWidth - selectedBox.width) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [sel]);
  const MoonIcon = PHASE_ICONS[d.moon];
  const CycIcon = cyc ? PHASE_ICONS[cyc] : null;

  return (
    <section className="rounded-2xl border bg-card p-3 sm:p-4" aria-label="Moon and cycle rhythm">
      <div className="flex flex-col items-center gap-3 sm:flex-row lg:flex-col">
        <svg viewBox="-82 -82 164 164" className="h-52 w-52 shrink-0" role="img"
          aria-label={`${format(sel, "MMM d")}: Moon ${LUNAR_RHYTHM[d.moon].label}${d.cycle ? `, cycle ${PHASE_META[d.cycle].label}` : ""}`}>
          <Ring r={68} frac={d.moonFrac} active={d.moon} />
          <Ring r={44} frac={d.cycleFrac} active={cyc} faded={!d.cycle} />
          <text textAnchor="middle" y={-2} className="fill-foreground font-display" fontSize={14}>{LUNAR_RHYTHM[d.moon].glyph}</text>
          <text textAnchor="middle" y={13} className="fill-muted-foreground" fontSize={8}>{d.cycleDay ? `Day ${d.cycleDay}` : "Log cycle"}</text>
        </svg>
        <ul className="w-full space-y-2 text-sm">
          <li className="rounded-xl p-2" style={{ background: tone(d.moon, "tint") }}>
            <span className="flex items-center gap-1.5 font-semibold" style={{ color: tone(d.moon, "deep") }}>
              <MoonIcon className="h-4 w-4" /> Moon · {LUNAR_RHYTHM[d.moon].label} in {d.sign}
            </span>
            <span className="block text-xs text-foreground/80">{LUNAR_RHYTHM[d.moon].invitation}</span>
          </li>
          <li className="rounded-xl p-2" style={{ background: cyc ? tone(cyc, "tint") : undefined }}>
            <span className="flex items-center gap-1.5 font-semibold" style={{ color: cyc ? tone(cyc, "deep") : undefined }}>
              {CycIcon && <CycIcon className="h-4 w-4" />} Cycle · {d.cycle ? `${PHASE_META[d.cycle].label}, day ${d.cycleDay}` : "Not logged yet"}
            </span>
            {d.cycle ? <span className="block text-xs text-foreground/80">{PHASE_META[d.cycle].invitation}</span>
              : <Link to="/health" className="text-xs underline">Log a period start to see your inner ring</Link>}
          </li>
        </ul>
      </div>

      <div className="mt-3 flex items-center gap-1">
        <button type="button" aria-label="Previous day" onClick={() => setSel(addDays(sel, -1))} className="grid h-11 w-9 shrink-0 place-items-center rounded-lg hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
        <div ref={stripRef} className="flex flex-1 snap-x gap-1 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none]">
          {days.map((day) => {
            const m = lunarRhythmAt(day);
            const ci = getPhaseInfo(day, periods, settings);
            const on = isSameDay(day, sel);
            return (
              <button key={day.toISOString()} type="button" aria-pressed={on} aria-label={format(day, "EEEE MMMM d")}
                onClick={() => setSel(day)}
                className={cn("flex min-h-11 w-11 shrink-0 snap-center flex-col items-center rounded-lg py-1 text-xs",
                  on ? "bg-primary text-primary-foreground" : "hover:bg-muted", isSameDay(day, base) && !on && "ring-1 ring-primary")}>
                <span className="text-xs opacity-80">{format(day, "EEEEE")}</span>
                <span className="font-semibold">{format(day, "d")}</span>
                <span className="mt-0.5 flex gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone(m) }} />
                  {ci && <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone(CYCLE_TO_RHYTHM[ci.phase]) }} />}
                </span>
              </button>
            );
          })}
        </div>
        <button type="button" aria-label="Next day" onClick={() => setSel(addDays(sel, 1))} className="grid h-11 w-9 shrink-0 place-items-center rounded-lg hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
      </div>
      {!isSameDay(sel, base) && (
        <button type="button" onClick={() => setSel(base)} className="mt-1 min-h-9 text-xs font-medium text-primary underline">Back to {format(base, "MMM d")}</button>
      )}
    </section>
  );
}
