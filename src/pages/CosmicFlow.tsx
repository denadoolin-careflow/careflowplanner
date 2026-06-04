import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, User } from "lucide-react";
import { CosmicWeatherCard } from "@/components/cosmic/CosmicWeatherCard";
import { MoonCycleCard } from "@/components/cosmic/MoonCycleCard";
import { ActiveTransitsList } from "@/components/cosmic/ActiveTransitsList";
import { UpcomingEventsList } from "@/components/cosmic/UpcomingEventsList";
import { TransitTimelineStrip } from "@/components/cosmic/TransitTimelineStrip";
import { CosmicForecastChart } from "@/components/cosmic/CosmicForecastChart";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { getKeyPhaseInfo } from "@/lib/lunar-phases";
import { useBirthChart } from "@/lib/cosmic/hooks";
import { Badge } from "@/components/ui/badge";

export default function CosmicFlow() {
  const [date] = useState<Date>(new Date());
  const phase = getMoonPhase(date);
  const key = getKeyPhaseInfo(phase);
  const { natal } = useBirthChart();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-3 p-3 pb-28 sm:space-y-4 sm:p-6 sm:pb-6">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl flex items-center gap-1.5">
            Cosmic Flow <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </h1>
          <p className="hidden sm:block text-sm text-muted-foreground">Align your plans with the rhythms of the sky.</p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 shrink-0 px-2.5 text-xs">
          <Link to="/cosmic-flow/birth-chart" className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">{natal ? "Birth Chart" : "Add Birth Chart"}</span>
            <span className="xs:hidden">{natal ? "Chart" : "Add chart"}</span>
          </Link>
        </Button>
      </header>

      {natal && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="font-normal">Personalized</Badge>
          Sun in {natal.sun} · Moon in {natal.moon}{natal.ascendant ? ` · ${natal.ascendant} rising` : ""}
        </p>
      )}

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          <CosmicWeatherCard date={date} />

          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <section className="cozy-card flex flex-col gap-3 p-5">
              <h3 className="font-display text-base">Cosmic Journal Prompt</h3>
              <p className="text-[14px] italic text-muted-foreground">
                "What area of life feels ready for expansion?"
              </p>
              <Button asChild size="sm" className="mt-auto self-start">
                <Link to="/journal">Start writing</Link>
              </Button>
            </section>

            <section className="cozy-card flex flex-col gap-2 p-5"
              style={{ borderLeft: `4px solid hsl(${key.hsl})` }}>
              <h3 className="font-display text-base flex items-center gap-1.5">
                <span aria-hidden>{key.glyph}</span> Planning Focus
              </h3>
              <p className="text-[13px] text-muted-foreground">Best use of today's energy:</p>
              <ul className="ml-4 list-disc text-[13.5px]">
                {key.hints.map(h => <li key={h}>{h}</li>)}
              </ul>
              <p className="mt-2 rounded-md bg-muted/60 px-3 py-2 text-[12px] italic text-muted-foreground">
                {key.invitation}
              </p>
            </section>
          </div>

          <TransitTimelineStrip from={date} />
          <CosmicForecastChart from={date} />
        </div>

        <div className="space-y-3 sm:space-y-4">
          <MoonCycleCard date={date} />
          <ActiveTransitsList date={date} />
          <UpcomingEventsList from={date} />
          <section className="cozy-card p-5">
            <h3 className="font-display text-base">Alignment Tip</h3>
            <p className="mt-2 text-[13.5px] italic text-muted-foreground">
              {MOON_INFO[phase].invitation} Give your day room to breathe.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}