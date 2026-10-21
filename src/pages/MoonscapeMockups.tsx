import { useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isSameDay, startOfMonth } from "date-fns";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMoonPhase, getIllumination, getMoonAgeDays, MOON_INFO, type MoonPhase } from "@/lib/moon";
import { moonSignOn } from "@/lib/cosmic/moon-aspects";
import { SIGN_GLYPH } from "@/lib/cosmic/glyphs";
import { solarSeasonFor } from "@/lib/planner/solar-season";
import { rhythmPhaseForMoon, RHYTHM_LABEL, type RhythmPhase } from "@/lib/planner/rhythm-phase";
import { cn } from "@/lib/utils";

const MAJOR: MoonPhase[] = ["new", "first-quarter", "full", "last-quarter"];
const PHASE_LINE: Record<RhythmPhase, string> = { plan: "Plant the seed.", grow: "Bring it outward.", care: "Tend what you've created.", letgo: "Empty the cup." };
const ORDER: RhythmPhase[] = ["plan", "grow", "care", "letgo"];

interface Day { date: Date; phase: MoonPhase; rhythm: RhythmPhase; illum: number; waxing: boolean; sign: string; major: boolean }

function useMonth(month: Date): Day[] {
  return useMemo(() => {
    const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }).map(d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12));
    const out = days.map(date => {
      const phase = getMoonPhase(date);
      return { date, phase, rhythm: rhythmPhaseForMoon(phase), illum: getIllumination(date) / 100, waxing: getMoonAgeDays(date) < 14.77, sign: moonSignOn(date), major: false };
    });
    // Mark only the first day of each major phase run so labels aren't repeated.
    out.forEach((d, i) => { d.major = MAJOR.includes(d.phase) && (i === 0 || out[i - 1].phase !== d.phase); });
    return out;
  }, [month]);
}

/** Moon disc drawn with the lit portion; colours come from phase tokens. */
function MoonDisc({ illum, waxing, rhythm, size = 28 }: { illum: number; waxing: boolean; rhythm: RhythmPhase; size?: number }) {
  const r = size / 2 - 1, c = size / 2;
  const k = 1 - 2 * Math.min(1, Math.max(0, illum)); // terminator x-scale: 1 new → -1 full
  const lit = `hsl(var(--rhythm-${rhythm}))`;
  const sweepOuter = waxing ? 1 : 0;
  const rx = Math.abs(k) * r;
  const sweepInner = k > 0 ? (waxing ? 0 : 1) : (waxing ? 1 : 0);
  const d = `M ${c} ${c - r} A ${r} ${r} 0 0 ${sweepOuter} ${c} ${c + r} A ${rx} ${r} 0 0 ${sweepInner} ${c} ${c - r} Z`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={c} cy={c} r={r} fill="hsl(var(--muted))" stroke={`hsl(var(--rhythm-${rhythm}-deep) / 0.35)`} strokeWidth={1} />
      {illum > 0.02 && <path d={d} fill={lit} />}
    </svg>
  );
}

function SeasonRibbon({ month }: { month: Date }) {
  const a = solarSeasonFor(new Date(month.getFullYear(), month.getMonth(), 1));
  const b = solarSeasonFor(endOfMonth(month));
  const change = a.sign !== b.sign ? eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }).find(d => solarSeasonFor(d).sign === b.sign) : null;
  return (
    <div className="rounded-2xl bg-secondary/15 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-secondary-foreground/80">Solar season</p>
      <p className="font-display text-lg text-foreground">{`${a.glyph}\uFE0E`} {a.label}{change && <> → {`${b.glyph}\uFE0E`} {b.label} <span className="text-sm text-muted-foreground">from {format(change, "MMM d")}</span></>}</p>
      <p className="text-xs text-muted-foreground">{a.theme}</p>
    </div>
  );
}

function MockupArc({ days, month }: { days: Day[]; month: Date }) {
  const [sel, setSel] = useState<Day | null>(null);
  const today = new Date();
  return (
    <article className="space-y-4 rounded-3xl border border-border bg-card p-4 shadow-soft">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent-foreground/70">Mockup A · Moon Arc</p>
        <h2 className="font-display text-3xl leading-tight text-primary">{format(month, "MMMM")} moonscape</h2>
      </header>
      <SeasonRibbon month={month} />
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <ol className="flex min-w-max items-end gap-1.5 pt-6">
          {days.map((d, i) => {
            const lift = Math.round(Math.sin((i / (days.length - 1)) * Math.PI) * 70);
            return (
              <li key={i} style={{ marginBottom: lift }} className="flex flex-col items-center">
                <button type="button" onClick={() => setSel(d)} aria-label={`${format(d.date, "MMM d")}: ${MOON_INFO[d.phase].label} in ${d.sign}`}
                  className={cn("flex min-h-11 min-w-11 flex-col items-center justify-center rounded-full", isSameDay(d.date, today) && "ring-2 ring-primary ring-offset-2 ring-offset-card", sel && isSameDay(sel.date, d.date) && "bg-muted")}>
                  <MoonDisc illum={d.illum} waxing={d.waxing} rhythm={d.rhythm} size={d.major ? 40 : 26} />
                </button>
                <span className="text-[13px] leading-none text-foreground/80">{`${SIGN_GLYPH[d.sign as keyof typeof SIGN_GLYPH]}\uFE0E`}</span>
                <span className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">{format(d.date, "d")}</span>
                {d.major && <span className="mt-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: `hsl(var(--rhythm-${d.rhythm}-tint))`, color: `hsl(var(--rhythm-${d.rhythm}-deep))` }}>{MOON_INFO[d.phase].label.replace(" Moon", "")}</span>}
              </li>
            );
          })}
        </ol>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full" aria-hidden>
        {days.map((d, i) => <span key={i} className="flex-1" style={{ background: `hsl(var(--rhythm-${d.rhythm}))` }} />)}
      </div>
      <div className="min-h-[72px] rounded-2xl bg-muted/50 p-3 text-sm">
        {sel ? <>
          <p className="font-semibold">{format(sel.date, "EEE, MMM d")} · {MOON_INFO[sel.phase].label} in {sel.sign}</p>
          <p className="text-muted-foreground">{RHYTHM_LABEL[sel.rhythm]} — {PHASE_LINE[sel.rhythm]} {MOON_INFO[sel.phase].invitation}</p>
        </> : <p className="text-muted-foreground">Tap a moon to see its sign and rhythm. Swipe to see the whole month.</p>}
      </div>
    </article>
  );
}

function MockupGarden({ days, month }: { days: Day[]; month: Date }) {
  const lead = getDay(startOfMonth(month));
  const today = new Date();
  const counts = ORDER.map(p => ({ p, first: days.find(d => d.rhythm === p) }));
  return (
    <article className="space-y-4 rounded-3xl border border-border bg-card p-4 shadow-soft">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent-foreground/70">Mockup B · Phase Garden</p>
        <h2 className="font-display text-3xl leading-tight text-primary">{format(month, "MMMM")} moonscape</h2>
      </header>
      <SeasonRibbon month={month} />
      <div className="grid grid-cols-2 gap-2">
        {counts.map(({ p, first }, i) => (
          <div key={p} className="rounded-2xl p-3" style={{ background: `hsl(var(--rhythm-${p}-tint))` }}>
            <p className="font-display text-lg leading-tight" style={{ color: `hsl(var(--rhythm-${p}-deep))` }}>{i + 1} · {RHYTHM_LABEL[p]}</p>
            <p className="text-xs italic" style={{ color: `hsl(var(--rhythm-${p}-deep))` }}>{PHASE_LINE[p]}</p>
            {first && <p className="mt-1 text-[11px] text-foreground/70">from {format(first.date, "MMM d")}</p>}
          </div>
        ))}
      </div>
      <div>
        <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-muted-foreground">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: lead }).map((_, i) => <span key={`l${i}`} />)}
          {days.map((d, i) => (
            <div key={i} title={`${MOON_INFO[d.phase].label} in ${d.sign}`}
              className={cn("flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-xl py-1", isSameDay(d.date, today) && "ring-2 ring-primary")}
              style={{ background: `hsl(var(--rhythm-${d.rhythm}-tint) / 0.7)` }}>
              <span className="text-[10px] tabular-nums text-foreground/70">{format(d.date, "d")}</span>
              <MoonDisc illum={d.illum} waxing={d.waxing} rhythm={d.rhythm} size={d.major ? 26 : 20} />
              <span className="text-[12px] leading-none" style={{ color: `hsl(var(--rhythm-${d.rhythm}-deep))` }}>{`${SIGN_GLYPH[d.sign as keyof typeof SIGN_GLYPH]}\uFE0E`}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="border-t border-border pt-2 text-[11px] text-muted-foreground">Plan → Grow → Care → Let go → begin again</p>
    </article>
  );
}

export default function MoonscapeMockups() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const days = useMonth(month);
  return (
    <div className="mx-auto max-w-md space-y-5 px-3 py-5 pb-28">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="min-h-11"><Link to="/cosmic-flow">Back</Link></Button>
        <h1 className="flex-1 text-center font-display text-xl">Moonscape mockups</h1>
        <Button size="icon" variant="ghost" className="h-11 w-11" aria-label="Previous month" onClick={() => setMonth(m => addMonths(m, -1))}><ChevronLeft className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="h-11 w-11" aria-label="Next month" onClick={() => setMonth(m => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <MockupArc days={days} month={month} />
      <MockupGarden days={days} month={month} />
    </div>
  );
}
