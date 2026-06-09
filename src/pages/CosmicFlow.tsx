import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Calendar } from "lucide-react";
import { useBirthChart } from "@/lib/cosmic/hooks";
import { useNatalChart, useDailyGuidance } from "@/lib/cosmic/v2-hooks";
import { CosmicHero } from "@/components/cosmic/CosmicHero";
import { DailyOverviewCard } from "@/components/cosmic/DailyOverviewCard";
import { MoonCycleCard } from "@/components/cosmic/MoonCycleCard";
import { CurrentTransitsTable } from "@/components/cosmic/CurrentTransitsTable";
import { JournalWithTheSkyCard } from "@/components/cosmic/JournalWithTheSkyCard";
import { CosmicTimelineTabs } from "@/components/cosmic/CosmicTimelineTabs";
import { PredictiveSnapshotList } from "@/components/cosmic/PredictiveSnapshotList";
import { PersonalGuidanceGrid } from "@/components/cosmic/PersonalGuidanceGrid";
import { SuggestedCareflowActions } from "@/components/cosmic/SuggestedCareflowActions";
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
          <CurrentTransitsTable date={date} />
          <CosmicTimelineTabs from={date} />
        </div>

        <div className="space-y-3 sm:space-y-4">
          <MoonCycleCard date={date} />
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