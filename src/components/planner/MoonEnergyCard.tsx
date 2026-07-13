import { useMemo } from "react";
import { moonIllumination } from "@/lib/planner-day-pulse";
import { MoonSVG } from "./MoonInsightCard";

export function MoonEnergyCard({ date }: { date: Date }) {
  const m = useMemo(() => moonIllumination(date), [date]);
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
    </section>
  );
}