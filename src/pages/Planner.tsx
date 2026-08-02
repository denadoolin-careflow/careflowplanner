import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addDays, format, isValid, parseISO, startOfWeek } from "date-fns";
import { Plus, Command as CommandIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskSourcePanel } from "@/components/planner/TaskSourcePanel";
import { PlannerTimeline } from "@/components/planner/PlannerTimeline";
import { PlannerContextPanel } from "@/components/planner/PlannerContextPanel";
import { PlannerQuickCapture } from "@/components/planner/PlannerQuickCapture";
import { PlannerMultiDayView } from "@/components/planner/PlannerMultiDayView";
import { PlannerMonthView } from "@/components/planner/PlannerMonthView";
import { PlanMyDayDialog } from "@/components/planner/PlanMyDayDialog";
import { PlannerCommandBar } from "@/components/planner/PlannerCommandBar";
import { PlannerRhythmHeader } from "@/components/planner/PlannerRhythmHeader";
import { PlannerPeriodTabs, usePlannerPeriod } from "@/components/planner/PlannerPeriodTabs";
import { PlannerPeriodList } from "@/components/planner/PlannerPeriodList";
import { PlannerScheduleList } from "@/components/planner/PlannerScheduleList";
import { usePlannerView } from "@/lib/planner-prefs";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ListTodo, Inbox, MoreHorizontal, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { tray, useTray } from "@/lib/tray-store";

const SEGMENTS = ["all", "morning", "afternoon", "evening"] as const;
type Segment = (typeof SEGMENTS)[number];

function TrayToggle({ className }: { className?: string }) {
  const { taskIds, open } = useTray();
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => { tray.setTab("tray"); tray.setOpen(!open); }}
      aria-pressed={open}
      aria-label="Toggle the task tray"
      className={`h-8 shrink-0 rounded-full text-xs ${className ?? ""}`}
    >
      <Inbox className="mr-1.5 h-3.5 w-3.5" /> Tray
      {taskIds.length > 0 && (
        <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 text-[10px]">{taskIds.length}</span>
      )}
    </Button>
  );
}

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
  const [period, setPeriod] = usePlannerPeriod();
  const isMobile = useIsMobile();
  const [segment, setSegment] = useState<Segment>("all");

  // Legacy persisted values (morning/afternoon/evening) now live inside "Time of day".
  useEffect(() => {
    if (period === "morning" || period === "afternoon" || period === "evening") {
      setSegment(period as Segment);
      setPeriod("timeofday");
    }
  }, [period, setPeriod]);
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

  const showContextPanel = !isMobile && (view === "day" || view === "3day");
  const showTaskPanel = !isMobile && !taskPanelHidden && (view === "day" || view === "3day" || view === "week");
  const weekStart = useMemo(() => startOfWeek(day, { weekStartsOn: 0 }), [day]);

  return (
    <div className={`planner-surface flex flex-col gap-3 ${isMobile ? "min-h-[70vh] pb-24" : "h-[calc(100vh-140px)] min-h-[500px]"}`}>
      {isMobile ? (
        <div className="sticky top-0 z-30 -mx-2 flex items-center gap-1 bg-background/90 px-2 py-1.5 backdrop-blur-md">
          <Sheet open={mobileTasksOpen} onOpenChange={setMobileTasksOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0 rounded-full" aria-label="Show tasks">
                <ListTodo className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[86vw] max-w-[360px] p-0">
              <div className="h-full overflow-hidden p-3">
                <TaskSourcePanel selectedDate={day} onQuickAdd={() => { setMobileTasksOpen(false); setCaptureOpen(true); }} />
              </div>
            </SheetContent>
          </Sheet>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 rounded-full" onClick={() => go(addDays(day, -1))} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={() => go(new Date())}
            className="min-w-0 flex-1 truncate text-center font-display text-[15px] font-semibold"
            aria-label={`${format(day, "EEEE, MMMM d")} — tap for today`}
          >
            {format(day, "EEE, MMM d")}
          </button>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 rounded-full" onClick={() => go(addDays(day, 1))} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0 rounded-full" aria-label="Planner views and actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Range</DropdownMenuLabel>
              {([["day", "Day"], ["3day", "3 days"], ["week", "Week"], ["month", "Month"]] as const).map(([id, label]) => (
                <DropdownMenuItem key={id} onSelect={() => setView(id)}>
                  {label}{view === id ? " ·" : ""}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">View</DropdownMenuLabel>
              {([["grid", "Grid"], ["schedule", "Schedule"], ["timeofday", "Time of day"]] as const).map(([id, label]) => (
                <DropdownMenuItem key={id} onSelect={() => { setView("day"); setPeriod(id); }}>
                  {label}{view === "day" && period === id ? " ·" : ""}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setPlanOpen(true)}>
                <Sparkles className="mr-2 h-3.5 w-3.5" /> Plan my day
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { tray.setTab("tray"); tray.setOpen(true); }}>
                <Inbox className="mr-2 h-3.5 w-3.5" /> Task tray
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
              <PlannerRhythmHeader
                date={day}
                view={view}
                onView={setView}
                onPrev={() => go(addDays(day, -1))}
                onNext={() => go(addDays(day, 1))}
                onGoto={go}
                onToday={() => go(new Date())}
                onCapture={() => setCaptureOpen(true)}
                onPlanMyDay={() => setPlanOpen(true)}
                onCommand={() => setCmdOpen(true)}
              />
            </div>
          </div>

          {view === "day" && (
            <div className="flex items-center gap-2">
              <PlannerPeriodTabs value={period} onChange={setPeriod} />
              <TrayToggle className="ml-auto" />
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-full"
                onClick={() => setTaskPanelHidden(v => !v)}
                aria-label={taskPanelHidden ? "Show task sidebar" : "Hide task sidebar"}
              >
                {taskPanelHidden ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </>
      )}

      {view === "day" && period === "timeofday" && (
        <div className="inline-flex max-w-full items-center gap-0.5 self-start overflow-x-auto rounded-full border border-border/60 bg-background/60 p-0.5">
          {SEGMENTS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSegment(s)}
              aria-pressed={segment === s}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium capitalize transition-colors ${
                segment === s ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "All day" : s}
            </button>
          ))}
        </div>
      )}

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
            <TaskSourcePanel selectedDate={day} onQuickAdd={() => setCaptureOpen(true)} />
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
          {view === "day" && period === "grid" && <PlannerTimeline date={day} />}
          {view === "day" && period === "schedule" && <PlannerScheduleList date={day} />}
          {view === "day" && period === "timeofday" && segment === "all" && (
            <div className="grid h-full min-h-0 gap-3 overflow-y-auto lg:grid-cols-3">
              <PlannerPeriodList date={day} period="morning" />
              <PlannerPeriodList date={day} period="afternoon" />
              <PlannerPeriodList date={day} period="evening" />
            </div>
          )}
          {view === "day" && period === "timeofday" && segment !== "all" && (
            <PlannerPeriodList date={day} period={segment} />
          )}
          {view === "3day" && <PlannerMultiDayView start={day} days={3} unified />}
          {view === "week" && <PlannerMultiDayView start={weekStart} days={7} unified />}
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