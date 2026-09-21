import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { Sparkles, Rows3 } from "lucide-react";
import { PlannerTimeline } from "./PlannerTimeline";
import { PlannerAllDayRow } from "./PlannerAllDayRow";
import { PlannerWeekMealsRow } from "./PlannerWeekMealsRow";
import { usePlannerItemOpener } from "./PlannerItemOpener";
import { WeekDayHeader } from "./WeekDayHeader";
import { usePlannerFeed, type PlannerFeedItem } from "@/lib/planner/feed";
import { useWeekFilters, filterFeedItems, matchesTaskFilter } from "@/lib/planner/week-filters";
import { usePlannerWeekHeaderMode } from "@/lib/planner-prefs";
import { useKindColors, KIND_LABEL, type KindKey } from "@/lib/calendar-colors";
import { PLANNER_START_H, PLANNER_END_H, HOUR_PX as BASE_HOUR_PX } from "@/lib/planner-metrics";
import { useTimelineZoom, MIN_ZOOM, MAX_ZOOM } from "@/lib/planner/use-timeline-zoom";
import { PlannerRhythmRow, useRhythmRowVisible } from "./PlannerRhythmRow";
import { Maximize2, Minimize2, Minus, Plus, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { PeriodNoteDot } from "@/components/notes/PeriodNoteDot";
import { usePeriodNoteMarks } from "@/lib/notes/daily";
import { weekKeyFor } from "@/lib/notes/periods";
import { useDropZone } from "@/lib/planner/planner-dnd";
import { PlannerCareRow, useCareRowVisible } from "./PlannerCareRow";
import { PlannerDailyCareChecklist } from "./PlannerDailyCareChecklist";
import { UtensilsCrossed, HeartHandshake } from "lucide-react";

const MEALS_ROW_KEY = "careflow:planner:week-meals-visible";

const GUTTER_W = 56;

/** Weekly-note indicator for the week starting at `start` (Monday). */
function WeekNoteDot({ start }: { start: Date }) {
  const key = weekKeyFor(start);
  const marks = usePeriodNoteMarks("weekly", [key]);
  return <PeriodNoteDot kind="weekly" keyISO={key} mark={marks.get(key)} size={13} />;
}
const LEGEND_KINDS: KindKey[] = ["task", "appt", "care", "meal", "bday", "hol", "gcal"];

/** A day column in the hour grid: drops land on the hour the pointer is over. */
function GridDayColumn({ date, className, hourPx, children }: { date: Date; className?: string; hourPx: number; children: React.ReactNode }) {
  const dateISO = format(date, "yyyy-MM-dd");
  const elRef = useRef<HTMLDivElement | null>(null);
  const resolveTime = useCallback((clientY: number) => {
    const rect = elRef.current?.getBoundingClientRect();
    if (!rect) return undefined;
    const mins = PLANNER_START_H * 60 + ((clientY - rect.top) / hourPx) * 60;
    const snapped = Math.min(23 * 60 + 45, Math.max(0, Math.round(mins / 15) * 15));
    const h = Math.floor(snapped / 60), m = snapped % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }, [hourPx]);
  const zone = useDropZone({ dateISO, resolveTime }, { id: `weekgrid:${dateISO}` });
  return (
    <div
      ref={node => { elRef.current = node; zone.ref(node); }}
      {...zone.nativeProps}
      {...zone.dataProps}
      className={cn(className, zone.className)}
    >
      {children}
    </div>
  );
}

/** Multi-day hour grid with an all-day row fed by the shared planner feed. */
export function PlannerWeekGrid({ start, days = 7, onOpenItem, onSelectDay, onCustomize, expandHeight = false }: {
  start: Date;
  days?: number;
  onOpenItem?: (item: PlannerFeedItem) => void;
  onSelectDay?: (d: Date) => void;
  onCustomize?: () => void;
  /** Show the complete day and let the page own vertical scrolling. */
  expandHeight?: boolean;
}) {
  const cols = Array.from({ length: days }, (_, i) => addDays(start, i));
  const today = new Date();
  const { byDay } = usePlannerFeed(start, days);
  const { filters } = useWeekFilters();
  const taskFilter = useCallback((t: any) => matchesTaskFilter(t, filters), [filters]);
  const { open: openItem, dialogs } = usePlannerItemOpener();
  const handleOpen = onOpenItem ?? openItem;
  const [headerMode, setHeaderMode] = usePlannerWeekHeaderMode();
  const isMobile = useIsMobile();
  const effectiveHeaderMode = isMobile ? "compact" : headerMode;
  /** Phones can't fit 7 legible columns — scroll horizontally instead of collapsing. */
  const minCol = isMobile ? (days > 3 ? 132 : 120) : 0;
  const boardMinWidth = minCol ? GUTTER_W + days * minCol : undefined;
  const { colorOf } = useKindColors();
  const scrollRef = useRef<HTMLDivElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);
  const totalMin = (PLANNER_END_H - PLANNER_START_H) * 60;
  const [careVisible, toggleCare] = useCareRowVisible();
  const [rhythmVisible, toggleRhythm] = useRhythmRowVisible();
  const { zoom, zoomBy } = useTimelineZoom();
  const HOUR_PX = BASE_HOUR_PX * zoom;
  const [fullScreen, setFullScreen] = useState(false);
  const [mealsVisible, setMealsVisible] = useState(() => {
    try { return localStorage.getItem(MEALS_ROW_KEY) !== "0"; } catch { return true; }
  });
  const toggleMeals = () => setMealsVisible(v => {
    const next = !v;
    try { localStorage.setItem(MEALS_ROW_KEY, next ? "1" : "0"); } catch { /* ignore */ }
    return next;
  });
  const todayIdx = cols.findIndex(d => isSameDay(d, today));

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      const m = n.getHours() * 60 + n.getMinutes() - PLANNER_START_H * 60;
      setNowMin(m >= 0 && m <= totalMin ? m : null);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [totalMin]);

  // Open the week around the current hour.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const t = window.setTimeout(() => {
      const mins = (new Date().getHours() - PLANNER_START_H) * 60 + new Date().getMinutes();
      el.scrollTo({ top: Math.max(0, mins * (HOUR_PX / 60) - el.clientHeight / 3) });
    }, 80);
    return () => window.clearTimeout(t);
  }, [format(start, "yyyy-MM-dd")]);

  // Phones open with the current/selected day visible instead of an arbitrary edge.
  useEffect(() => {
    if (!isMobile || !horizontalRef.current || !minCol) return;
    const selectedIndex = Math.max(0, cols.findIndex(d => isSameDay(d, today)));
    const id = window.setTimeout(() => horizontalRef.current?.scrollTo({ left: selectedIndex * minCol, behavior: "smooth" }), 100);
    return () => window.clearTimeout(id);
  }, [isMobile, minCol, start.getTime(), days]); // eslint-disable-line react-hooks/exhaustive-deps

  const handoffWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const atTop = el.scrollTop <= 0 && event.deltaY < 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && event.deltaY > 0;
    if (atTop || atBottom) {
      event.preventDefault();
      window.scrollBy({ top: event.deltaY });
    }
  };

  const colTemplate = `${GUTTER_W}px repeat(${days}, minmax(${minCol}px, 1fr))`;
  return (
    <div className={cn(
      "flex min-h-0 flex-col rounded-lg border border-border/60 bg-card/40",
      expandHeight ? "h-auto overflow-visible" : "h-full overflow-hidden",
      fullScreen && "fixed inset-0 z-50 h-[100dvh] rounded-none bg-background",
    )}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {format(start, "MMM d")} – {format(addDays(start, days - 1), "MMM d")}
          </span>
          {days >= 7 && <WeekNoteDot start={start} />}
        </span>
        {!isMobile && <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 rounded-full px-2.5 text-[11.5px]"
          onClick={() => setHeaderMode(headerMode === "insight" ? "compact" : "insight")}
          aria-label={headerMode === "insight" ? "Switch to compact week headers" : "Switch to full insight week headers"}
        >
          {headerMode === "insight" ? <Rows3 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          {headerMode === "insight" ? "Compact" : "Full insight"}
        </Button>}
        <span className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7 rounded-full", !mealsVisible && "opacity-40")}
            onClick={toggleMeals}
            aria-pressed={mealsVisible}
            aria-label={mealsVisible ? "Hide meals row" : "Show meals row"}
            title={mealsVisible ? "Hide meals" : "Show meals"}
          >
            <UtensilsCrossed className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7 rounded-full", !careVisible && "opacity-40")}
            onClick={toggleCare}
            aria-pressed={careVisible}
            aria-label={careVisible ? "Hide caregiving, home and cleaning row" : "Show caregiving, home and cleaning row"}
            title={careVisible ? "Hide care · home · cleaning" : "Show care · home · cleaning"}
          >
            <HeartHandshake className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7 rounded-full", !rhythmVisible && "opacity-40")}
            onClick={toggleRhythm}
            aria-pressed={rhythmVisible}
            aria-label={rhythmVisible ? "Hide habits and routines row" : "Show habits and routines row"}
            title={rhythmVisible ? "Hide habits · routines" : "Show habits · routines"}
          >
            <Sprout className="h-3.5 w-3.5" />
          </Button>
          <span className="ml-1 inline-flex items-center rounded-full border border-border/60">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" disabled={zoom <= MIN_ZOOM + 0.001}
              onClick={() => zoomBy(1 / 1.25)} aria-label="Smaller grid">
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="px-1 text-[10px] tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" disabled={zoom >= MAX_ZOOM - 0.001}
              onClick={() => zoomBy(1.25)} aria-label="Bigger grid">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={() => setFullScreen(v => !v)}
            aria-pressed={fullScreen}
            aria-label={fullScreen ? "Exit full screen grid" : "Full screen grid"}
            title={fullScreen ? "Exit full screen" : "Full screen grid"}
          >
            {fullScreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </span>
      </div>


      {/* Horizontal scroller keeps columns legible on narrow screens */}
       <div ref={horizontalRef} data-planner-scroll-region className={cn("flex min-h-0 flex-col overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]", expandHeight ? "flex-none" : "flex-1")}>
      <div className={cn("flex min-h-0 flex-col", expandHeight ? "flex-none" : "flex-1")} style={boardMinWidth ? { minWidth: boardMinWidth } : undefined}>
      {/* Day headers */}
      <div
        className="grid border-b border-border/60 bg-card/70 backdrop-blur"
        style={{ gridTemplateColumns: colTemplate }}
      >
        <div className="sticky left-0 z-30 border-r border-border/50 bg-card/95 backdrop-blur" />
        {cols.map((d, i) => (
          <div key={format(d, "yyyy-MM-dd")} className={cn("min-w-0", i > 0 && "border-l border-border/40")}>
            <WeekDayHeader date={d} mode={effectiveHeaderMode} onSelect={onSelectDay} />
          </div>
        ))}
      </div>

      {/* Meals + tracked food */}
      <div className="grid border-b border-border/40 bg-background/40" style={{ gridTemplateColumns: colTemplate }}>
        <div className="sticky left-0 z-30 flex items-center justify-end border-r border-border/50 bg-card/95 pr-1 text-[9px] uppercase tracking-wider text-muted-foreground/70 backdrop-blur">Care</div>
        {cols.map((d, i) => <PlannerDailyCareChecklist key={format(d, "yyyy-MM-dd")} iso={format(d, "yyyy-MM-dd")} compact className={cn(i > 0 && "border-l border-border/40")} />)}
      </div>

      {/* Meals + tracked food */}
      {mealsVisible && (
        <PlannerWeekMealsRow
          days={cols.map(d => format(d, "yyyy-MM-dd"))}
          colTemplate={colTemplate}
        />
      )}

      {/* Caregiving · Home · Cleaning */}
      {careVisible && (
        <PlannerCareRow
          days={cols.map(d => format(d, "yyyy-MM-dd"))}
          colTemplate={colTemplate}
          onToggle={toggleCare}
        />
      )}

      {/* Habits · Routines */}
      {rhythmVisible && (
        <PlannerRhythmRow days={cols.map(d => format(d, "yyyy-MM-dd"))} colTemplate={colTemplate} />
      )}


      {/* All-day row */}
      <div className="grid border-b border-border/40 bg-background/40" style={{ gridTemplateColumns: colTemplate }}>
        <div className="sticky left-0 z-30 flex items-center justify-end border-r border-border/50 bg-card/95 pr-1 text-[9px] uppercase tracking-wider text-muted-foreground/70 backdrop-blur">
          All day
        </div>
        {cols.map((d, i) => (
          <PlannerAllDayRow
            key={format(d, "yyyy-MM-dd")}
            items={filterFeedItems(byDay.get(format(d, "yyyy-MM-dd")) ?? [], filters).filter(it => it.allDay)}
            onOpen={handleOpen}
            className={cn("min-w-0", i > 0 && "border-l border-border/40")}
          />
        ))}
      </div>

      {/* Shared-gutter time grid */}
       <div
         ref={scrollRef}
         onWheel={expandHeight ? undefined : handoffWheel}
         data-planner-timeline-scroll
         className={cn(
           "min-h-0 [-webkit-overflow-scrolling:touch]",
           expandHeight ? "flex-none overflow-y-visible" : "flex-1 overflow-y-auto overscroll-y-auto",
         )}
         style={expandHeight ? { height: totalMin * (HOUR_PX / 60) } : undefined}
       >
        <div className="relative grid" style={{ gridTemplateColumns: colTemplate }}>
          {/* Time gutter */}
          <div
            className="sticky left-0 z-20 relative shrink-0 border-r border-border/50 bg-card/95 text-[10px] text-muted-foreground backdrop-blur"
            style={{ height: totalMin * (HOUR_PX / 60) }}
          >
            {Array.from({ length: PLANNER_END_H - PLANNER_START_H }, (_, i) => {
              const h = PLANNER_START_H + i;
              return (
                <div key={h} style={{ height: HOUR_PX }} className="relative pr-1 text-right">
                  <span className="absolute -top-2 right-1">{format(new Date(2000, 0, 1, h), "h a")}</span>
                </div>
              );
            })}
            {nowMin !== null && (
              <span
                className="absolute right-1 -translate-y-1/2 rounded bg-primary px-1 font-mono text-[9px] text-primary-foreground"
                style={{ top: nowMin * (HOUR_PX / 60) }}
              >
                {format(new Date(), "h:mm a")}
              </span>
            )}
          </div>
          {cols.map((d, i) => (
            <GridDayColumn
              key={format(d, "yyyy-MM-dd")}
              date={d}
              hourPx={HOUR_PX}
              className={cn("relative min-w-0", i > 0 && "border-l border-border/40", isSameDay(d, today) && "bg-primary/[0.03]")}
            >
              <PlannerTimeline date={d} bare gutterless noScroll compact taskFilter={taskFilter} />
            </GridDayColumn>
          ))}
          {/* Now line across today's column */}
          {nowMin !== null && todayIdx >= 0 && (
            <div
              className="pointer-events-none absolute z-20 flex items-center"
              style={{
                top: nowMin * (HOUR_PX / 60),
                left: `calc(${GUTTER_W}px + (100% - ${GUTTER_W}px) * ${todayIdx / days})`,
                width: `calc((100% - ${GUTTER_W}px) / ${days})`,
              }}
              aria-hidden
            >
              <span className="h-2 w-2 -translate-x-1 rounded-full bg-primary shadow" />
              <span className="h-px flex-1 bg-primary" />
            </div>
          )}
        </div>
      </div>
      </div>
      </div>

      {/* Legend — single line that scrolls sideways so it never crowds the grid's scroll area */}
      <div className="flex shrink-0 flex-nowrap items-center gap-x-3 overflow-x-auto overscroll-x-contain whitespace-nowrap border-t border-border/60 px-3 py-1.5 text-[10px] text-muted-foreground">
        {LEGEND_KINDS.map(k => (
          <span key={k} className="inline-flex shrink-0 items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: colorOf(k) }} aria-hidden />
            {KIND_LABEL[k]}
          </span>
        ))}
        {onCustomize && (
          <button type="button" onClick={onCustomize} className="ml-auto shrink-0 rounded-full px-2 py-0.5 hover:text-foreground">
            Customize view
          </button>
        )}
      </div>
      {dialogs}
    </div>
  );
}
