import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addDays, format, isValid, parseISO, startOfWeek } from "date-fns";
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

export default function Planner() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();

  const day = useMemo(() => {
    if (!date) return new Date();
    const d = parseISO(date);
    return isValid(d) ? d : new Date();
  }, [date]);

  const [captureOpen, setCaptureOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [view, setView] = usePlannerView();
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
    if (view === "3day" || view === "week") setTaskPanelHidden(true);
    if (view === "day") setTaskPanelHidden(false);
  }, [view]);

  const go = (d: Date) => navigate(`/planner/${format(d, "yyyy-MM-dd")}`);

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

  const showContextPanel = view === "day" || view === "3day";
  const showTaskPanel = !taskPanelHidden && (view === "day" || view === "3day" || view === "week");
  const weekStart = useMemo(() => startOfWeek(day, { weekStartsOn: 0 }), [day]);

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[600px] flex-col gap-3">
      <header className="flex flex-wrap items-center gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Planner</p>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{format(day, "EEEE, MMMM d")}</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <PlannerViewToggle value={view} onChange={setView} />
          {(view === "day" || view === "3day" || view === "week") && (
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
          <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => go(addDays(day, -1))} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <DayPickerButton date={day} onChange={go} />
          <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => go(addDays(day, 1))} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => go(new Date())}>Today</Button>
          <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => setCmdOpen(true)} aria-label="Command bar">
            <CommandIcon className="mr-1 h-3.5 w-3.5" />⌘K
          </Button>
          <Button size="sm" variant="secondary" className="h-8 rounded-full text-xs" onClick={() => setPlanOpen(true)}>
            <Sparkles className="mr-1 h-3.5 w-3.5" />Plan my day
          </Button>
          <Button size="sm" className="h-8 rounded-full text-xs" onClick={() => setCaptureOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Capture <kbd className="ml-2 rounded bg-primary-foreground/20 px-1 text-[9px]">C</kbd>
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
          {view === "day" && <PlannerTimeline date={day} />}
          {view === "3day" && <PlannerMultiDayView start={day} days={3} />}
          {view === "week" && <PlannerMultiDayView start={weekStart} days={7} />}
          {view === "month" && <PlannerMonthView date={day} onSelectDay={(d) => { setView("day"); go(d); }} />}
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
        onSetView={setView}
        onGoToday={() => go(new Date())}
      />
    </div>
  );
}