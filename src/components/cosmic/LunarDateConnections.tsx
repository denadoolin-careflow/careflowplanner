import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cosmicDateLinks, LUNAR_RHYTHM, lunarRhythmAt } from "@/lib/cosmic/lunar-rhythm";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";

export function LunarDateConnections({ date, phase, current }: { date: Date; phase?: RhythmPhase; current?: keyof ReturnType<typeof cosmicDateLinks> }) {
  const rhythm = phase ?? lunarRhythmAt(date);
  const info = LUNAR_RHYTHM[rhythm];
  const links = cosmicDateLinks(date);
  const labels = { tarot: "Tarot", sky: "Sky", moon: "Moon & rituals", lunations: "Lunations & eclipses", planner: "Monthly moonscape" };
  return <section aria-label="Connected lunar rhythm" className="space-y-2 border-y border-border py-3">
    <p className="flex flex-col items-start gap-2 text-sm sm:flex-row"><span className="shrink-0 rounded-md px-2 py-1 font-semibold" style={{ background: `hsl(var(--rhythm-${rhythm}-tint))`, color: `hsl(var(--rhythm-${rhythm}-deep))` }}>{info.glyph} {info.label}</span><span className="min-w-0 break-words">{info.invitation}</span></p>
    <nav aria-label="Explore this date" className="flex flex-wrap gap-2">
      {(Object.keys(links) as (keyof typeof links)[]).filter(key => key !== current).map(key => <Button key={key} asChild variant="outline" size="sm" className="min-h-11 max-w-full whitespace-normal text-center sm:min-h-9"><Link to={links[key]}>{labels[key]}</Link></Button>)}
    </nav>
  </section>;
}