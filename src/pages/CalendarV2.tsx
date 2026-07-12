import { useMemo, useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Plus, Sparkles, Command as CommandIcon, PanelLeftClose, PanelLeftOpen, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStore } from "@/lib/store";
import { pickTopThree } from "@/lib/top-three";
import { CommandBar } from "@/components/calendar-v2/CommandBar";
import { UniversalInbox } from "@/components/calendar-v2/UniversalInbox";
import { DayCanvas } from "@/components/calendar-v2/DayCanvas";
import { FamilyLanes } from "@/components/calendar-v2/FamilyLanes";
import { CalendarV2ViewToggle, useCV2View } from "@/components/calendar-v2/CalendarV2ViewToggle";
import { FlowStages, type StageSignals } from "@/components/calendar-v2/FlowStages";
import { CareySuggestions } from "@/components/calendar-v2/CareySuggestions";
import { RecoveryStrip } from "@/components/calendar-v2/RecoveryStrip";
import { TimeContainers } from "@/components/calendar-v2/TimeContainers";
import { WeekView } from "@/components/calendar-v2/WeekView";
import { MonthView } from "@/components/calendar-v2/MonthView";
import { suggestRecovery } from "@/lib/calendar-v2/recovery";
import { PlannerTaskPanel } from "@/components/planner/PlannerTaskPanel";
import { PlannerTimeline } from "@/components/planner/PlannerTimeline";
import { PlannerContextPanel } from "@/components/planner/PlannerContextPanel";
import { PlannerQuickCapture } from "@/components/planner/PlannerQuickCapture";
import { PlanMyDayDialog } from "@/components/planner/PlanMyDayDialog";
import { PlannerCommandBar } from "@/components/planner/PlannerCommandBar";

export default function CalendarV2() {
  const { state } = useStore();
  const date = useMemo(() => new Date(), []);
  const iso = format(date, "yyyy-MM-dd");
  const [view, setView] = useCV2View();
  const isMobile = useIsMobile();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [mobileTasksOpen, setMobileTasksOpen] = useState(false);
  const [taskPanelHidden, setTaskPanelHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("careflow.cv2.planner.taskPanelHidden") === "1";
  });
  useEffect(() => {
    try { window.localStorage.setItem("careflow.cv2.planner.taskPanelHidden", taskPanelHidden ? "1" : "0"); } catch {}
  }, [taskPanelHidden]);
  const [taskPanelWidth, setTaskPanelWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 280;
    const v = Number(window.localStorage.getItem("careflow.cv2.planner.taskPanelWidth"));
    return Number.isFinite(v) && v >= 220 && v <= 560 ? v : 280;
  });
  useEffect(() => {
    try { window.localStorage.setItem("careflow.cv2.planner.taskPanelWidth", String(taskPanelWidth)); } catch {}
  }, [taskPanelWidth]);
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null);
  const onResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startW: taskPanelWidth };
    const onMove = (ev: PointerEvent) => {
      const r = resizeRef.current; if (!r) return;
      const next = Math.min(560, Math.max(220, r.startW + (ev.clientX - r.startX)));
      setTaskPanelWidth(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      resizeRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Planner-mode hotkeys: "c" → capture · Cmd/Ctrl+K → command bar
  useEffect(() => {
    if (view !== "planner") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setCmdOpen(o => !o); return; }
      if (e.key === "c" || e.key === "C") { e.preventDefault(); setCaptureOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  const dayTasks = useMemo(
    () => state.tasks.filter((t) => t.dueDate === iso && !t.parentTaskId && t.status !== "parked"),
    [state.tasks, iso],
  );
  const unscheduled = useMemo(
    () => state.tasks.filter((t) =>
      !t.done && !t.parentTaskId && t.status !== "parked" &&
      (t.inbox === true || (!t.dueDate && !t.startTime))
    ),
    [state.tasks],
  );
  const dayAppts = useMemo(
    () => (state.appointments ?? []).filter((a) => a.date === iso),
    [state.appointments, iso],
  );
  const topThree = useMemo(() => pickTopThree(state.tasks, iso), [state.tasks, iso]);

  const signals: StageSignals = useMemo(() => {
    const doneToday = state.tasks.filter((t) => (t.lastCompletedAt ?? "").slice(0, 10) === iso).length;
    return {
      captureCount: unscheduled.length,
      clarifiedCount: dayTasks.filter((t) => t.area && (t.estMinutes ?? 0) > 0).length,
      prioritizedCount: topThree.length,
      scheduledCount: dayTasks.filter((t) => !!t.startTime).length,
      focusActive: topThree.length > 0,
      reflectedToday: doneToday > 0,
      recoveryPlanned:
        suggestRecovery(dayAppts).length === 0 ||
        dayTasks.some((t) => t.title.startsWith("🌿")),
    };
  }, [state.tasks, unscheduled.length, dayTasks, dayAppts, topThree.length, iso]);

  const showPlannerTaskPanel = view === "planner" && !isMobile && !taskPanelHidden;
  const showPlannerContext = view === "planner" && !isMobile;

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-4 px-2 pb-10 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.24em] text-primary/70">Prototype</p>
        <div className="flex flex-wrap items-center gap-2">
          {view === "planner" && isMobile && (
            <Sheet open={mobileTasksOpen} onOpenChange={setMobileTasksOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" aria-label="Show tasks">
                  <ListTodo className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[86vw] max-w-[360px] p-0">
                <div className="h-full overflow-hidden p-3">
                  <PlannerTaskPanel selectedDate={date} onQuickAdd={() => { setMobileTasksOpen(false); setCaptureOpen(true); }} />
                </div>
              </SheetContent>
            </Sheet>
          )}
          <CalendarV2ViewToggle value={view} onChange={setView} />
          {view === "planner" && !isMobile && (
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-full"
              onClick={() => setTaskPanelHidden(v => !v)}
              aria-label={taskPanelHidden ? "Show task sidebar" : "Hide task sidebar"}
              title={taskPanelHidden ? "Show task sidebar" : "Hide task sidebar"}
            >
              {taskPanelHidden ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          )}
          {view === "planner" && (
            <>
              <Button size="sm" variant="outline" className="hidden h-8 rounded-full text-xs md:inline-flex" onClick={() => setCmdOpen(true)} aria-label="Command bar">
                <CommandIcon className="mr-1 h-3.5 w-3.5" />⌘K
              </Button>
              <Button size="sm" variant="secondary" className="h-8 rounded-full text-xs" onClick={() => setPlanOpen(true)}>
                <Sparkles className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Plan my day</span>
              </Button>
              <Button size="sm" className="h-8 rounded-full text-xs" onClick={() => setCaptureOpen(true)}>
                <Plus className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Capture</span>
                <kbd className="ml-2 hidden rounded bg-primary-foreground/20 px-1 text-[9px] md:inline">C</kbd>
              </Button>
            </>
          )}
          <Link to="/calendar" className="text-xs text-muted-foreground hover:text-foreground">← Classic calendar</Link>
        </div>
      </div>

      <CommandBar date={date} tasks={dayTasks} appointments={dayAppts} topThree={topThree} />
      <FlowStages signals={signals} />

      {view === "planner" && (
        <>
          <CareySuggestions date={date} tasks={dayTasks} unscheduled={unscheduled} appointments={dayAppts} />
          <RecoveryStrip date={date} appointments={dayAppts} />
          <div
            className="grid min-h-[560px] gap-3"
            style={{
              gridTemplateColumns: [
                showPlannerTaskPanel ? `${taskPanelWidth}px 6px` : null,
                "minmax(0,1fr)",
                showPlannerContext ? "300px" : null,
              ].filter(Boolean).join(" "),
            }}
          >
            {showPlannerTaskPanel && (
              <>
                <PlannerTaskPanel selectedDate={date} onQuickAdd={() => setCaptureOpen(true)} />
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize task panel"
                  onPointerDown={onResizeStart}
                  onDoubleClick={() => setTaskPanelWidth(280)}
                  className="group relative -mx-1 cursor-col-resize"
                >
                  <div className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-border/60 transition-colors group-hover:bg-primary/60" />
                </div>
              </>
            )}
            <div className="min-h-[560px]">
              <PlannerTimeline date={date} />
            </div>
            {showPlannerContext && (
              <PlannerContextPanel date={date} onChangeDate={() => { /* CalendarV2 is fixed to today */ }} />
            )}
          </div>
          <TimeContainers date={date} tasks={dayTasks} appointments={dayAppts} />
          <FamilyLanes date={date} tasks={dayTasks} appointments={dayAppts} />

          <PlannerQuickCapture open={captureOpen} onOpenChange={setCaptureOpen} defaultDate={date} />
          <PlanMyDayDialog open={planOpen} onOpenChange={setPlanOpen} date={date} />
          <PlannerCommandBar
            open={cmdOpen}
            onOpenChange={setCmdOpen}
            onCapture={() => setCaptureOpen(true)}
            onPlanMyDay={() => setPlanOpen(true)}
            onSetView={() => { /* Planner view toggle scoped to /planner */ }}
            onGoToday={() => { /* already today */ }}
          />
        </>
      )}

      {view === "day" && (
        <>
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <UniversalInbox unscheduled={unscheduled} />
            <div className="space-y-4">
              <CareySuggestions date={date} tasks={dayTasks} unscheduled={unscheduled} appointments={dayAppts} />
              <RecoveryStrip date={date} appointments={dayAppts} />
              <DayCanvas date={date} tasks={dayTasks} appointments={dayAppts} unscheduled={unscheduled} />
            </div>
          </div>
          <TimeContainers date={date} tasks={dayTasks} appointments={dayAppts} />
          <FamilyLanes date={date} tasks={dayTasks} appointments={dayAppts} />
        </>
      )}

      {view === "week" && (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <UniversalInbox unscheduled={unscheduled} />
          <WeekView date={date} />
        </div>
      )}

      {view === "month" && <MonthView date={date} />}
    </div>
  );
}