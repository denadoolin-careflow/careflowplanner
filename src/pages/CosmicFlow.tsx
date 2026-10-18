import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Calendar, BookOpen, Moon, Sparkles, Orbit, Library, Telescope } from "lucide-react";
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
import { cn } from "@/lib/utils";

type Tab = "today" | "sky" | "guidance" | "explore";
const TABS: { id: Tab; label: string }[] = [
  { id: "today", label: "Today" }, { id: "sky", label: "Sky" },
  { id: "guidance", label: "Guidance" }, { id: "explore", label: "Explore" },
];
const TAB_KEY = "careflow.cosmic-tab";

const TOOLS = [
  { to: "/cosmic-flow/natal", label: "Natal", icon: User },
  { to: "/cosmic-flow/chapter", label: "Chapter", icon: BookOpen },
  { to: "/cosmic-flow/tarot", label: "Tarot", icon: Sparkles },
  { to: "/cosmic-flow/moon", label: "Moon", icon: Moon },
  { to: "/cosmic-flow/sky", label: "Sky", icon: Telescope },
  { to: "/cosmic-flow/grid", label: "Transits", icon: Orbit },
  { to: "/cosmic-flow/calendar", label: "Calendar", icon: Calendar },
  { to: "/cosmic-flow/almanac", label: "Almanac", icon: Library },
];

export default function CosmicFlow() {
  const [date] = useState<Date>(new Date());
  const [tab, setTab] = useState<Tab>(() => {
    try { return (localStorage.getItem(TAB_KEY) as Tab) || "today"; } catch { return "today"; }
  });
  useEffect(() => { try { localStorage.setItem(TAB_KEY, tab); } catch { /* ignore */ } }, [tab]);
  const { row } = useBirthChart();
  const chart = useNatalChart(row ? {
    date: row.birth_date, time: row.birth_time, tz: row.birth_tz,
    lat: row.birth_lat, lng: row.birth_lng, place: row.birth_place,
    house_system: "whole-sign",
  } : null);
  const { data: daily, loading: dailyLoading, refresh: refreshDaily } = useDailyGuidance(chart, date);

  // On phones only the active tab's cards show; from md up everything shows.
  const on = (t: Tab) => cn(tab === t ? "block" : "hidden", "md:block");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-3 p-3 pb-32 sm:space-y-4 sm:p-6 sm:pb-8">
      <div className="space-y-2">
        <CosmicHero date={date} chart={chart} />
        {chart && (
          <p className="px-1 text-sm text-muted-foreground" aria-label="Your big three">
            Sun in <strong className="text-foreground">{chart.planets.find(p => p.body === "Sun")?.sign}</strong> · Moon in <strong className="text-foreground">{chart.planets.find(p => p.body === "Moon")?.sign}</strong> ·{" "}
            {chart.houses
              ? <><strong className="text-foreground">{chart.houses.ascendantSign} Rising</strong> · Chart ruler {chart.chartRuler}</>
              : <Link to="/cosmic-flow/birth-chart" className="text-primary hover:underline">Rising unknown — add birth time & place</Link>}
          </p>
        )}
      </div>

      <nav aria-label="Cosmic tools" className="-mx-3 overflow-x-auto px-3 lg:mx-0 lg:px-0">
        <ul className="flex gap-2 pb-1 lg:flex-wrap">
          {TOOLS.map(({ to, label, icon: Icon }) => (
            <li key={to} className="shrink-0">
              <Link to={to} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm hover:bg-muted">
                <Icon className="h-4 w-4 text-primary" aria-hidden />{label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div role="tablist" aria-label="Cosmic Flow sections" className="sticky top-0 z-20 -mx-3 grid grid-cols-4 gap-1 border-b border-border bg-background/95 px-3 py-2 backdrop-blur md:hidden">
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn("min-h-[44px] rounded-full text-sm font-medium transition-colors", tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
            {t.label}
          </button>
        ))}
      </div>

      {!row && (
        <section className="cozy-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Make Cosmic Flow yours.</p>
            <p className="text-xs text-muted-foreground">Add your birth info for personalized chapters, transits, and predictive techniques.</p>
          </div>
          <Button asChild size="sm" className="min-h-[44px]"><Link to="/cosmic-flow/birth-chart">Add Birth Chart</Link></Button>
        </section>
      )}

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-3 sm:space-y-4 lg:col-span-2">
          <div className={on("today")}><DailyOverviewCard date={date} /></div>
          <section className={cn("cozy-card p-4", on("today"))} aria-label="What this means today">
            <p className="text-sm font-medium">{MOON_INFO[getMoonPhase(date)].glyph} {MOON_INFO[getMoonPhase(date)].label}</p>
            <PlainMeaning>{MOON_PLAIN[getMoonPhase(date)]}</PlainMeaning>
            {isVoidOfCourse(date) && <PlainMeaning label="Void-of-course moon">{VOC_ADVICE.replace(/^Void-of-course moon: /, "")}</PlainMeaning>}
          </section>
          <div className={on("sky")}><CurrentTransitsTable date={date} /></div>
          <div className={on("sky")}><CosmicTimelineTabs from={date} /></div>
        </div>

        <aside className="space-y-3 sm:space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className={on("today")}><DailyTarotPull compact /></div>
          <div className={on("today")}><AlignFocusCard date={date} /></div>
          <div className={on("guidance")}><JournalWithTheSkyCard date={date} /></div>
        </aside>
      </div>

      <div className={cn("grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3", on("guidance"))}>
        <div className="lg:col-span-2">
          <PersonalGuidanceGrid data={daily} loading={dailyLoading} onRefresh={refreshDaily} date={date} />
        </div>
        <SuggestedCareflowActions data={daily} />
      </div>

      <div className={cn("grid gap-3 sm:gap-4 md:grid-cols-2", on("explore"))}>
        <PredictiveSnapshotList from={date} />
        <div className="md:col-span-2"><AdvancedAstrologyRow chart={chart} today={date} /></div>
      </div>
    </div>
  );
}
