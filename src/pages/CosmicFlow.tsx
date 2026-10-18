import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Calendar } from "lucide-react";
import { useBirthChart } from "@/lib/cosmic/hooks";
import { useNatalChart, useDailyGuidance } from "@/lib/cosmic/v2-hooks";
import { CosmicHero } from "@/components/cosmic/CosmicHero";
import { DailyOverviewCard } from "@/components/cosmic/DailyOverviewCard";
import { CurrentTransitsTable } from "@/components/cosmic/CurrentTransitsTable";
import { JournalWithTheSkyCard } from "@/components/cosmic/JournalWithTheSkyCard";
import { CosmicTimelineTabs } from "@/components/cosmic/CosmicTimelineTabs";
import { PredictiveSnapshotList } from "@/components/cosmic/PredictiveSnapshotList";
import { PersonalGuidanceGrid } from "@/components/cosmic/PersonalGuidanceGrid";
import { SuggestedCareflowActions } from "@/components/cosmic/SuggestedCareflowActions";
import { PlainMeaning } from "@/components/cosmic/PlainMeaning";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { isVoidOfCourse } from "@/lib/transits";
import { MOON_PLAIN, VOC_ADVICE } from "@/lib/rhythm-guidance";
import { DailyTarotPull } from "@/components/astro-suite/DailyTarotPull";
import { AlignFocusCard } from "@/components/cosmic/AlignFocusCard";
import { AdvancedAstrologyRow } from "@/components/cosmic/AdvancedAstrologyRow";

export default function CosmicFlow() {
  const [date] = useState<Date>(new Date());
  const { row } = useBirthChart();
  const chart = useNatalChart(row ? {
    date: row.birth_date, time: row.birth_time, tz: row.birth_tz,
    lat: row.birth_lat, lng: row.birth_lng, place: row.birth_place,
    house_system: "whole-sign",
  } : null);
  const { data: daily, loading: dailyLoading, refresh: refreshDaily } = useDailyGuidance(chart, date);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-3 p-3 pb-28 sm:space-y-4 sm:p-6 sm:pb-6">
      <CosmicHero date={date} chart={chart} />
      <div className="flex justify-end gap-1.5">
        <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs">
          <Link to="/cosmic-flow/natal"><User className="h-3.5 w-3.5 mr-1" />Natal chart</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs">
          <Link to="/cosmic-flow/calendar"><Calendar className="h-3.5 w-3.5 mr-1" />Calendar</Link>
        </Button>
      </div>

      {chart && (
        <section className="cozy-card px-4 py-2.5 text-sm" aria-label="Your big three">
          Sun in <strong>{chart.planets.find(p => p.body === "Sun")?.sign}</strong> · Moon in <strong>{chart.planets.find(p => p.body === "Moon")?.sign}</strong> ·{" "}
          {chart.houses
            ? <><strong>{chart.houses.ascendantSign} Rising</strong> · Chart ruler {chart.chartRuler} · Whole Sign houses</>
            : <Link to="/cosmic-flow/birth-chart" className="text-primary hover:underline">Rising unknown — add birth time & place</Link>}
        </section>
      )}

      {!row && (
        <section className="cozy-card p-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Make Cosmic Flow yours.</p>
            <p className="text-xs text-muted-foreground">Add your birth info for personalized chapters, transits, and predictive techniques.</p>
          </div>
          <Button asChild size="sm"><Link to="/cosmic-flow/birth-chart">Add Birth Chart</Link></Button>
        </section>
      )}

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          <DailyOverviewCard date={date} />
          <section className="cozy-card p-4" aria-label="What this means today">
            <p className="text-sm font-medium">{MOON_INFO[getMoonPhase(date)].glyph} {MOON_INFO[getMoonPhase(date)].label}</p>
            <PlainMeaning>{MOON_PLAIN[getMoonPhase(date)]}</PlainMeaning>
            {isVoidOfCourse(date) && <PlainMeaning label="Void-of-course moon">{VOC_ADVICE.replace(/^Void-of-course moon: /, "")}</PlainMeaning>}
          </section>
          <CurrentTransitsTable date={date} />
          <CosmicTimelineTabs from={date} />
        </div>

        <div className="space-y-3 sm:space-y-4">
          <DailyTarotPull compact />
          <section className="cozy-card p-4 space-y-2" aria-label="Astro Suite">
            <p className="text-sm font-medium">Astro Suite</p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <Link to="/cosmic-flow/tarot" className="rounded-xl bg-muted p-3 hover:bg-muted/70">🔮<br />Tarot</Link>
              <Link to="/cosmic-flow/moon" className="rounded-xl bg-muted p-3 hover:bg-muted/70">🌙<br />Moon</Link>
              <Link to="/cosmic-flow/almanac" className="rounded-xl bg-muted p-3 hover:bg-muted/70">📖<br />Almanac</Link>
            </div>
          </section>
          <AlignFocusCard date={date} />
          <JournalWithTheSkyCard date={date} />
          <PredictiveSnapshotList from={date} />
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PersonalGuidanceGrid data={daily} loading={dailyLoading} onRefresh={refreshDaily} date={date} />
        </div>
        <SuggestedCareflowActions data={daily} />
      </div>

      <AdvancedAstrologyRow chart={chart} today={date} />
    </div>
  );
}