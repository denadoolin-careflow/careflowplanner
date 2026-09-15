import { useEffect, useMemo, useState, type ReactNode } from "react";
import { addDays, differenceInCalendarDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { Check, LayoutGrid, List, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlannerFeed, type PlannerFeedItem } from "@/lib/planner/feed";
import { KIND_ICONS } from "./kindIcon";
import { usePlannerItemOpener } from "./PlannerItemOpener";
import { useCycleDots } from "@/lib/planner/day-rhythm";
import { useIsMobile } from "@/hooks/use-mobile";
import { ViewPills } from "@/components/layout/ViewPills";
import { DailyNoteDot } from "@/components/notes/DailyNoteDot";
import { useDailyNoteMarks } from "@/lib/notes/daily";
import { CapacityIndicator, PlannerMonthSummary } from "./PlannerMonthSummary";
import { PlannerMonthFilters } from "./PlannerMonthFilters";
import { dayLoad } from "@/lib/planner/month-move";
import { useDraggableCard, useDropZone, feedDragItem } from "@/lib/planner/planner-dnd";
import { fmt12 } from "@/lib/planner/day-plan";

export type MobileMonthView = "dots" | "chips" | "list";
const MOBILE_VIEW_KEY = "careflow:month-mobile-view:v2";
const MOBILE_VIEW_ITEMS = [
  { value: "dots" as const, label: "Dots", icon: LayoutGrid },
  { value: "chips" as const, label: "Chips", icon: Rows3 },
  { value: "list" as const, label: "List", icon: List },
];

function readMobileView(): MobileMonthView {
  try { const value = localStorage.getItem(MOBILE_VIEW_KEY); return value === "chips" || value === "list" ? value : "dots"; } catch { return "dots"; }
}

/** Wraps a day cell/section so it accepts drops through the shared drag layer. */
function DayDropZone({ dateISO, as = "article", className, children }: { dateISO: string; as?: "article" | "section"; className?: string; children: ReactNode }) {
  const zone = useDropZone({ dateISO }, { id: `month:${dateISO}` });
  const Tag = as;
  return <Tag ref={zone.ref as any} {...zone.nativeProps} {...zone.dataProps} className={cn(className, zone.className, zone.isOver && "planner-month-day--drop")}>{children}</Tag>;
}

export function PlannerMonthView({ date, selectedDate, onSelectDay, onOpenItem }: {
  date: Date;
  selectedDate?: Date;
  onSelectDay: (d: Date) => void;
  onOpenItem?: (item: PlannerFeedItem) => void;
}) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  const total = differenceInCalendarDays(end, start) + 1;
  const days = useMemo(() => Array.from({ length: total }, (_, index) => addDays(start, index)), [start.getTime(), total]); // eslint-disable-line react-hooks/exhaustive-deps
  const { items: monthItems, byDay } = usePlannerFeed(start, total);
  const { open: openItem, dialogs } = usePlannerItemOpener();
  const handleOpen = (item: PlannerFeedItem) => onOpenItem ? onOpenItem(item) : openItem(item);
  const cycles = useCycleDots(days);
  const noteMarks = useDailyNoteMarks(days.map(day => format(day, "yyyy-MM-dd")));
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<MobileMonthView>(readMobileView);
  const today = new Date();
  const selectedKey = format(selectedDate ?? date, "yyyy-MM-dd");
  const weekLoads = useMemo(() => Array.from({ length: Math.ceil(total / 7) }, (_, week) => {
    const rows = days.slice(week * 7, week * 7 + 7).flatMap(day => byDay.get(format(day, "yyyy-MM-dd")) ?? []);
    return Math.round(dayLoad(rows) / 7);
  }), [byDay, days, total]);

  useEffect(() => { try { localStorage.setItem(MOBILE_VIEW_KEY, mobileView); } catch { /* no-op */ } }, [mobileView]);

  if (isMobile && mobileView === "list") return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2"><PlannerMonthFilters /><ViewPills items={MOBILE_VIEW_ITEMS} value={mobileView} onChange={value => setMobileView(value as MobileMonthView)} ariaLabel="Month layout" /></div>
      <div className="space-y-2">
        {days.filter(day => isSameMonth(day, date)).map(day => {
          const key = format(day, "yyyy-MM-dd"); const rows = byDay.get(key) ?? [];
          return <DayDropZone key={key} dateISO={key} as="section" className={cn("planner-month-list-day", key === selectedKey && "planner-month-list-day--selected")}>
            <button type="button" onClick={() => onSelectDay(day)} className="flex min-h-12 w-full items-center justify-between gap-3 text-left"><span className="font-display text-base font-semibold">{format(day, "EEEE, MMM d")}</span><CapacityIndicator minutes={dayLoad(rows)} /></button>
            {rows.length ? <div className="space-y-1 pb-2">{rows.map(item => <MonthItem key={item.id} item={item} onOpen={handleOpen} />)}</div> : <p className="pb-2 text-xs text-muted-foreground">Space to breathe.</p>}
          </DayDropZone>;
        })}
      </div>
      {dialogs}
    </div>
  );

  return (
    <div className="planner-month-canvas">
      <PlannerMonthSummary items={monthItems.filter(item => isSameMonth(new Date(`${item.date}T12:00:00`), date))} weekLoads={weekLoads} />
      <div className="flex flex-wrap items-center justify-between gap-2"><PlannerMonthFilters />{isMobile && <ViewPills items={MOBILE_VIEW_ITEMS} value={mobileView} onChange={value => setMobileView(value as MobileMonthView)} ariaLabel="Month layout" />}</div>
      <div className="planner-month-calendar">
        <div className="planner-month-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(label => <div key={label}>{isMobile ? label.slice(0, 1) : label}</div>)}</div>
        <div className="planner-month-grid">
          {days.map(day => {
            const key = format(day, "yyyy-MM-dd");
            const rows = byDay.get(key) ?? [];
            const visible = rows.slice(0, isMobile ? 2 : 3);
            const dim = !isSameMonth(day, date);
            const current = isSameDay(day, today);
            const selected = key === selectedKey;
            const tasks = rows.filter(row => row.sourceRef.type === "task");
            const completed = tasks.filter(row => row.done).length;
            const cycle = cycles.get(key);
            return <DayDropZone key={key} dateISO={key} className={cn("planner-month-day", dim && "planner-month-day--dim", selected && "planner-month-day--selected", current && "planner-month-day--today")}>
              <button type="button" onClick={() => onSelectDay(day)} className="planner-month-day__header" aria-label={`Select ${format(day, "EEEE, MMMM d")}${rows.length ? `, ${rows.length} planned` : ""}`}>
                <span className="planner-month-day__number">{format(day, "d")}</span>{current && <span className="planner-month-day__today-label">Today</span>}
                <span className="ml-auto flex items-center gap-1"><DailyNoteDot date={day} mark={noteMarks.get(key)} size={11} />{cycle && <span className="h-1.5 w-1.5 rounded-full bg-calendar-cosmic" title={cycle.text} />}</span>
              </button>
              <div className="planner-month-day__capacity"><CapacityIndicator minutes={dayLoad(rows)} compact={!isMobile} />{!isMobile && tasks.length > 0 && <span className="text-[9px] text-muted-foreground">{completed}/{tasks.length}</span>}</div>
              {isMobile && mobileView === "dots" ? <button type="button" onClick={() => onSelectDay(day)} aria-label={`${rows.length} planned on ${format(day, "MMMM d")}`} className="planner-month-day__dots">{rows.slice(0, 5).map(item => <span key={item.id} className={cn("h-2 w-2 rounded-full", item.done && "opacity-35")} style={{ backgroundColor: item.color }} />)}{rows.length > 5 && <span className="text-[9px] text-muted-foreground">+{rows.length - 5}</span>}</button> : <div className="planner-month-day__items">{visible.map(item => <MonthItem key={item.id} item={item} onOpen={handleOpen} compact={isMobile} />)}{rows.length > visible.length && <button type="button" onClick={() => onSelectDay(day)} className="planner-month-more">+{rows.length - visible.length} more</button>}</div>}
            </DayDropZone>;
          })}
        </div>
      </div>
      {dialogs}
    </div>
  );
}

function MonthItem({ item, onOpen, compact }: { item: PlannerFeedItem; onOpen: (item: PlannerFeedItem) => void; compact?: boolean }) {
  const Icon = KIND_ICONS[item.kind];
  const drag = useDraggableCard(feedDragItem(item), { idPrefix: "month" });
  return <div
    ref={drag.ref}
    {...drag.props}
    role="button"
    tabIndex={0}
    onClick={() => onOpen(item)}
    onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); onOpen(item); } }}
    className={cn("planner-month-item", compact && "planner-month-item--compact", item.done && "opacity-50", drag.className)}
  >
    {item.done ? <Check className="h-3 w-3 shrink-0" /> : <Icon className="h-3 w-3 shrink-0" style={{ color: item.color }} />}<span className="truncate">{item.time ? `${fmt12(item.time)} ` : ""}{item.title}</span>
  </div>;
}
