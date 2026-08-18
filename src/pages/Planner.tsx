import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { addDays, addMonths, addYears, format, isValid, parseISO, startOfWeek } from "date-fns";
import { Plus, Command as CommandIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskSourcePanel } from "@/components/planner/TaskSourcePanel";
import { PlannerTimeline } from "@/components/planner/PlannerTimeline";
import { PlannerContextPanel } from "@/components/planner/PlannerContextPanel";
import { PlannerFocusPanel } from "@/components/planner/PlannerFocusPanel";
import { PlannerQuickCapture } from "@/components/planner/PlannerQuickCapture";
import { PlannerMonthView } from "@/components/planner/PlannerMonthView";
import { PlannerWeekGrid } from "@/components/planner/PlannerWeekGrid";
import { PlannerWeekBoard } from "@/components/planner/PlannerWeekBoard";
import { PlannerYearView } from "@/components/planner/PlannerYearView";
import { PlannerMonthOverview } from "@/components/planner/PlannerMonthOverview";
import { PlannerKindFilter } from "@/components/planner/PlannerKindFilter";
import { PlannerRangeModeTabs } from "@/components/planner/PlannerRangeModeTabs";
import { PlanMyDayDialog } from "@/components/planner/PlanMyDayDialog";
import { PlannerCommandBar } from "@/components/planner/PlannerCommandBar";
import { PlannerRhythmHeader } from "@/components/planner/PlannerRhythmHeader";
import { PlannerPeriodTabs, usePlannerPeriod } from "@/components/planner/PlannerPeriodTabs";
import { PlannerPeriodList } from "@/components/planner/PlannerPeriodList";
import { PlannerScheduleList } from "@/components/planner/PlannerScheduleList";
import { PlannerViewToggle } from "@/components/planner/PlannerViewToggle";
import { PlannerCapacityBar } from "@/components/planner/PlannerCapacityBar";
import { PlannerMoonInsight } from "@/components/planner/PlannerMoonInsight";
import { PlannerDayAssistant } from "@/components/planner/PlannerDayAssistant";
import { PlannerEmptyDay } from "@/components/planner/PlannerEmptyDay";
import { PlannerDayReview } from "@/components/planner/PlannerDayReview";
import { PlannerOverdueSection } from "@/components/planner/PlannerOverdueSection";
import { PlannerTimeReview } from "@/components/planner/PlannerTimeReview";
import { PlannerCapacityView } from "@/components/planner/PlannerCapacityView";
import { PlannerDayReferences } from "@/components/planner/PlannerDayReferences";
import { AutoScheduleSettings } from "@/components/planner/AutoScheduleSettings";
import { PlannerShortcutsSheet } from "@/components/planner/PlannerShortcutsSheet";
import { CollapsibleSection } from "@/components/today/CollapsibleSection";
import { usePlannerView, usePlannerPanels, usePlannerWeekMode, usePlannerMonthMode, type PlannerView } from "@/lib/planner-prefs";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ListTodo, Inbox, MoreHorizontal, Sparkles, ChevronLeft, ChevronRight, Timer, PanelRightClose, PanelRightOpen, Keyboard } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { tray, useTray } from "@/lib/tray-store";

const SEGMENTS = ["all", "morning", "afternoon", "evening"] as const;
type Segment = (typeof SEGMENTS)[number];

/**
 * Grid-style views keep their own hour scroll but stay bounded so the page
 * itself is always scrollable past them — no viewport-filling boxes.
 * Timed grids get real breathing room; the month calendar sizes to its rows.
 */
const GRID_BOX = "h-[clamp(520px,78vh,1000px)] min-h-0";
/** Phones: leave room for the sticky header, bottom nav and FAB. */
const GRID_BOX_MOBILE = "h-[68vh] min-h-[440px]";
/** Sticky side columns scroll on their own without stretching the row. */
const SIDE_COL = "sticky top-20 max-h-[calc(100dvh-7.5rem)] overflow-y-auto overscroll-contain";

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
  const [search, setSearch] = useSearchParams();

  const day = useMemo(() => {
    if (!date) return new Date();
    const d = parseISO(date);
    return isValid(d) ? d : new Date();
  }, [date]);

  const [captureOpen, setCaptureOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [view, setView] = usePlannerView();
  const [weekMode, setWeekMode] = usePlannerWeekMode();
  // Phones default to the stacked Overview; the grid stays one tap away.
  const [mobileWeekMode, setMobileWeekMode] = useState<"grid" | "board">("board");
  const [monthMode, setMonthMode] = usePlannerMonthMode();
  const [period, setPeriod] = usePlannerPeriod();
  const isMobile = useIsMobile();
  const [segment, setSegment] = useState<Segment>("all");

  // /planner/:date?range=week — lets Week/Month/Calendar links land on the right range.
  useEffect(() => {
    const r = search.get("range") as PlannerView | null;
    if (r && ["day", "3day", "week", "month", "year"].includes(r)) {
      setView(r);
      const next = new URLSearchParams(search);
      next.delete("range");
      setSearch(next, { replace: true });
    }
  }, [search, setSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Legacy persisted values (morning/afternoon/evening) now live inside "Time of day".
  useEffect(() => {
    if (period === "morning" || period === "afternoon" || period === "evening") {
      setSegment(period as Segment);
      setPeriod("timeofday");
    }
  }, [period, setPeriod]);
  const [mobileTasksOpen, setMobileTasksOpen] = useState(false);
  // Dropping a task from the mobile sheet onto the grid closes the sheet.
  useEffect(() => {
    const close = () => setMobileTasksOpen(false);
    window.addEventListener("careflow:planner-drop", close as EventListener);
    return () => window.removeEventListener("careflow:planner-drop", close as EventListener);
  }, []);
  const [panels, setPanel] = usePlannerPanels();
  const panel = panels[view];

  const [taskPanelWidth, setTaskPanelWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 280;
    const v = Number(window.localStorage.getItem("careflow.planner.taskPanelWidth"));
    return Number.isFinite(v) && v >= 200 && v <= 560 ? v : 280;
  });
  useEffect(() => {
    try { window.localStorage.setItem("careflow.planner.taskPanelWidth", String(taskPanelWidth)); } catch {}
  }, [taskPanelWidth]);
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null);
  const [resizingPanel, setResizingPanel] = useState(false);
  const mobileHeaderRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [shellWidth, setShellWidth] = useState<number>(1600);
  useEffect(() => {
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setShellWidth(entry.contentRect.width));
    ro.observe(el);
    setShellWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  const shellTopRef = useRef<HTMLDivElement>(null);
  const onResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startW: taskPanelWidth };
    setResizingPanel(true);
    document.body.style.userSelect = "none";
    const onMove = (ev: PointerEvent) => {
      const r = resizeRef.current; if (!r) return;
      const next = Math.min(560, Math.max(220, r.startW + (ev.clientX - r.startX)));
      setTaskPanelWidth(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      resizeRef.current = null;
      setResizingPanel(false);
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const go = (d: Date) => navigate(`/planner/${format(d, "yyyy-MM-dd")}`);

  /** Page by the active range instead of always by a day. */
  const step = (dir: 1 | -1) => {
    if (view === "month") return go(addMonths(day, dir));
    if (view === "year") return go(addYears(day, dir));
    if (view === "week") return go(addDays(day, 7 * dir));
    if (view === "3day") return go(addDays(day, 3 * dir));
    return go(addDays(day, dir));
  };

  // Global hotkeys: c capture · Cmd/Ctrl+K command bar · t today · [ / ] prev/next
  // 1-5 range · Shift+G/S/D day sub-views · ? shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setCmdOpen(o => !o); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (e.shiftKey) {
        if (k === "g") { e.preventDefault(); setView("day"); setPeriod("grid"); return; }
        if (k === "s") { e.preventDefault(); setView("day"); setPeriod("schedule"); return; }
        if (k === "d") { e.preventDefault(); setView("day"); setPeriod("timeofday"); return; }
        if (e.key === "?") { e.preventDefault(); setShortcutsOpen(true); return; }
      }
      if (e.key === "?") { e.preventDefault(); setShortcutsOpen(true); return; }
      if (e.shiftKey) return;
      if (k === "c") { e.preventDefault(); setCaptureOpen(true); return; }
      if (k === "t") { e.preventDefault(); go(new Date()); return; }
      if (e.key === "[") { e.preventDefault(); step(-1); return; }
      if (e.key === "]") { e.preventDefault(); step(1); return; }
      if (e.key === "1") { e.preventDefault(); setView("day"); return; }
      if (e.key === "2") { e.preventDefault(); setView("3day"); return; }
      if (e.key === "3") { e.preventDefault(); setView("week"); return; }
      if (e.key === "4") { e.preventDefault(); setView("month"); return; }
      if (e.key === "5") { e.preventDefault(); setView("year"); return; }
      if (k === "w") { e.preventDefault(); setView("week"); return; }
      if (k === "m") { e.preventDefault(); setView("month"); return; }
      if (k === "y") { e.preventDefault(); setView("year"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [day, view, setView, setPeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the main grid readable: drop side columns when the shell gets narrow.
  const roomForContext = shellWidth >= 1180;
  const roomForFocus = shellWidth >= 1400;
  const showContextPanel = !isMobile && panel.context && view !== "year" && roomForContext;
  const showFocusPanel = !isMobile && panel.focus && view === "day" && roomForFocus;
  const showTaskPanel = !isMobile && panel.task && shellWidth >= 900;
  const weekStart = useMemo(() => startOfWeek(day, { weekStartsOn: 1 }), [day]);
  const activeWeekMode = isMobile ? mobileWeekMode : weekMode;
  const gridBox = isMobile ? GRID_BOX_MOBILE : GRID_BOX;
  const openDay = (d: Date) => { setView("day"); go(d); };

  const onResizeKey = useCallback((e: React.KeyboardEvent) => {
    const stepPx = e.shiftKey ? 40 : 12;
    if (e.key === "ArrowLeft") { e.preventDefault(); setTaskPanelWidth(w => Math.max(220, w - stepPx)); }
    else if (e.key === "ArrowRight") { e.preventDefault(); setTaskPanelWidth(w => Math.min(560, w + stepPx)); }
    else if (e.key === "Home") { e.preventDefault(); setTaskPanelWidth(280); }
  }, []);

  return (
    <div
      ref={shellRef}
      className={
        isMobile
          ? "planner-surface flex flex-col gap-2.5 pb-32"
          : "planner-surface flex flex-col gap-3 pb-10"
      }
    >
      <div ref={shellTopRef} aria-hidden className="h-0" />
      {isMobile ? (
        <div ref={mobileHeaderRef} className="sticky top-0 z-30 -mx-2 space-y-1.5 bg-background/90 px-2 py-1.5 backdrop-blur-md">
        <div className="flex items-center gap-1">
          <Sheet open={mobileTasksOpen} onOpenChange={setMobileTasksOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0 rounded-full" aria-label="Show tasks">
                <ListTodo className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              data-planner-hide-on-drag
              className="w-[86vw] max-w-[360px] p-0 transition-opacity duration-150"
            >
              <div className="h-full overflow-hidden p-3">
                <p className="pb-1.5 text-[10.5px] text-muted-foreground">
                  Press and hold a task to drag it onto the timeline — this panel fades so you can see the grid.
                </p>
                <TaskSourcePanel selectedDate={day} onQuickAdd={() => { setMobileTasksOpen(false); setCaptureOpen(true); }} />
              </div>
            </SheetContent>
          </Sheet>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 rounded-full" onClick={() => step(-1)} aria-label="Previous period">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={() => go(new Date())}
            className="min-w-0 flex-1 truncate text-center font-display text-[15px] font-semibold"
            aria-label={`${format(day, "EEEE, MMMM d")} — tap for today`}
          >
            {view === "month" ? format(day, "MMMM yyyy") : view === "year" ? format(day, "yyyy") : format(day, "EEE, MMM d")}
          </button>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 rounded-full" onClick={() => step(1)} aria-label="Next period">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0 rounded-full" aria-label="Planner views and actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {view === "week" && (
                <>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Week as</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => { setMobileWeekMode("grid"); setWeekMode("grid"); }}>
                    {activeWeekMode === "grid" ? "• " : ""}Grid
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => { setMobileWeekMode("board"); setWeekMode("board"); }}>
                    {activeWeekMode === "board" ? "• " : ""}Overview
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {view === "month" && (
                <>
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Month as</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => setMonthMode("calendar")}>
                    {monthMode === "calendar" ? "• " : ""}Calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setMonthMode("overview")}>
                    {monthMode === "overview" ? "• " : ""}Overview
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Actions</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setPlanOpen(true)}>
                <Sparkles className="mr-2 h-3.5 w-3.5" /> Plan my day
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setCaptureOpen(true)}>
                <Plus className="mr-2 h-3.5 w-3.5" /> Add task
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { tray.setTab("tray"); tray.setOpen(true); }}>
                <Inbox className="mr-2 h-3.5 w-3.5" /> Task tray
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AutoScheduleSettings size="md" />
        </div>
        <div
          className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ maskImage: "linear-gradient(to right, transparent 0, #000 8px, #000 calc(100% - 22px), transparent 100%)", WebkitMaskImage: "linear-gradient(to right, transparent 0, #000 8px, #000 calc(100% - 22px), transparent 100%)" }}
        >
          <PlannerViewToggle value={view} onChange={setView} className="shrink-0" />
          {view === "day" && <PlannerPeriodTabs value={period} onChange={setPeriod} className="shrink-0" />}
          <PlannerKindFilter className="shrink-0" />
        </div>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
              <PlannerRhythmHeader
                date={day}
                view={view}
                onView={setView}
                onPrev={() => step(-1)}
                onNext={() => step(1)}
                onGoto={go}
                onToday={() => go(new Date())}
                onCapture={() => setCaptureOpen(true)}
                onPlanMyDay={() => setPlanOpen(true)}
                onCommand={() => setCmdOpen(true)}
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {view === "day" && <PlannerPeriodTabs value={period} onChange={setPeriod} />}
            {view === "week" && (
              <PlannerRangeModeTabs
                value={weekMode} onChange={setWeekMode}
                options={[{ id: "grid", label: "Grid" }, { id: "board", label: "Overview" }]}
              />
            )}
            {view === "month" && (
              <PlannerRangeModeTabs
                value={monthMode} onChange={setMonthMode}
                options={[{ id: "calendar", label: "Calendar" }, { id: "overview", label: "Overview" }]}
              />
            )}
            <PlannerKindFilter className="ml-auto" />
            <TrayToggle />
            {(view === "day" || view === "3day" || view === "week" || view === "month" || view === "year") && (
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-full"
                onClick={() => setPanel(view, "task", !panel.task)}
                aria-pressed={panel.task}
                aria-label={panel.task ? "Hide task sidebar" : "Show task sidebar"}
              >
                {panel.task ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </Button>
            )}
            {view === "day" && (
              <Button
                size="icon"
                variant="outline"
                className={`h-8 w-8 rounded-full ${panel.focus ? "text-primary" : ""}`}
                onClick={() => setPanel(view, "focus", !panel.focus)}
                aria-pressed={panel.focus}
                aria-label={panel.focus ? "Hide focus timer panel" : "Show focus timer panel"}
              >
                <Timer className="h-4 w-4" />
              </Button>
            )}
            {(view === "day" || view === "3day") && (
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-full"
                onClick={() => setPanel(view, "context", !panel.context)}
                aria-pressed={panel.context}
                aria-label={panel.context ? "Hide day context panel" : "Show day context panel"}
              >
                {panel.context ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </Button>
            )}
            <AutoScheduleSettings size="md" />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full text-muted-foreground"
              onClick={() => setShortcutsOpen(true)}
              aria-label="Show keyboard shortcuts"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          </div>
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
        className={
          isMobile
            ? "grid items-start gap-3"
            : "grid items-start gap-3"
        }
        style={{
          gridTemplateColumns: [
            showTaskPanel ? `${taskPanelWidth}px 6px` : null,
            "minmax(0,1fr)",
            showFocusPanel ? "230px" : null,
            showContextPanel ? "300px" : null,
          ].filter(Boolean).join(" "),
        }}
      >
        {showTaskPanel && (
          <>
            <div className={`${SIDE_COL} pr-1`}>
              <PlannerOverdueSection date={day} className="mb-2" />
              <TaskSourcePanel
                selectedDate={day}
                onQuickAdd={() => setCaptureOpen(true)}
                onCollapse={() => setPanel(view, "task", false)}
              />
            </div>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize task panel"
              aria-valuenow={taskPanelWidth}
              aria-valuemin={220}
              aria-valuemax={560}
              tabIndex={0}
              onPointerDown={onResizeStart}
              onKeyDown={onResizeKey}
              onDoubleClick={() => setTaskPanelWidth(280)}
              title="Drag to resize · double-click to reset"
              className="group relative -mx-2 w-[14px] cursor-col-resize touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className={`absolute inset-y-2 left-1/2 w-[3px] -translate-x-1/2 rounded-full transition-colors ${resizingPanel ? "bg-primary" : "bg-border/60 group-hover:bg-primary/60"}`} />
              <div className={`absolute left-1/2 top-1/2 h-8 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/70 transition-opacity ${resizingPanel ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} aria-hidden />
            </div>
          </>
        )}
        <div className="flex min-w-0 flex-col">
          {!showTaskPanel && <PlannerOverdueSection date={day} className="mb-2" />}
          {view === "day" && (
            <div className="mb-2 shrink-0 space-y-2">
              <PlannerMoonInsight date={day} onSelectDate={openDay} />
              {isMobile ? (
                <CollapsibleSection
                  storageKey="planner.mobile.daycontext.collapsed"
                  eyebrow="Day context"
                  title="Capacity & assistant"
                  defaultCollapsed
                >
                  <div className="space-y-2 px-2 pb-2">
                    <PlannerDayAssistant date={day} />
                    <PlannerCapacityBar date={day} />
                  </div>
                </CollapsibleSection>
              ) : (
                <>
                  <PlannerDayAssistant date={day} />
                  <PlannerCapacityBar date={day} />
                </>
              )}
              <PlannerEmptyDay
                date={day}
                onPlanMyDay={() => setPlanOpen(true)}
                onAddTask={() => setCaptureOpen(true)}
              />
              <PlannerDayReferences date={day} />
            </div>
          )}
          <div className="flex min-w-0 flex-col gap-3">
            {view === "day" && period === "grid" && (
              <div className={gridBox}><PlannerTimeline date={day} /></div>
            )}
            {view === "day" && period === "schedule" && <PlannerScheduleList date={day} />}
            {view === "day" && period === "capacity" && (
              <PlannerCapacityView date={day} onSelectDate={openDay} />
            )}
            {view === "day" && period === "timeofday" && segment === "all" && (
              <div className="grid grid-cols-1 gap-3">
                <PlannerPeriodList date={day} period="morning" />
                <PlannerPeriodList date={day} period="afternoon" />
                <PlannerPeriodList date={day} period="evening" />
              </div>
            )}
            {view === "day" && period === "timeofday" && segment !== "all" && (
              <PlannerPeriodList date={day} period={segment} />
            )}
            {view === "3day" && (
              <div className={gridBox}>
                <PlannerWeekGrid start={day} days={3} onSelectDay={openDay} />
              </div>
            )}
            {view === "week" && activeWeekMode === "grid" && (
              <div className={gridBox}>
                <PlannerWeekGrid start={weekStart} days={7} onSelectDay={openDay} />
              </div>
            )}
            {view === "week" && activeWeekMode === "board" && (
              <>
                <PlannerTimeReview from={weekStart} days={7} label="this week" />
                <PlannerWeekBoard weekStart={weekStart} onSelectDay={openDay} />
              </>
            )}
            {view === "month" && monthMode === "calendar" && (
              <PlannerMonthView date={day} onSelectDay={openDay} />
            )}
            {view === "month" && monthMode === "overview" && (
              <PlannerMonthOverview date={day} onJumpToDate={openDay} />
            )}
            {view === "year" && <PlannerYearView date={day} onSelectDay={openDay} />}
          </div>
          {view === "day" && (
            isMobile ? (
              <PlannerDayReview date={day} className="mt-3" />
            ) : (
              <div className="mt-3 shrink-0">
                <CollapsibleSection
                  storageKey="planner.dayreview.collapsed"
                  eyebrow="Day review"
                  title="Planned vs completed"
                  defaultCollapsed
                >
                  <div className="px-2 pb-2">
                    <PlannerDayReview date={day} />
                  </div>
                </CollapsibleSection>
              </div>
            )
          )}
          {!isMobile && ((panel.focus && view === "day" && !roomForFocus) || (panel.context && !roomForContext)) && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {panel.focus && view === "day" && !roomForFocus && <PlannerFocusPanel date={day} />}
              {panel.context && !roomForContext && <PlannerContextPanel date={day} onChangeDate={go} />}
            </div>
          )}
        </div>
        {showFocusPanel && (
          <div className={SIDE_COL}>
            <PlannerFocusPanel date={day} className="self-start" />
          </div>
        )}
        {showContextPanel && (
          <div className={SIDE_COL}>
            <PlannerContextPanel date={day} onChangeDate={go} />
          </div>
        )}
      </div>

      <PlannerQuickCapture open={captureOpen} onOpenChange={setCaptureOpen} defaultDate={day} />
      <PlannerShortcutsSheet open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
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