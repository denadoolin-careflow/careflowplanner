import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { addDays, addMonths, format, isValid, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Sparkles, Command as CommandIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DayPickerButton } from "@/components/calendar/DayPickerButton";
import { PlannerTaskPanel } from "@/components/planner/PlannerTaskPanel";
import { PlannerTimeline } from "@/components/planner/PlannerTimeline";
import { PlannerContextPanel } from "@/components/planner/PlannerContextPanel";
import { PlannerQuickCapture } from "@/components/planner/PlannerQuickCapture";
import { PlannerViewToggle } from "@/components/planner/PlannerViewToggle";
import { PlannerMultiDayView } from "@/components/planner/PlannerMultiDayView";
import { PlannerMonthView } from "@/components/planner/PlannerMonthView";
import { PlanMyDayDialog } from "@/components/planner/PlanMyDayDialog";
import { PlannerCommandBar } from "@/components/planner/PlannerCommandBar";
import { usePlannerView } from "@/lib/planner-prefs";
import { useStore } from "@/lib/store";
import { CareySuggestions } from "@/components/calendar-v2/CareySuggestions";
import { RecoveryStrip } from "@/components/calendar-v2/RecoveryStrip";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ListTodo } from "lucide-react";

export default function Planner() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Detect scope from route prefix so /week and /month lock the view.
  const routeScope: "week" | "month" | null = location.pathname.startsWith("/week")
    ? "week"
    : location.pathname.startsWith("/month")
      ? "month"
      : null;
  const routeBase = location.pathname.startsWith("/week")
    ? "/week"
    : location.pathname.startsWith("/month")
      ? "/month"
      : location.pathname.startsWith("/calendar")
        ? "/calendar"
        : "/planner";

  const day = useMemo(() => {
    if (!date) return new Date();
    const d = parseISO(date);
    return isValid(d) ? d : new Date();
  }, [date]);

  const [captureOpen, setCaptureOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [view, setView] = usePlannerView();
  const effectiveView = routeScope ?? view;
  useEffect(() => {
    if (routeScope && view !== routeScope) setView(routeScope);
  }, [routeScope, view, setView]);
  const isMobile = useIsMobile();
  const [mobileTasksOpen, setMobileTasksOpen] = useState(false);
  const [taskPanelHidden, setTaskPanelHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("careflow.planner.taskPanelHidden") === "1";
  });
  useEffect(() => {
    try { window.localStorage.setItem("careflow.planner.taskPanelHidden", taskPanelHidden ? "1" : "0"); } catch {}
  }, [taskPanelHidden]);

  const [taskPanelWidth, setTaskPanelWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 280;
    const v = Number(window.localStorage.getItem("careflow.planner.taskPanelWidth"));
    return Number.isFinite(v) && v >= 200 && v <= 560 ? v : 280;
  });
  useEffect(() => {
    try { window.localStorage.setItem("careflow.planner.taskPanelWidth", String(taskPanelWidth)); } catch {}
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

  // Auto-hide task panel for multi-day views to give the timeline more room.
  useEffect(() => {
    if (effectiveView === "3day" || effectiveView === "week" || effectiveView === "month") setTaskPanelHidden(true);
    if (effectiveView === "day") setTaskPanelHidden(false);
  }, [effectiveView]);

  const go = (d: Date) => navigate(`${routeBase}/${format(d, "yyyy-MM-dd")}`);
  const stepDate = (dir: 1 | -1) => {
    if (effectiveView === "month") return go(addMonths(day, dir));
    if (effectiveView === "week" || effectiveView === "3day") return go(addDays(day, 7 * dir));
    return go(addDays(day, dir));
  };

  // If user picks a new view from the toggle while on /week or /month,
  // navigate to the matching route so the URL and scope stay in sync.
  const handleSetView = (v: typeof view) => {
    setView(v);
    if (v === "week" && !location.pathname.startsWith("/week")) return navigate(`/week/${format(day, "yyyy-MM-dd")}`);
    if (v === "month" && !location.pathname.startsWith("/month")) return navigate(`/month/${format(day, "yyyy-MM-dd")}`);
    if ((v === "day" || v === "3day") && (location.pathname.startsWith("/week") || location.pathname.startsWith("/month"))) {
      return navigate(`/planner/${format(day, "yyyy-MM-dd")}`);
    }
  };

  // Global hotkeys: "c" → capture · Cmd/Ctrl+K → command bar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setCmdOpen(o => !o); return; }
      if (e.key === "c" || e.key === "C") { e.preventDefault(); setCaptureOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showContextPanel = !isMobile && (effectiveView === "day" || effectiveView === "3day");
  const showTaskPanel = !isMobile && !taskPanelHidden && (effectiveView === "day" || effectiveView === "3day" || effectiveView === "week");
  const weekStart = useMemo(() => startOfWeek(day, { weekStartsOn: 0 }), [day]);

  // Data for Carey suggestions + Recovery strip (Day view only).
  const { state } = useStore();
  const iso = format(day, "yyyy-MM-dd");
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

  const scopeLabel =
    effectiveView === "month" ? format(day, "MMMM yyyy") :
    effectiveView === "week" ? `Week of ${format(weekStart, "MMM d")}` :
    effectiveView === "3day" ? `${format(day, "MMM d")}–${format(addDays(day, 2), "MMM d")}` :
    null;

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[500px] flex-col gap-3">
      <header className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {routeScope === "week" ? "Week" : routeScope === "month" ? "Month" : "Planner"}
          </p>
          <h1 className="font-display text-lg font-semibold sm:text-2xl md:text-3xl">
            <span className="sm:hidden">{scopeLabel ?? format(day, "EEE, MMM d")}</span>
            <span className="hidden sm:inline">{scopeLabel ?? format(day, "EEEE, MMMM d")}</span>
          </h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1 sm:gap-1.5">
          {isMobile && (
            <Sheet open={mobileTasksOpen} onOpenChange={setMobileTasksOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" aria-label="Show tasks">
                  <ListTodo className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[86vw] max-w-[360px] p-0">
                <div className="h-full overflow-hidden p-3">
                  <PlannerTaskPanel selectedDate={day} onQuickAdd={() => { setMobileTasksOpen(false); setCaptureOpen(true); }} />
                </div>
              </SheetContent>
            </Sheet>
          )}
          <PlannerViewToggle value={effectiveView} onChange={handleSetView} />
          {!isMobile && (effectiveView === "day" || effectiveView === "3day" || effectiveView === "week") && (
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
          <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => stepDate(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <DayPickerButton date={day} onChange={go} />
          <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => stepDate(1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" className="hidden h-8 rounded-full text-xs sm:inline-flex" onClick={() => go(new Date())}>Today</Button>
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
        </div>
      </header>

      <div
        className="grid min-h-0 flex-1 gap-3"
        style={{
          gridTemplateColumns: [
            showTaskPanel ? `${taskPanelWidth}px 6px` : null,
            "minmax(0,1fr)",
            showContextPanel ? "300px" : null,
          ].filter(Boolean).join(" "),
        }}
      >
        {showTaskPanel && (
          <>
            <PlannerTaskPanel selectedDate={day} onQuickAdd={() => setCaptureOpen(true)} />
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
        <div className="min-h-0">
          {effectiveView === "day" && (
            <div className="flex h-full min-h-0 flex-col gap-3">
              <CareySuggestions date={day} tasks={dayTasks} unscheduled={unscheduled} appointments={dayAppts} />
              <RecoveryStrip date={day} appointments={dayAppts} />
              <div className="min-h-0 flex-1">
                <PlannerTimeline date={day} />
              </div>
            </div>
          )}
          {effectiveView === "3day" && <PlannerMultiDayView start={day} days={3} />}
          {effectiveView === "week" && <PlannerMultiDayView start={weekStart} days={7} />}
          {effectiveView === "month" && <PlannerMonthView date={startOfMonth(day)} onSelectDay={(d) => { setView("day"); navigate(`/planner/${format(d, "yyyy-MM-dd")}`); }} />}
        </div>
        {showContextPanel && (
          <PlannerContextPanel date={day} onChangeDate={go} />
        )}
      </div>

      <PlannerQuickCapture open={captureOpen} onOpenChange={setCaptureOpen} defaultDate={day} />
      <PlanMyDayDialog open={planOpen} onOpenChange={setPlanOpen} date={day} />
      <PlannerCommandBar
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        onCapture={() => setCaptureOpen(true)}
        onPlanMyDay={() => setPlanOpen(true)}
        onSetView={handleSetView}
        onGoToday={() => go(new Date())}
      />
    </div>
  );
}