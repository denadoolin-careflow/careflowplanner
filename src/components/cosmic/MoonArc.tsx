import { useMemo } from "react";
import { eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth } from "date-fns";
import { getMoonPhase, getIllumination, getMoonAgeDays, MOON_INFO, type MoonPhase } from "@/lib/moon";
import { moonSignOn } from "@/lib/cosmic/moon-aspects";
import { SIGN_GLYPH } from "@/lib/cosmic/glyphs";
import { solarSeasonFor } from "@/lib/planner/solar-season";
import { rhythmPhaseForMoon, RHYTHM_LABEL, type RhythmPhase } from "@/lib/planner/rhythm-phase";
import { cn } from "@/lib/utils";

const MAJOR: MoonPhase[] = ["new", "first-quarter", "full", "last-quarter"];
const PHASE_LINE: Record<RhythmPhase, string> = { plan: "Plant the seed.", grow: "Bring it outward.", care: "Tend what you've created.", letgo: "Empty the cup." };
const PHASE_MOON: Record<RhythmPhase, MoonPhase> = { plan: "new", grow: "first-quarter", care: "full", letgo: "last-quarter" };
const ORDER: RhythmPhase[] = ["plan", "grow", "care", "letgo"];
const glyph = (sign: string) => `${SIGN_GLYPH[sign as keyof typeof SIGN_GLYPH] ?? ""}\uFE0E`;

interface Day { date: Date; phase: MoonPhase; rhythm: RhythmPhase; illum: number; waxing: boolean; sign: string; major: boolean }

function useMonthDays(month: Date): Day[] {
  return useMemo(() => {
    const out = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }).map(d => {
      const date = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
      const phase = getMoonPhase(date);
      return { date, phase, rhythm: rhythmPhaseForMoon(phase), illum: getIllumination(date) / 100, waxing: getMoonAgeDays(date) < 14.77, sign: moonSignOn(date), major: false };
    });
    out.forEach((d, i) => { d.major = MAJOR.includes(d.phase) && (i === 0 || out[i - 1].phase !== d.phase); });
    return out;
  }, [month.getFullYear(), month.getMonth()]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function MoonDisc({ illum, waxing, rhythm, size = 28 }: { illum: number; waxing: boolean; rhythm: RhythmPhase; size?: number }) {
  const r = size / 2 - 1, c = size / 2;
  const k = 1 - 2 * Math.min(1, Math.max(0, illum));
  const rx = Math.abs(k) * r;
  const sweepOuter = waxing ? 1 : 0;
  const sweepInner = k > 0 ? (waxing ? 0 : 1) : (waxing ? 1 : 0);
  const d = `M ${c} ${c - r} A ${r} ${r} 0 0 ${sweepOuter} ${c} ${c + r} A ${rx} ${r} 0 0 ${sweepInner} ${c} ${c - r} Z`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={c} cy={c} r={r} fill="hsl(var(--muted))" stroke={`hsl(var(--rhythm-${rhythm}-deep) / 0.35)`} strokeWidth={1} />
      {illum > 0.02 && <path d={d} fill={`hsl(var(--rhythm-${rhythm}))`} />}
    </svg>
  );
}

function PhaseArt({ phase }: { phase: RhythmPhase }) {
  const deep = `hsl(var(--rhythm-${phase}-deep))`, light = `hsl(var(--rhythm-${phase}))`;
  return (
    <svg viewBox="0 0 64 32" className="h-8 w-16" aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
      {phase === "plan" && <><path d="M8 28h48" stroke={deep} strokeWidth={1.5} /><path d="M32 28V14" stroke={deep} strokeWidth={2} /><path d="M32 18c-6 0-10-4-10-9 6 0 10 4 10 9zM32 15c5 0 9-3 9-8-5 0-9 3-9 8z" fill={light} stroke={deep} strokeWidth={1.2} /></>}
      {phase === "grow" && <><circle cx={32} cy={16} r={7} fill={light} stroke={deep} strokeWidth={1.2} />{[0, 45, 90, 135, 180, 225, 270, 315].map(a => { const t = a * Math.PI / 180; return <path key={a} d={`M${32 + Math.cos(t) * 10} ${16 + Math.sin(t) * 10}L${32 + Math.cos(t) * 14} ${16 + Math.sin(t) * 14}`} stroke={deep} strokeWidth={1.5} />; })}</>}
      {phase === "care" && <><path d="M14 16h18v12H14z" fill={light} stroke={deep} strokeWidth={1.2} /><path d="M32 19l12-8M14 18c-4 0-5 6 0 6" stroke={deep} strokeWidth={1.5} /><path d="M46 13v3M49 15v3" stroke={deep} strokeWidth={1.2} /><path d="M50 28h8l-1-6h-6z" fill={light} stroke={deep} strokeWidth={1.2} /><path d="M54 22v-5" stroke={deep} strokeWidth={1.2} /></>}
      {phase === "letgo" && <><path d="M6 8c14 4 26-2 40 4" stroke={deep} strokeWidth={1.3} />{[[18, 14], [32, 20], [46, 24], [56, 28]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={4} ry={2} transform={`rotate(${30 + i * 20} ${x} ${y})`} fill={light} stroke={deep} strokeWidth={1} />)}</>}
    </svg>
  );
}

export function MoonArc({ month, selectedDate, onSelectDate, title = true }: { month: Date; selectedDate?: Date; onSelectDate?: (date: Date) => void; title?: boolean }) {
  const days = useMonthDays(month);
  const today = new Date();
  const a = solarSeasonFor(new Date(month.getFullYear(), month.getMonth(), 1));
  const b = solarSeasonFor(endOfMonth(month));
  const change = a.sign !== b.sign ? days.find(d => solarSeasonFor(d.date).sign === b.sign)?.date : undefined;
  const sel = selectedDate ? days.find(d => isSameDay(d.date, selectedDate)) : undefined;
  const phases = ORDER.map(p => {
    const start = days.find((d, i) => d.rhythm === p && (i === 0 || days[i - 1].rhythm !== p));
    const end = start ? days.slice(days.indexOf(start)).find((d, i, arr) => !arr[i + 1] || arr[i + 1].rhythm !== p) : undefined;
    return { p, start, end };
  });

  return (
    <div className="space-y-3">
      {title && <h3 className="font-display text-2xl leading-tight text-primary">{format(month, "MMMM")} moonscape</h3>}
      <div className="rounded-2xl bg-secondary/15 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Solar season</p>
        <p className="font-display text-base text-foreground">{`${a.glyph}\uFE0E`} {a.label}{change && <> → {`${b.glyph}\uFE0E`} {b.label} <span className="text-xs text-muted-foreground">from {format(change, "MMM d")}</span></>}</p>
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <ol className="flex min-w-max items-end gap-1.5 pt-4">
          {days.map((d, i) => (
            <li key={i} style={{ marginBottom: Math.round(Math.sin((i / Math.max(1, days.length - 1)) * Math.PI) * 60) }} className="flex flex-col items-center">
              <button type="button" onClick={() => onSelectDate?.(d.date)} aria-label={`${format(d.date, "MMMM d")}: ${MOON_INFO[d.phase].label} in ${d.sign}`}
                className={cn("flex min-h-11 min-w-11 items-center justify-center rounded-full", isSameDay(d.date, today) && "ring-2 ring-primary ring-offset-2 ring-offset-card", sel === d && "bg-muted")}>
                <MoonDisc illum={d.illum} waxing={d.waxing} rhythm={d.rhythm} size={d.major ? 40 : 26} />
              </button>
              <span className="text-[13px] leading-none text-foreground/80">{glyph(d.sign)}</span>
              <span className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">{format(d.date, "d")}</span>
              {d.major && <span className="mt-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: `hsl(var(--rhythm-${d.rhythm}-tint))`, color: `hsl(var(--rhythm-${d.rhythm}-deep))` }}>{MOON_INFO[d.phase].label.replace(" Moon", "")}</span>}
            </li>
          ))}
        </ol>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full" aria-hidden>
        {days.map((d, i) => <span key={i} className="flex-1" style={{ background: `hsl(var(--rhythm-${d.rhythm}))` }} />)}
      </div>
      {sel && <p className="text-xs text-muted-foreground"><strong className="text-foreground">{format(sel.date, "EEE, MMM d")} · {MOON_INFO[sel.phase].label} in {glyph(sel.sign)} {sel.sign}</strong> — {RHYTHM_LABEL[sel.rhythm]}: {PHASE_LINE[sel.rhythm]}</p>}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {phases.map(({ p, start, end }) => (
          <button key={p} type="button" disabled={!start} onClick={() => start && onSelectDate?.(start.date)}
            className="min-h-11 min-w-0 rounded-2xl p-3 text-left disabled:opacity-60" style={{ background: `hsl(var(--rhythm-${p}-tint))`, color: `hsl(var(--rhythm-${p}-deep))` }}>
            <div className="flex items-center justify-between gap-1">
              <MoonDisc illum={p === "plan" ? 0 : p === "care" ? 1 : 0.5} waxing={p !== "letgo"} rhythm={p} size={22} />
              <PhaseArt phase={p} />
            </div>
            <p className="mt-1 font-display text-lg leading-tight">{RHYTHM_LABEL[p]}</p>
            <p className="text-xs italic">{PHASE_LINE[p]}</p>
            <p className="mt-1 text-[11px] text-foreground/75">
              {MOON_INFO[PHASE_MOON[p]].label}{start && <> · {glyph(start.sign)} {start.sign}</>}
            </p>
            <p className="text-[11px] text-foreground/70">{start && end ? `${format(start.date, "MMM d")}–${format(end.date, "MMM d")}` : "Not this month"}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
