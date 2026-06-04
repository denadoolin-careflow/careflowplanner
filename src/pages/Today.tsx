import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { isSameDay, format } from "date-fns";
import { TaskSelectionProvider } from "@/lib/task-selection";
import { BulkActionBar } from "@/components/tasks/BulkActionBar";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { AppointmentEditor } from "@/components/calendar/AppointmentEditor";
import { useStore } from "@/lib/store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import { CloudSun } from "lucide-react";

import { RhythmHeader } from "@/components/today/rhythm/RhythmHeader";
import { DailySnapshotRow } from "@/components/today/rhythm/DailySnapshotRow";
import { WhatFitsNow } from "@/components/today/rhythm/WhatFitsNow";
import { RhythmSection } from "@/components/today/rhythm/RhythmSection";
import { FamilySnapshotCard } from "@/components/today/rhythm/FamilySnapshotCard";
import { GrowingSeasonCard } from "@/components/today/rhythm/GrowingSeasonCard";
import { CareLoopCard } from "@/components/today/rhythm/CareLoopCard";
import { UpcomingEventsCard } from "@/components/today/rhythm/UpcomingEventsCard";
import { EndOfDayCard } from "@/components/today/rhythm/EndOfDayCard";
import { TasksWidget } from "@/components/today/rhythm/TasksWidget";

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
  const [showWeather, setShowWeather] = useState<boolean>(() => {
    if (typeof localStorage === "undefined") return true;
    return localStorage.getItem("careflow:today:show-weather") !== "0";
  });
  const toggleWeather = () => {
    setShowWeather(v => {
      const next = !v;
      try { localStorage.setItem("careflow:today:show-weather", next ? "1" : "0"); } catch { /* noop */ }
      return next;
    });
  };

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

  return (
    <>
      <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-4 overflow-x-clip md:gap-5 md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        {/* Main column */}
        <div className="min-w-0 max-w-full space-y-4 md:space-y-5">
          <RhythmHeader date={day} onDateChange={setDayAndUrl} isReallyToday={isReallyToday} />
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={toggleWeather}
              aria-pressed={showWeather}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
            >
              <CloudSun className="h-3.5 w-3.5" />
              {showWeather ? "Hide weather" : "Show weather"}
            </button>
          </div>
          <DailySnapshotRow date={day} />
          <WhatFitsNow date={day} onTaskClick={setEditTaskId} />

          <RhythmSection slot="morning"   date={day} defaultOpen={nowSlot === "morning"   || !isReallyToday} onTaskClick={setEditTaskId} showWeather={showWeather} />
          <RhythmSection slot="afternoon" date={day} defaultOpen={nowSlot === "afternoon" || !isReallyToday} onTaskClick={setEditTaskId} showWeather={showWeather} />
          <RhythmSection slot="evening"   date={day} defaultOpen={nowSlot === "evening"   || !isReallyToday} onTaskClick={setEditTaskId} showWeather={showWeather} />

          <EndOfDayCard />
        </div>

        {/* Sidebar */}
        <aside className="min-w-0 max-w-full space-y-3 md:space-y-4 md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:self-start md:overflow-y-auto md:pr-1">
          <TasksWidget date={day} />
          <FamilySnapshotCard date={day} />
          <GrowingSeasonCard />
          <CareLoopCard />
          <UpcomingEventsCard date={day} />
        </aside>
      </div>

      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(o) => !o && setEditApptId(null)} />
      <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditTaskId(null)} />
    </>
  );
}
