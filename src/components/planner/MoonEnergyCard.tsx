import { useMemo } from "react";
import { Compass } from "lucide-react";
import { moonIllumination } from "@/lib/planner-day-pulse";
import { moonPlanningTip } from "@/lib/planner/moon-planning-tip";
import { MoonSVG } from "./MoonInsightCard";

export function MoonEnergyCard({ date }: { date: Date }) {
  const m = useMemo(() => moonIllumination(date), [date]);
  const tip = useMemo(() => moonPlanningTip(date), [date]);
  return (
    <section className="rounded-2xl border border-border/60 bg-card/50 p-3">
      <header className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Moon &amp; Energy</header>
      <div className="flex items-center gap-3">
        <MoonSVG fraction={m.fraction} size={54} />
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-semibold">{m.phaseName}</p>
          <p className="text-[11px] text-muted-foreground">{m.pct}% illuminated</p>
          <p className="mt-1 text-[11px] italic text-primary/80">{m.mood}</p>
        </div>
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Compass aria-hidden className="mt-px h-3 w-3 shrink-0 text-primary/70" />
        <span>{tip.text}</span>
      </p>
    </section>
  );
}
