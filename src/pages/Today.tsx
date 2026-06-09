import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { isSameDay, format } from "date-fns";
import { TaskSelectionProvider } from "@/lib/task-selection";
import { BulkActionBar } from "@/components/tasks/BulkActionBar";
import { TaskEditor } from "@/components/tasks/TaskEditor";
import { AppointmentEditor } from "@/components/calendar/AppointmentEditor";
import { useStore } from "@/lib/store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import { Wind, ArrowUp, ArrowDown, RotateCcw, GripVertical, PanelRightClose, PanelRightOpen, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

import { RhythmHeader } from "@/components/today/rhythm/RhythmHeader";
import { DailySnapshotRow } from "@/components/today/rhythm/DailySnapshotRow";
import { RhythmSection } from "@/components/today/rhythm/RhythmSection";
import { CareyProactiveCards } from "@/components/carey/CareyProactiveCards";
import { EndOfDayCard } from "@/components/today/rhythm/EndOfDayCard";
import { TopThreeStrip } from "@/components/today/TopThreeStrip";
import { ExhaleFlow } from "@/components/today/ExhaleFlow";
import { WeatherRemindersCard } from "@/components/today/WeatherRemindersCard";
import { buildSidebarWidgetRegistry } from "@/components/today/widget-registry";
import { useSidebarOrder } from "@/lib/today-sidebar-order";
import { useTodayView, useCollapsedWidgets, useSidebarHidden, useTodayPrefs } from "@/lib/today-view";
import { Sparkles } from "lucide-react";
import { CollapsibleWidget } from "@/components/today/CollapsibleWidget";
import { TimeOfDayBoard } from "@/components/today/TimeOfDayBoard";
import { DayPlanBoard } from "@/components/today/DayPlanBoard";
import { ScheduleBoard } from "@/components/today/ScheduleBoard";
import { cn } from "@/lib/utils";
import { DemoTasksBanner } from "@/components/demo/DemoTasksBanner";

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
  const location = useLocation();
  useEnsureWeather();
  const [exhaleOpen, setExhaleOpen] = useState(false);

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
  const nowSlot = currentSlot(new Date());

  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  const editingAppt = editApptId ? state.appointments.find(a => a.id === editApptId) ?? null : null;
  const editingTask = editTaskId ? state.tasks.find(t => t.id === editTaskId) ?? null : null;

  const [reorderMode, setReorderMode] = useState(false);
  const [view] = useTodayView();
  const { collapsed, toggle: toggleCollapsed } = useCollapsedWidgets();
  const [sidebarHidden, setSidebarHidden] = useSidebarHidden();
  const [prefs, setPrefs] = useTodayPrefs();

  // Auto-hide widgets sidebar while a task editor is open so the focused
  // editor isn't competing with the rail. Restore the prior state on close.
  const priorSidebarRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (editTaskId) {
      if (priorSidebarRef.current === null) {
        priorSidebarRef.current = sidebarHidden;
        if (!sidebarHidden) setSidebarHidden(true);
      }
    } else if (priorSidebarRef.current !== null) {
      const prev = priorSidebarRef.current;
      priorSidebarRef.current = null;
      if (sidebarHidden !== prev) setSidebarHidden(prev);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTaskId]);

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
    // /today -> swipe left -> /week ; swipe right does nothing (already first)
    if (dx < 0) navigate("/week");
    else navigate("/today");
  };

  const widgetRegistry = buildSidebarWidgetRegistry();
  const widgetOpts = { date: day, onTaskClick: setEditTaskId };
  const canonical = widgetRegistry.map(w => w.id);
  const { order, hidden, move, remove, restore, restoreAll, reset } = useSidebarOrder(canonical);
  const byId = new Map(widgetRegistry.map(w => [w.id, w]));

  const renderMain = () => {
    if (view === "timeofday") return <TimeOfDayBoard date={day} onTaskClick={setEditTaskId} />;
    if (view === "plan") return <DayPlanBoard date={day} onTaskClick={setEditTaskId} />;
    if (view === "schedule") return <ScheduleBoard date={day} onTaskClick={setEditTaskId} onApptClick={setEditApptId} />;
    return (
      <>
        <DailySnapshotRow date={day} />
        {isReallyToday && <WeatherRemindersCard />}
        <RhythmSection slot="morning"   date={day} defaultOpen={nowSlot === "morning"   || !isReallyToday} onTaskClick={setEditTaskId} showWeather />
        <RhythmSection slot="afternoon" date={day} defaultOpen={nowSlot === "afternoon" || !isReallyToday} onTaskClick={setEditTaskId} showWeather />
        <RhythmSection slot="evening"   date={day} defaultOpen={nowSlot === "evening"   || !isReallyToday} onTaskClick={setEditTaskId} showWeather />
      </>
    );
  };

  return (
    <>
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={cn(
        "mx-auto grid w-full min-w-0 max-w-6xl gap-4 overflow-x-clip md:gap-5 lg:gap-6",
        sidebarHidden
          ? "md:grid-cols-1"
          : "md:grid-cols-[minmax(0,1fr)_clamp(240px,28vw,360px)]",
      )}>
        {/* Main column */}
        <div className="min-w-0 max-w-full space-y-4 md:space-y-5">
          <DemoTasksBanner />
          <RhythmHeader date={day} onDateChange={setDayAndUrl} isReallyToday={isReallyToday} />
          {isReallyToday && prefs.showCareyNudges && (
            <CareyProactiveCards onHide={() => setPrefs({ showCareyNudges: false })} />
          )}
          {isReallyToday && !prefs.showCareyNudges && (
            <button
              type="button"
              onClick={() => setPrefs({ showCareyNudges: true })}
              className="inline-flex items-center gap-1.5 self-start rounded-full border border-border/60 bg-card/70 px-2.5 py-1 text-[11px] text-muted-foreground backdrop-blur hover:text-foreground"
              title="Show Try this now from Carey"
            >
              <Sparkles className="h-3 w-3" /> Show Try this now
            </button>
          )}
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
        <aside className="min-w-0 max-w-full md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:self-start md:overflow-y-auto md:pr-1">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {reorderMode ? "Edit widgets" : "Widgets"}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSidebarHidden(true)}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur hover:text-foreground"
                title="Hide widgets"
              >
                <PanelRightClose className="h-2.5 w-2.5" /> Hide
              </button>
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
                <GripVertical className="h-2.5 w-2.5" /> {reorderMode ? "Done" : "Edit"}
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr))]">
          {order.map((id, idx) => {
            const w = byId.get(id);
            if (!w) return null;
            if (hidden.has(id)) return null;
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
              <div key={id} className="relative min-w-0">
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
                <button
                  type="button"
                  onClick={() => remove(id)}
                  className="absolute -right-1 top-1 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm ring-1 ring-border hover:text-destructive"
                  aria-label={`Remove ${w.label}`}
                  title={`Remove ${w.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="rounded-2xl ring-1 ring-dashed ring-primary/40">
                  {node}
                </div>
              </div>
            );
          })}
          </div>

          {hidden.size > 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-border/60 bg-card/40 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Hidden ({hidden.size})
                </span>
                <button
                  type="button"
                  onClick={restoreAll}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                >
                  <RotateCcw className="h-2.5 w-2.5" /> Restore all
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {canonical.filter(id => hidden.has(id)).map(id => {
                  const w = byId.get(id);
                  if (!w) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => restore(id)}
                      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                      title={`Restore ${w.label}`}
                    >
                      <Plus className="h-3 w-3" /> {w.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
        )}
      </div>

      {/* Show-widgets pill when sidebar is collapsed */}
      {sidebarHidden && (
        <button
          type="button"
          onClick={() => setSidebarHidden(false)}
          className="fixed right-0 top-24 z-40 hidden md:inline-flex items-center gap-1 rounded-l-full border border-r-0 border-border/60 bg-card/90 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground shadow-sm backdrop-blur hover:text-foreground"
          title="Show widgets"
        >
          <PanelRightOpen className="h-3 w-3" />
          <span className="hidden lg:inline">Widgets</span>
        </button>
      )}

      <AppointmentEditor appointment={editingAppt} open={!!editingAppt} onOpenChange={(o) => !o && setEditApptId(null)} />
      <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditTaskId(null)} />
      <ExhaleFlow open={exhaleOpen} onOpenChange={setExhaleOpen} date={day} />
    </>
  );
}
