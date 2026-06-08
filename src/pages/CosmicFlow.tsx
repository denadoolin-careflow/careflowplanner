import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useBirthChart } from "@/lib/cosmic/hooks";
import { useNatalChart } from "@/lib/cosmic/v2-hooks";
import { getRhythmForecast } from "@/lib/rhythm-forecast";
import { ZodiacRibbon } from "@/components/cosmic/ZodiacRibbon";
import { NatalChartTabs } from "@/components/cosmic/NatalChartTabs";
import { TodaySkySidebar } from "@/components/cosmic/TodaySkySidebar";
import { TransitInterpretationList } from "@/components/cosmic/TransitInterpretationList";
import { ActiveHousesCard } from "@/components/cosmic/ActiveHousesCard";
import { CosmicTimelineStrip } from "@/components/cosmic/CosmicTimelineStrip";
import { CosmicTasksCard } from "@/components/cosmic/CosmicTasksCard";
import { TransitReflectionCard } from "@/components/cosmic/TransitReflectionCard";

/**
 * Cosmic Flow Dashboard — Astrology → Meaning → Action → Journal.
 * Tabbed natal chart on the left, sticky Today's Sky sidebar on the right,
 * interpretation-first transits, active houses, horizontal timeline,
 * suggested cosmic tasks, and a transit-rooted reflection prompt.
 */
export default function CosmicFlow() {
  const [date] = useState<Date>(new Date());
  const { row } = useBirthChart();
  const chart = useNatalChart(row ? {
    date: row.birth_date, time: row.birth_time, tz: row.birth_tz,
    lat: row.birth_lat, lng: row.birth_lng, place: row.birth_place,
    house_system: "whole-sign",
  } : null);

  const forecast = getRhythmForecast(date);

  return (
    <div className="cosmic-flow-theme mx-auto w-full max-w-7xl space-y-4 p-3 pb-28 sm:p-6 sm:pb-6">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">CareFlow</p>
          <h1 className="font-display text-xl sm:text-2xl flex items-center gap-1.5">
            Cosmic Flow <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </h1>
          <p className="mt-0.5 text-[12.5px] sm:text-sm text-muted-foreground">
            Today: {forecast.glyph} Moon in {forecast.sign.sign} {forecast.sign.glyph} · {forecast.sign.element[0].toUpperCase() + forecast.sign.element.slice(1)} · {forecast.phaseLabel}
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs">
            <Link to="/cosmic-flow/natal"><User className="h-3.5 w-3.5 mr-1" />Natal</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs">
            <Link to="/cosmic-flow/calendar"><Calendar className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </header>

      {!row && (
        <section className="cozy-card glass-panel p-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Make Cosmic Flow yours.</p>
            <p className="text-xs text-muted-foreground">Add your birth info for personalized chapters, transits, and predictive techniques.</p>
          </div>
          <Button asChild size="sm"><Link to="/cosmic-flow/birth-chart">Add Birth Chart</Link></Button>
        </section>
      )}

      {chart && <ZodiacRibbon chart={chart} />}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        {/* Left column */}
        <div className="space-y-4 min-w-0">
          {chart && <NatalChartTabs chart={chart} />}
          <TransitInterpretationList date={date} />
          <div className="grid gap-4 md:grid-cols-2">
            {chart && <ActiveHousesCard chart={chart} date={date} />}
            <BigThreeCard sun={chart?.planets.find((p) => p.body === "Sun")?.sign}
                          moon={chart?.planets.find((p) => p.body === "Moon")?.sign}
                          rising={chart?.houses?.ascendantSign}
                          ruler={chart?.chartRuler} />
          </div>
          <CosmicTimelineStrip date={date} />
          <div className="grid gap-4 md:grid-cols-2">
            <CosmicTasksCard date={date} />
            <TransitReflectionCard date={date} />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <TodaySkySidebar date={date} />
        </div>
      </div>
    </div>
  );
}

function BigThreeCard({ sun, moon, rising, ruler }: { sun?: string; moon?: string; rising?: string; ruler?: string }) {
  if (!sun && !moon && !rising) {
    return (
      <section className="cozy-card glass-panel p-5">
        <h3 className="font-display text-base">Big Three</h3>
        <p className="mt-2 text-[12.5px] italic text-muted-foreground">
          Add birth info to reveal your Sun, Moon, and Rising signs.
        </p>
      </section>
    );
  }
  const rows = [
    { glyph: "☉", label: "Sun", value: sun },
    { glyph: "☽", label: "Moon", value: moon },
    { glyph: "↑", label: "Rising", value: rising },
  ].filter((r) => r.value);
  return (
    <section className="cozy-card glass-panel p-5">
      <h3 className="font-display text-base">Big Three</h3>
      <ul className="mt-2 space-y-1.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-baseline justify-between gap-2 rounded-xl border border-border/40 bg-card/60 px-3 py-2">
            <span className="text-[12px] text-muted-foreground">{r.glyph} {r.label}</span>
            <span className="text-[13.5px] font-medium">{r.value}</span>
          </li>
        ))}
      </ul>
      {ruler && <p className="mt-2 text-[11.5px] text-muted-foreground">Chart ruler: {ruler}</p>}
    </section>
  );
}