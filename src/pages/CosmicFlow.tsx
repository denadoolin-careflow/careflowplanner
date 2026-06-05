import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, User, Calendar, BookOpen, TrendingUp } from "lucide-react";
import { MoonCycleCard } from "@/components/cosmic/MoonCycleCard";
import { ActiveTransitsList } from "@/components/cosmic/ActiveTransitsList";
import { UpcomingEventsList } from "@/components/cosmic/UpcomingEventsList";
import { useBirthChart } from "@/lib/cosmic/hooks";
import { useNatalChart, useCurrentChapter, useDailyGuidance } from "@/lib/cosmic/v2-hooks";
import { ChapterCard } from "@/components/cosmic/ChapterCard";
import { DailyGuidanceCard } from "@/components/cosmic/DailyGuidanceCard";
import { PredictiveSnapshotCard } from "@/components/cosmic/PredictiveSnapshotCard";
import { Badge } from "@/components/ui/badge";

export default function CosmicFlow() {
  const [date] = useState<Date>(new Date());
  const { row } = useBirthChart();
  const chart = useNatalChart(row ? {
    date: row.birth_date, time: row.birth_time, tz: row.birth_tz,
    lat: row.birth_lat, lng: row.birth_lng, place: row.birth_place,
    house_system: "whole-sign",
  } : null);
  const { chapter, loading: chapterLoading, refresh: refreshChapter } = useCurrentChapter(chart);
  const { data: daily, loading: dailyLoading, refresh: refreshDaily } = useDailyGuidance(chart, date);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-3 p-3 pb-28 sm:space-y-4 sm:p-6 sm:pb-6">
      <header className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl flex items-center gap-1.5">
            Cosmic Flow <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </h1>
          <p className="hidden sm:block text-sm text-muted-foreground">Your wise mentor in the rhythms of the sky.</p>
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

      {chart && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="font-normal">Personalized</Badge>
          Sun in {chart.planets.find(p => p.body === "Sun")?.sign} · Moon in {chart.planets.find(p => p.body === "Moon")?.sign}{chart.houses ? ` · ${chart.houses.ascendantSign} rising` : ""}
        </p>
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
          <ChapterCard chapter={chapter} loading={chapterLoading} onRefresh={() => refreshChapter(true)} compact />
          <DailyGuidanceCard data={daily} loading={dailyLoading} onRefresh={refreshDaily} />
          <PredictiveSnapshotCard chart={chart} />
        </div>

        <div className="space-y-3 sm:space-y-4">
          <MoonCycleCard date={date} />
          <ActiveTransitsList date={date} />
          <UpcomingEventsList from={date} />
          <section className="cozy-card p-4">
            <h3 className="font-display text-sm mb-2">Explore</h3>
            <div className="grid gap-1.5">
              <Button asChild variant="ghost" size="sm" className="justify-start"><Link to="/cosmic-flow/chapter"><BookOpen className="h-3.5 w-3.5 mr-2" />Your Current Chapter</Link></Button>
              <Button asChild variant="ghost" size="sm" className="justify-start"><Link to="/cosmic-flow/predictive"><TrendingUp className="h-3.5 w-3.5 mr-2" />Predictive view</Link></Button>
              <Button asChild variant="ghost" size="sm" className="justify-start"><Link to="/cosmic-flow/calendar"><Calendar className="h-3.5 w-3.5 mr-2" />Astro calendar</Link></Button>
              <Button asChild variant="ghost" size="sm" className="justify-start"><Link to="/cosmic-flow/timeline"><Sparkles className="h-3.5 w-3.5 mr-2" />Transit timeline</Link></Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}