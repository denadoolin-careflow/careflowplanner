import { useMemo } from "react";
import { addDays, format } from "date-fns";
import { Sparkles, Moon, Heart, Sun } from "lucide-react";
import { upcomingEvents } from "@/lib/cosmic/events";
import { getMoonPhase } from "@/lib/moon";
import { getActiveAspects } from "@/lib/cosmic/active-aspects";

function rangeDates(d: Date[]): string {
  if (d.length === 0) return "—";
  const fmt = (x: Date) => format(x, "MMM d");
  if (d.length === 1) return fmt(d[0]);
  return `${fmt(d[0])} – ${fmt(d[d.length - 1])}`;
}

function pickDates(from: Date, days: number, predicate: (date: Date) => boolean, max = 6) {
  const out: Date[] = [];
  for (let i = 0; i < days && out.length < max; i++) {
    const d = addDays(from, i);
    if (predicate(d)) out.push(d);
  }
  return out;
}

export function PredictiveSnapshotList({ from = new Date() }: { from?: Date }) {
  const items = useMemo(() => {
    // Most supportive — days with trine/sextile + waxing moon
    const supportive = pickDates(from, 30, d => {
      const a = getActiveAspects(d, 3);
      const phase = getMoonPhase(d);
      const tone = a.some(x => x.aspect === "trine" || x.aspect === "sextile");
      return tone && (phase === "waxing-crescent" || phase === "waxing-gibbous" || phase === "first-quarter" || phase === "full");
    });
    // Reflective — squares/oppositions + waning moon
    const reflective = pickDates(from, 30, d => {
      const a = getActiveAspects(d, 3);
      const phase = getMoonPhase(d);
      return a.some(x => x.aspect === "square" || x.aspect === "opposition") && (phase === "waning-gibbous" || phase === "last-quarter" || phase === "waning-crescent");
    });
    // Relationships — Venus involved with major aspect
    const venus = pickDates(from, 30, d => getActiveAspects(d, 4).some(a => a.a === "Venus" || a.b === "Venus"), 4);
    // Rest — waning + voc days approximated by last-quarter / new
    const rest = pickDates(from, 30, d => {
      const phase = getMoonPhase(d);
      return phase === "last-quarter" || phase === "waning-crescent" || phase === "new";
    });
    // Creative peak — Sun trine/sextile or Mars trine Jupiter type
    const creative = pickDates(from, 30, d => getActiveAspects(d, 3).some(a => (a.a === "Sun" || a.b === "Sun") && (a.aspect === "trine" || a.aspect === "sextile")));

    const events = upcomingEvents(from, 30);
    const nextNew = events.find(e => e.kind === "phase" && e.phase === "new");
    const nextFull = events.find(e => e.kind === "phase" && e.phase === "full");

    return [
      { icon: <Sparkles className="h-3.5 w-3.5 text-primary" />,        label: "Most Supportive Dates",        value: rangeDates(supportive) },
      { icon: <Moon className="h-3.5 w-3.5 text-moon-foreground" />,    label: "Most Reflective Dates",        value: rangeDates(reflective) },
      { icon: <Heart className="h-3.5 w-3.5 text-accent-foreground" />, label: "Relationship Opportunities",   value: rangeDates(venus) },
      { icon: <Moon className="h-3.5 w-3.5 text-muted-foreground" />,   label: "Rest & Recharge",              value: rangeDates(rest) },
      { icon: <Sun className="h-3.5 w-3.5 text-primary" />,             label: "Creative Peak",                value: rangeDates(creative) },
      ...(nextNew  ? [{ icon: <Moon className="h-3.5 w-3.5 text-moon-foreground" />, label: "Next New Moon",  value: format(new Date(nextNew.date), "MMM d") }] : []),
      ...(nextFull ? [{ icon: <Moon className="h-3.5 w-3.5 text-primary" />,        label: "Next Full Moon", value: format(new Date(nextFull.date), "MMM d") }] : []),
    ];
  }, [from]);

  return (
    <section className="cozy-card p-5" aria-label="Predictive snapshot">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base">Predictive Snapshot</h3>
        <span className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">Next 30 Days</span>
      </header>
      <ul className="space-y-2.5">
        {items.map(it => (
          <li key={it.label} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted/60">{it.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium leading-tight">{it.label}</p>
              <p className="text-[11.5px] text-muted-foreground">{it.value}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}