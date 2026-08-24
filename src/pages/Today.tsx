import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { isSameDay, format } from "date-fns";
import { TaskSelectionProvider } from "@/lib/task-selection";
import { BulkActionBar } from "@/components/tasks/BulkActionBar";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { AppointmentEditor } from "@/components/calendar/AppointmentEditor";
import { useStore } from "@/lib/store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import { ExhaleFlow } from "@/components/today/ExhaleFlow";
import { DailyDebrief } from "@/components/today/DailyDebrief";
import { CollapsibleSection } from "@/components/today/CollapsibleSection";
import { DemoTasksBanner } from "@/components/demo/DemoTasksBanner";
import { QuickAddBar } from "@/components/today/QuickAddBar";
import { useTodayView, useTodayPrefs, useTodayDefaultView } from "@/lib/today-view";
import { TodayDashboard } from "@/components/today/dashboard/TodayDashboard";
import { TodayHeader } from "@/components/today/TodayHeader";
import { TodayPlanView } from "@/components/today/TodayPlanView";
import { TodayFocusRail } from "@/components/today/TodayFocusRail";
import { NowNextCard } from "@/components/today/NowNextCard";
import { ArriveBand } from "@/components/today/ArriveBand";
import { SelfCareCard } from "@/components/today/SelfCareCard";
import { JournalCard } from "@/components/today/JournalCard";
import { CareColumn } from "@/components/today/dashboard/CareColumn";
import { GrowColumn } from "@/components/today/dashboard/GrowColumn";
import { RoutinesHabitsRow } from "@/components/today/dashboard/RoutinesHabitsRow";
import { CapacityProvider } from "@/components/today/dashboard/capacity-context";
import { burnoutMultiplier, useBurnoutCheckIn } from "@/lib/burnout-checkin";
import { TemplateGallery } from "@/components/today/TemplateGallery";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export default function Today() {
  return (
    <TaskSelectionProvider storageKey="today">
      <TodayInner />
      <BulkActionBar />
    </TaskSelectionProvider>
  );
}

function TodayInner() {
  const { state, updateProfile } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  useEnsureWeather();
  const [exhaleOpen, setExhaleOpen] = useState(false);
  const [view, setView] = useTodayView();
  const [prefs, setPrefs] = useTodayPrefs();
  const [defaultView, setDefaultView] = useTodayDefaultView();
  const defaultRoute = state.settings.defaultRoute ?? "/";
  const [galleryOpen, setGalleryOpen] = useState(false);
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<"plan" | "care" | "grow">("plan");

  // When arriving with a #slot-morning|afternoon|evening hash, scroll to it.
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    // Wait for sections to mount
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => clearTimeout(t);
  }, [location.hash, location.key]);

  const [day, setDay] = useState<Date>(() => {
    const d = searchParams.get("date");
    if (d) {
      const parsed = new Date(d + "T00:00:00");
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  useEffect(() => {
    const d = searchParams.get("date");
    if (!d) return;
    const parsed = new Date(d + "T00:00:00");
    if (!isNaN(parsed.getTime()) && !isSameDay(parsed, day)) setDay(parsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Auto-open Exhale flow when the reminder toast/notification deep-links here.
  useEffect(() => {
    if (searchParams.get("exhale") === "1") {
      setExhaleOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("exhale");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setDayAndUrl = useCallback((d: Date) => {
    setDay(d);
    const next = new URLSearchParams(searchParams);
    if (isSameDay(d, new Date())) next.delete("date");
    else next.set("date", format(d, "yyyy-MM-dd"));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const isReallyToday = isSameDay(day, new Date());

  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  const editingAppt = editApptId ? state.appointments.find(a => a.id === editApptId) ?? null : null;
  const editingTask = editTaskId ? state.tasks.find(t => t.id === editTaskId) ?? null : null;

  const { entry } = useBurnoutCheckIn(day);
  const capacity = useMemo(() => ({
    level: entry.level,
    multiplier: burnoutMultiplier(entry.level),
    isLow: entry.level === "tender" || entry.level === "depleted",
    isSpacious: entry.level === "spacious",
  }), [entry.level]);

  const circle = (
    <div className="animate-fade-in space-y-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <CareColumn date={day} onTaskClick={setEditTaskId} />
        <GrowColumn date={day} />
      </div>
      <RoutinesHabitsRow date={day} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SelfCareCard date={day} onExhale={() => setExhaleOpen(true)} />
        <JournalCard date={day} />
      </div>
      <CollapsibleSection
        storageKey="planning.section.debrief.collapsed"
        eyebrow="Daily debrief"
        title="Reflect and reset"
      >
        <DailyDebrief date={day} onTaskClick={setEditTaskId} />
      </CollapsibleSection>
    </div>
  );
  const secondary = circle;


  return (
    <CapacityProvider value={capacity}>
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-3 overflow-x-clip px-2 pb-12 sm:px-4">
        <TodayHeader
          date={day}
          onDate={setDayAndUrl}
          view={view}
          onView={setView}
          defaultView={defaultView}
          onDefaultView={setDefaultView}
          prefs={prefs}
          onPrefs={setPrefs}
          defaultRoute={defaultRoute}
          onDefaultRoute={(route) => updateProfile({ default_route: route })}
          onTemplates={() => setGalleryOpen(true)}
        />
        <DemoTasksBanner />
        <MorningCheckInPrompt />
        {prefs.showQuickAdd && <QuickAddBar date={day} />}
        {view !== "board" && <ArriveBand date={day} />}

        {view === "board" ? (
          <>
            {isReallyToday && <NowNextCard date={day} onTaskClick={setEditTaskId} />}
            <TodayDashboard
            date={day}
            onTaskClick={setEditTaskId}
            onExhale={() => setExhaleOpen(true)}
            />
          </>
        ) : isMobile ? (
          <div className="animate-fade-in space-y-3">
            <div role="tablist" aria-label="Today sections" className="grid grid-cols-3 gap-1 rounded-full border border-border/60 bg-card/70 p-1 text-xs">
              {(["plan", "care", "grow"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={mobileTab === t}
                  type="button"
                  onClick={() => setMobileTab(t)}
                  className={cn(
                    "min-h-[36px] rounded-full capitalize transition-colors",
                    mobileTab === t ? "bg-primary/15 font-medium text-primary" : "text-muted-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            {mobileTab === "plan" && (
              <div className="space-y-3">
                {isReallyToday && <NowNextCard date={day} onTaskClick={setEditTaskId} />}
                <TodayFocusRail date={day} onTaskClick={setEditTaskId} />
                <TodayPlanView date={day} />
              </div>
            )}
            {mobileTab === "care" && (
              <div className="animate-fade-in space-y-3">
                <CareColumn date={day} onTaskClick={setEditTaskId} />
                <RoutinesHabitsRow date={day} />
              </div>
            )}
            {mobileTab === "grow" && (
              <div className="animate-fade-in space-y-3">
                <SelfCareCard date={day} onExhale={() => setExhaleOpen(true)} />
                <JournalCard date={day} />
                <GrowColumn date={day} />
                <CollapsibleSection
                  storageKey="planning.section.debrief.collapsed"
                  eyebrow="Daily debrief"
                  title="Reflect and reset"
                >
                  <DailyDebrief date={day} onTaskClick={setEditTaskId} />
                </CollapsibleSection>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-fade-in space-y-4">
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <TodayFocusRail date={day} onTaskClick={setEditTaskId} showSources />
              <div className="min-w-0 space-y-3">
                {isReallyToday && <NowNextCard date={day} onTaskClick={setEditTaskId} />}
                <TodayPlanView date={day} />
              </div>
            </div>
            {secondary}
          </div>
        )}
      </div>

      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(o) => !o && setEditApptId(null)} />
      <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditTaskId(null)} />
      <ExhaleFlow open={exhaleOpen} onOpenChange={setExhaleOpen} date={day} />
      <TemplateGallery
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        onApplied={() => setView("board")}
      />
    </CapacityProvider>
  );
}
