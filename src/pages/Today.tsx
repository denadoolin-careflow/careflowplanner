import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { isSameDay, format } from "date-fns";
import { TaskSelectionProvider } from "@/lib/task-selection";
import { BulkActionBar } from "@/components/tasks/BulkActionBar";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { AppointmentEditor } from "@/components/calendar/AppointmentEditor";
import { useStore } from "@/lib/store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import { Wind, ArrowUp, ArrowDown, RotateCcw, GripVertical, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

import { RhythmHeader } from "@/components/today/rhythm/RhythmHeader";
import { DailySnapshotRow } from "@/components/today/rhythm/DailySnapshotRow";
import { WhatFitsNow } from "@/components/today/rhythm/WhatFitsNow";
import { RhythmSection } from "@/components/today/rhythm/RhythmSection";
import { FamilySnapshotCard } from "@/components/today/rhythm/FamilySnapshotCard";
import { GrowingSeasonCard } from "@/components/today/rhythm/GrowingSeasonCard";
import { CareLoopCard } from "@/components/today/rhythm/CareLoopCard";
import { UpcomingEventsCard } from "@/components/today/rhythm/UpcomingEventsCard";
import { CareyProactiveCards } from "@/components/carey/CareyProactiveCards";
import { EndOfDayCard } from "@/components/today/rhythm/EndOfDayCard";
import { TasksWidget } from "@/components/today/rhythm/TasksWidget";
import { TopThreeStrip } from "@/components/today/TopThreeStrip";
import { ExhaleFlow } from "@/components/today/ExhaleFlow";
import { WeatherRemindersCard } from "@/components/today/WeatherRemindersCard";
import { MealsPlannedWidget } from "@/components/today/widgets/MealsPlannedWidget";
import { TasksTodayWidget } from "@/components/today/widgets/TasksTodayWidget";
import { GroceryWidget } from "@/components/today/widgets/GroceryWidget";
import { NotesTodayWidget } from "@/components/today/widgets/NotesTodayWidget";
import { JournalTodayWidget } from "@/components/today/widgets/JournalTodayWidget";
import { MemoriesTodayWidget } from "@/components/today/widgets/MemoriesTodayWidget";
import { HomeResetWidget } from "@/components/today/widgets/HomeResetWidget";
import { BrainDumpWidget } from "@/components/today/widgets/BrainDumpWidget";
import { CycleSidebarCard } from "@/components/today/widgets/CycleSidebarCard";
import { MoonPrioritiesCard } from "@/components/today/widgets/MoonPrioritiesCard";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { WeeklyWeather } from "@/components/widgets/WeeklyWeather";
import { useSidebarOrder } from "@/lib/today-sidebar-order";
import { useTodayView, useCollapsedWidgets, useSidebarHidden } from "@/lib/today-view";
import { CollapsibleWidget } from "@/components/today/CollapsibleWidget";
import { TimeOfDayBoard } from "@/components/today/TimeOfDayBoard";
import { DayPlanBoard } from "@/components/today/DayPlanBoard";
import { ScheduleBoard } from "@/components/today/ScheduleBoard";
import { cn } from "@/lib/utils";

export default function Today() {
  return (
    <TaskSelectionProvider storageKey="today">
      <TodayInner />
      <BulkActionBar />
    </TaskSelectionProvider>
  );
}

function currentSlot(d: Date): "morning" | "afternoon" | "evening" {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function TodayInner() {
  const { state } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  useEnsureWeather();
  const [exhaleOpen, setExhaleOpen] = useState(false);

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
  const nowSlot = currentSlot(new Date());

  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  const editingAppt = editApptId ? state.appointments.find(a => a.id === editApptId) ?? null : null;
  const editingTask = editTaskId ? state.tasks.find(t => t.id === editTaskId) ?? null : null;

  const [reorderMode, setReorderMode] = useState(false);
  const [view] = useTodayView();
  const { collapsed, toggle: toggleCollapsed } = useCollapsedWidgets();
  const [sidebarHidden, setSidebarHidden] = useSidebarHidden();

  const widgetRegistry: { id: string; label: string; render: () => JSX.Element | null }[] = [
    { id: "brain-dump",       label: "Brain dump",       render: () => <BrainDumpWidget /> },
    { id: "weather",          label: "Weather",          render: () => <WeatherWidget /> },
    { id: "weekly-weather",   label: "Weekly weather",   render: () => <WeeklyWeather /> },
    { id: "moon-priorities",  label: "Moon & Top 3",     render: () => <MoonPrioritiesCard date={day} onTaskClick={setEditTaskId} /> },
    { id: "tasks-today",      label: "Tasks",            render: () => <TasksTodayWidget date={day} /> },
    { id: "tasks",            label: "Tasks",            render: () => <TasksWidget date={day} /> },
    { id: "meals-planned",    label: "Meals planned",    render: () => <MealsPlannedWidget date={day} /> },
    { id: "grocery",          label: "Grocery",          render: () => <GroceryWidget /> },
    { id: "cycle",            label: "Cycle",            render: () => <CycleSidebarCard date={day} /> },
    { id: "notes-today",      label: "Notes today",      render: () => <NotesTodayWidget /> },
    { id: "journal-today",    label: "Journal today",    render: () => <JournalTodayWidget /> },
    { id: "memories-today",   label: "Memories today",   render: () => <MemoriesTodayWidget /> },
    { id: "home-reset",       label: "Home reset",       render: () => <HomeResetWidget /> },
    { id: "family-snapshot",  label: "Family snapshot",  render: () => <FamilySnapshotCard date={day} /> },
    { id: "growing-season",   label: "Growing season",   render: () => <GrowingSeasonCard /> },
    { id: "care-loop",        label: "Care loop",        render: () => <CareLoopCard /> },
    { id: "upcoming-events",  label: "Upcoming events",  render: () => <UpcomingEventsCard date={day} /> },
  ];
  const canonical = widgetRegistry.map(w => w.id);
  const { order, move, reset } = useSidebarOrder(canonical);
  const byId = new Map(widgetRegistry.map(w => [w.id, w]));

  const renderMain = () => {
    if (view === "timeofday") return <TimeOfDayBoard date={day} onTaskClick={setEditTaskId} />;
    if (view === "plan") return <DayPlanBoard date={day} onTaskClick={setEditTaskId} />;
    if (view === "schedule") return <ScheduleBoard date={day} onTaskClick={setEditTaskId} onApptClick={setEditApptId} />;
    return (
      <>
        <DailySnapshotRow date={day} />
        {isReallyToday && <WeatherRemindersCard />}
        <WhatFitsNow date={day} onTaskClick={setEditTaskId} />
        <RhythmSection slot="morning"   date={day} defaultOpen={nowSlot === "morning"   || !isReallyToday} onTaskClick={setEditTaskId} showWeather />
        <RhythmSection slot="afternoon" date={day} defaultOpen={nowSlot === "afternoon" || !isReallyToday} onTaskClick={setEditTaskId} showWeather />
        <RhythmSection slot="evening"   date={day} defaultOpen={nowSlot === "evening"   || !isReallyToday} onTaskClick={setEditTaskId} showWeather />
      </>
    );
  };

  return (
    <>
      <div className={cn(
        "mx-auto grid w-full min-w-0 max-w-6xl gap-4 overflow-x-clip md:gap-5 lg:gap-6",
        sidebarHidden
          ? "md:grid-cols-1"
          : "md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_320px]",
      )}>
        {/* Main column */}
        <div className="min-w-0 max-w-full space-y-4 md:space-y-5">
          <div className="relative">
            <RhythmHeader date={day} onDateChange={setDayAndUrl} isReallyToday={isReallyToday} />
            <button
              type="button"
              onClick={() => setSidebarHidden(!sidebarHidden)}
              className="absolute right-3 top-3 hidden md:inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/80 px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur hover:text-foreground"
              title={sidebarHidden ? "Show widgets" : "Hide widgets"}
            >
              {sidebarHidden ? <PanelRightOpen className="h-3 w-3" /> : <PanelRightClose className="h-3 w-3" />}
              {sidebarHidden ? "Widgets" : "Hide"}
            </button>
          </div>
          {isReallyToday && <CareyProactiveCards />}
          <TopThreeStrip date={day} onTaskClick={setEditTaskId} />
          {renderMain()}

          <EndOfDayCard />

          <div className="cozy-card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold text-foreground">End-of-day exhale</div>
              <p className="text-xs text-muted-foreground">A few quiet prompts to close the day.</p>
            </div>
            <Button size="sm" onClick={() => setExhaleOpen(true)} className="rounded-full">
              <Wind className="mr-1.5 h-3.5 w-3.5" /> Begin exhale
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        {!sidebarHidden && (
        <aside className="min-w-0 max-w-full space-y-3 md:space-y-4 md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:self-start md:overflow-y-auto md:pr-1">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {reorderMode ? "Reorder widgets" : "Widgets"}
            </span>
            <div className="flex items-center gap-1">
              {reorderMode && (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  title="Reset to default order"
                >
                  <RotateCcw className="h-2.5 w-2.5" /> Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => setReorderMode(v => !v)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider transition-colors",
                  reorderMode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
                title="Toggle reorder mode"
              >
                <GripVertical className="h-2.5 w-2.5" /> {reorderMode ? "Done" : "Reorder"}
              </button>
            </div>
          </div>

          {order.map((id, idx) => {
            const w = byId.get(id);
            if (!w) return null;
            const node = w.render();
            if (!node) return null;
            if (!reorderMode) {
              return (
                <CollapsibleWidget
                  key={id}
                  id={id}
                  title={w.label}
                  collapsed={collapsed.has(id)}
                  onToggle={() => toggleCollapsed(id)}
                >
                  {node}
                </CollapsibleWidget>
              );
            }
            return (
              <div key={id} className="relative">
                <div className="absolute -left-1 top-1 z-10 flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(id, -1)}
                    disabled={idx === 0}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm ring-1 ring-border hover:text-foreground disabled:opacity-30"
                    aria-label={`Move ${w.label} up`}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(id, 1)}
                    disabled={idx === order.length - 1}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm ring-1 ring-border hover:text-foreground disabled:opacity-30"
                    aria-label={`Move ${w.label} down`}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
                <div className="rounded-2xl ring-1 ring-dashed ring-primary/40">
                  {node}
                </div>
              </div>
            );
          })}
        </aside>
        )}
      </div>

      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(o) => !o && setEditApptId(null)} />
      <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditTaskId(null)} />
      <ExhaleFlow open={exhaleOpen} onOpenChange={setExhaleOpen} date={day} />
    </>
  );
}
