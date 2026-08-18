import { useEffect, useRef, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { Sparkles, Rows3 } from "lucide-react";
import { PlannerTimeline } from "./PlannerTimeline";
import { PlannerAllDayRow } from "./PlannerAllDayRow";
import { usePlannerItemOpener } from "./PlannerItemOpener";
import { WeekDayHeader } from "./WeekDayHeader";
import { usePlannerFeed, type PlannerFeedItem } from "@/lib/planner/feed";
import { usePlannerWeekHeaderMode } from "@/lib/planner-prefs";
import { useKindColors, KIND_LABEL, type KindKey } from "@/lib/calendar-colors";
import { PLANNER_START_H, PLANNER_END_H, HOUR_PX } from "@/lib/planner-metrics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const GUTTER_W = 56;
const LEGEND_KINDS: KindKey[] = ["task", "appt", "care", "meal", "bday", "hol", "gcal"];

/** Multi-day hour grid with an all-day row fed by the shared planner feed. */
export function PlannerWeekGrid({ start, days = 7, onOpenItem, onSelectDay, onCustomize }: {
  start: Date;
  days?: number;
  onOpenItem?: (item: PlannerFeedItem) => void;
  onSelectDay?: (d: Date) => void;
  onCustomize?: () => void;
}) {
  const cols = Array.from({ length: days }, (_, i) => addDays(start, i));
  const today = new Date();
  const { byDay } = usePlannerFeed(start, days);
  const { open: openItem, dialogs } = usePlannerItemOpener();
  const handleOpen = onOpenItem ?? openItem;
  const [headerMode, setHeaderMode] = usePlannerWeekHeaderMode();
  const isMobile = useIsMobile();
  const effectiveHeaderMode = isMobile ? "compact" : headerMode;
  /** Phones can't fit 7 legible columns — scroll horizontally instead of collapsing. */
  const minCol = isMobile ? (days > 3 ? 116 : 96) : 0;
  const boardMinWidth = minCol ? GUTTER_W + days * minCol : undefined;
  const { colorOf } = useKindColors();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);
  const totalMin = (PLANNER_END_H - PLANNER_START_H) * 60;
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

  const colTemplate = `${GUTTER_W}px repeat(${days}, minmax(${minCol}px, 1fr))`;
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5">
        <span className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {format(start, "MMM d")} – {format(addDays(start, days - 1), "MMM d")}
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
        {isMobile && days > 3 && (
          <span className="text-[10.5px] text-muted-foreground">Swipe sideways for more days</span>
        )}
      </div>

      {/* Horizontal scroller keeps columns legible on narrow screens */}
      <div className="flex min-h-0 flex-1 flex-col overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
      <div className="flex min-h-0 flex-1 flex-col" style={boardMinWidth ? { minWidth: boardMinWidth } : undefined}>
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

      {/* All-day row */}
      <div className="grid border-b border-border/40 bg-background/40" style={{ gridTemplateColumns: colTemplate }}>
        <div className="sticky left-0 z-30 flex items-center justify-end border-r border-border/50 bg-card/95 pr-1 text-[9px] uppercase tracking-wider text-muted-foreground/70 backdrop-blur">
          All day
        </div>
        {cols.map((d, i) => (
          <PlannerAllDayRow
            key={format(d, "yyyy-MM-dd")}
            items={(byDay.get(format(d, "yyyy-MM-dd")) ?? []).filter(it => it.allDay)}
            onOpen={handleOpen}
            className={cn("min-w-0", i > 0 && "border-l border-border/40")}
          />
        ))}
      </div>

      {/* Shared-gutter time grid */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
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
            <div key={format(d, "yyyy-MM-dd")} className={cn("relative min-w-0", i > 0 && "border-l border-border/40", isSameDay(d, today) && "bg-primary/[0.03]")}>
              <PlannerTimeline date={d} bare gutterless noScroll compact />
            </div>
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

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 px-3 py-1.5 text-[10px] text-muted-foreground">
        {LEGEND_KINDS.map(k => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: colorOf(k) }} aria-hidden />
            {KIND_LABEL[k]}
          </span>
        ))}
        {onCustomize && (
          <button type="button" onClick={onCustomize} className="ml-auto rounded-full px-2 py-0.5 hover:text-foreground">
            Customize view
          </button>
        )}
      </div>
      {dialogs}
    </div>
  );
}
