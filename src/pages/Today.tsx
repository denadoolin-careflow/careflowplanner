import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { isSameDay, format } from "date-fns";
import { TaskSelectionProvider } from "@/lib/task-selection";
import { BulkActionBar } from "@/components/tasks/BulkActionBar";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { AppointmentEditor } from "@/components/calendar/AppointmentEditor";
import { useStore } from "@/lib/store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import { Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExhaleFlow } from "@/components/today/ExhaleFlow";
import { RhythmDashboard } from "@/components/today/RhythmDashboard";
import { DailyDebrief } from "@/components/today/DailyDebrief";
import { BurnoutCheckIn } from "@/components/today/BurnoutCheckIn";
import { SlotWeatherStrip } from "@/components/today/SlotWeatherStrip";
import { DemoTasksBanner } from "@/components/demo/DemoTasksBanner";
import { TimeOfDayBoard } from "@/components/today/TimeOfDayBoard";
import { DayPlanBoard } from "@/components/today/DayPlanBoard";
import { ScheduleBoard } from "@/components/today/ScheduleBoard";
import { QuickAddBar } from "@/components/today/QuickAddBar";
import { useTodayView, TODAY_VIEW_LABELS, type TodayView, useTodayPrefs } from "@/lib/today-view";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Settings2 } from "lucide-react";
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
  const { state } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  useEnsureWeather();
  const [exhaleOpen, setExhaleOpen] = useState(false);
  const [view, setView] = useTodayView();
  const [prefs, setPrefs] = useTodayPrefs();

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

  // Swipe between Today / Week / Month on touch devices.
  const navigate = useNavigate();
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (Date.now() - start.t > 600) return;
    if (dx < 0) navigate("/week");
    else navigate("/today");
  };

  return (
    <>
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="mx-auto w-full min-w-0 max-w-6xl space-y-6 overflow-x-clip px-2 pb-10 sm:px-4"
      >
        <DemoTasksBanner />
        {(() => {
          const controls = (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-center gap-1.5 px-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Plan with</span>
          <div className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/70 p-0.5 text-[11px]">
            {(Object.keys(TODAY_VIEW_LABELS) as TodayView[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setView(k)}
                className={cn(
                  "rounded-full px-2.5 py-1 transition-colors",
                  view === k ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {TODAY_VIEW_LABELS[k]}
              </button>
            ))}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="ml-1 inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/70 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                title="Today preferences"
              >
                <Settings2 className="h-3 w-3" /> Preferences
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-3 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Today preferences</div>
              <label className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">Try this now from Carey</span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">Show Carey's actionable suggestions at the top of Today.</span>
                </span>
                <Switch checked={prefs.showCareyNudges} onCheckedChange={(v) => setPrefs({ showCareyNudges: v })} />
              </label>
              <label className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">Quick add bar</span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">Inline input to drop tasks or meals into the right time slot.</span>
                </span>
                <Switch checked={prefs.showQuickAdd} onCheckedChange={(v) => setPrefs({ showQuickAdd: v })} />
              </label>
            </PopoverContent>
          </Popover>
              </div>
              {prefs.showQuickAdd && <QuickAddBar date={day} />}
            </div>
          );
          if (view === "rhythm") {
            return (
              <RhythmDashboard
                date={day}
                onDateChange={setDayAndUrl}
                isReallyToday={isReallyToday}
                onTaskClick={setEditTaskId}
                onApptClick={setEditApptId}
                slot={controls}
                debrief={
                  <div className="space-y-6">
                    <BurnoutCheckIn date={day} />
                    <DailyDebrief date={day} onTaskClick={setEditTaskId} />
                  </div>
                }
              />
            );
          }
          return (
            <div className="space-y-6">
              <SlotWeatherStrip />
              <BurnoutCheckIn date={day} />
              <DailyDebrief date={day} onTaskClick={setEditTaskId} />
              {controls}
            </div>
          );
        })()}
        {view === "timeofday" && <TimeOfDayBoard date={day} onTaskClick={setEditTaskId} />}
        {view === "plan" && <DayPlanBoard date={day} onTaskClick={setEditTaskId} />}
        {view === "schedule" && <ScheduleBoard date={day} onTaskClick={setEditTaskId} onApptClick={setEditApptId} />}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card/55 p-4 shadow-soft backdrop-blur-xl">
          <div className="min-w-0">
            <div className="font-display text-sm font-semibold text-foreground">End-of-day exhale</div>
            <p className="text-xs text-muted-foreground">A few quiet prompts to close the day.</p>
          </div>
          <Button size="sm" onClick={() => setExhaleOpen(true)} className="rounded-full">
            <Wind className="mr-1.5 h-3.5 w-3.5" /> Begin exhale
          </Button>
        </div>
      </div>

      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(o) => !o && setEditApptId(null)} />
      <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditTaskId(null)} />
      <ExhaleFlow open={exhaleOpen} onOpenChange={setExhaleOpen} date={day} />
    </>
  );
}
