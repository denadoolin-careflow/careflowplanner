import { useEffect, useMemo, useState, type ReactNode } from "react";
import { addDays, differenceInCalendarDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { CalendarDays, Check, ChevronRight, List, Plus, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { filterFeedItems, useWeekFilters } from "@/lib/planner/week-filters";

export type MobileMonthView = "calendar" | "agenda" | "list";
const MOBILE_VIEW_KEY = "careflow:month-mobile-view:v2";
const MOBILE_VIEW_ITEMS = [
  { value: "calendar" as const, label: "Calendar", icon: CalendarDays },
  { value: "agenda" as const, label: "Agenda", icon: Rows3 },
  { value: "list" as const, label: "List", icon: List },
];

function readMobileView(): MobileMonthView {
  try {
    const value = localStorage.getItem(MOBILE_VIEW_KEY);
    if (value === "list") return "list";
    if (value === "calendar") return "calendar";
    if (value === "list") return "list";
    return "agenda";
  } catch { return "agenda"; }
}

/** Wraps a day cell/section so it accepts drops through the shared drag layer. */
function DayDropZone({ dateISO, as = "article", className, children }: { dateISO: string; as?: "article" | "section"; className?: string; children: ReactNode }) {
  const zone = useDropZone({ dateISO }, { id: `month:${dateISO}` });
  const Tag = as;
  return <Tag ref={zone.ref as any} {...zone.nativeProps} {...zone.dataProps} className={cn(className, zone.className, zone.isOver && "planner-month-day--drop")}>{children}</Tag>;
}

export function PlannerMonthView({ date, selectedDate, onSelectDay, onChangeSelectedDate, onCapture, onOpenItem }: {
  date: Date;
  selectedDate?: Date;
  onSelectDay: (d: Date) => void;
  onChangeSelectedDate?: (d: Date) => void;
  onCapture?: () => void;
  onOpenItem?: (item: PlannerFeedItem) => void;
}) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  const total = differenceInCalendarDays(end, start) + 1;
  const days = useMemo(() => Array.from({ length: total }, (_, index) => addDays(start, index)), [start.getTime(), total]); // eslint-disable-line react-hooks/exhaustive-deps
  const { items: monthItems, byDay } = usePlannerFeed(start, total);
  const { filters } = useWeekFilters();
  const filteredItems = useMemo(() => filterFeedItems(monthItems, filters), [monthItems, filters]);
  const filteredByDay = useMemo(() => {
    const index = new Map<string, PlannerFeedItem[]>();
    days.forEach(day => index.set(format(day, "yyyy-MM-dd"), []));
    filteredItems.forEach(item => index.get(item.date)?.push(item));
    return index;
  }, [days, filteredItems]);
  const { open: openItem, dialogs } = usePlannerItemOpener();
  const handleOpen = (item: PlannerFeedItem) => onOpenItem ? onOpenItem(item) : openItem(item);
  const cycles = useCycleDots(days);
  const noteMarks = useDailyNoteMarks(days.map(day => format(day, "yyyy-MM-dd")));
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<MobileMonthView>(readMobileView);
  const today = new Date();
  const selectedKey = format(selectedDate ?? date, "yyyy-MM-dd");
  const activeDate = selectedDate ?? date;
   const activeRows = filteredByDay.get(selectedKey) ?? [];
  const activeWeekStart = startOfWeek(activeDate, { weekStartsOn: 1 });
  const activeWeekDays = Array.from({ length: 7 }, (_, index) => addDays(activeWeekStart, index));
  const weekLoads = useMemo(() => Array.from({ length: Math.ceil(total / 7) }, (_, week) => {
     const rows = days.slice(week * 7, week * 7 + 7).flatMap(day => filteredByDay.get(format(day, "yyyy-MM-dd")) ?? []);
    return Math.round(dayLoad(rows) / 7);
   }), [filteredByDay, days, total]);

  useEffect(() => { try { localStorage.setItem(MOBILE_VIEW_KEY, mobileView); } catch { /* no-op */ } }, [mobileView]);

  const mobileToolbar = (
    <div className="planner-month-mobile-toolbar">
      <ViewPills items={MOBILE_VIEW_ITEMS} value={mobileView} onChange={value => setMobileView(value as MobileMonthView)} ariaLabel="Month layout" />
      <div className="flex items-center gap-1">
        <PlannerMonthFilters />
        {onCapture && <Button size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={onCapture} aria-label={`Add to ${format(activeDate, "MMMM d")}`}><Plus className="h-4 w-4" /></Button>}
      </div>
    </div>
  );

  if (isMobile && mobileView === "agenda") return (
    <div className="planner-month-agenda">
      {mobileToolbar}
      <div className="planner-month-week-strip" aria-label="Choose a day this week">
        {activeWeekDays.map(dayOption => {
          const key = format(dayOption, "yyyy-MM-dd");
          const selected = key === selectedKey;
           const count = (filteredByDay.get(key) ?? []).length;
          return <button key={key} type="button" onClick={() => onChangeSelectedDate?.(dayOption)} aria-pressed={selected} className={cn("planner-month-week-day", selected && "planner-month-week-day--selected")}>
            <span>{format(dayOption, "EEEEE")}</span><strong>{format(dayOption, "d")}</strong>{count > 0 && <i aria-label={`${count} planned`} />}
          </button>;
        })}
      </div>
      <DayDropZone dateISO={selectedKey} as="section" className="planner-month-agenda-day">
        <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{format(activeDate, "EEEE")}</p><h3 className="font-display text-xl font-semibold">{format(activeDate, "MMMM d")}</h3><p className="mt-0.5 text-xs text-muted-foreground">{activeRows.length ? `${activeRows.length} plans held here` : "Space to breathe"}</p></div>
          <div className="flex items-center gap-2"><DailyNoteDot date={activeDate} mark={noteMarks.get(selectedKey)} size={13} /><CapacityIndicator minutes={dayLoad(activeRows)} /></div>
        </div>
        <div className="py-2">
          {activeRows.length ? activeRows.map(item => <MonthItem key={item.id} item={item} onOpen={handleOpen} />) : <p className="py-8 text-center text-sm text-muted-foreground">Nothing planned. Drop something here or add a gentle anchor.</p>}
        </div>
        <div className="grid grid-cols-2 gap-2"><Button className="h-11" onClick={onCapture}><Plus className="mr-1 h-4 w-4" />Add here</Button><Button variant="outline" className="h-11" onClick={() => onSelectDay(activeDate)}>Day details <ChevronRight className="ml-1 h-4 w-4" /></Button></div>
      </DayDropZone>
      <details className="planner-month-mobile-summary"><summary>Month at a glance</summary><PlannerMonthSummary items={monthItems.filter(item => isSameMonth(new Date(`${item.date}T12:00:00`), date))} weekLoads={weekLoads} /></details>
      {dialogs}
    </div>
  );

  if (isMobile && mobileView === "list") return (
    <div className="space-y-2">
       {mobileToolbar}
      <div className="space-y-2">
        {days.filter(day => isSameMonth(day, date)).map(day => {
           const key = format(day, "yyyy-MM-dd"); const rows = filteredByDay.get(key) ?? [];
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
       {!isMobile && <PlannerMonthSummary items={filteredItems.filter(item => isSameMonth(new Date(`${item.date}T12:00:00`), date))} weekLoads={weekLoads} />}
      {isMobile ? mobileToolbar : <div className="flex flex-wrap items-center justify-between gap-2"><PlannerMonthFilters /></div>}
      <div className="planner-month-calendar">
        <div className="planner-month-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(label => <div key={label}>{isMobile ? label.slice(0, 1) : label}</div>)}</div>
        <div className="planner-month-grid">
          {days.map(day => {
            const key = format(day, "yyyy-MM-dd");
             const rows = filteredByDay.get(key) ?? [];
             const visible = rows.slice(0, 3);
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
               {!isMobile && <div className="planner-month-day__capacity"><CapacityIndicator minutes={dayLoad(rows)} compact />{tasks.length > 0 && <span className="text-[9px] text-muted-foreground">{completed}/{tasks.length}</span>}</div>}
               {isMobile ? <button type="button" onClick={() => onSelectDay(day)} aria-label={`${rows.length} planned on ${format(day, "MMMM d")}`} className="planner-month-day__dots">{rows.length > 0 && <span className="planner-month-day__count">{rows.length}</span>}<span className="planner-month-day__signals"><DailyNoteDot date={day} mark={noteMarks.get(key)} size={9} />{cycle && <i className="h-1.5 w-1.5 rounded-full bg-calendar-cosmic" title={cycle.text} />}</span></button> : <div className="planner-month-day__items">{visible.map(item => <MonthItem key={item.id} item={item} onOpen={handleOpen} />)}{rows.length > visible.length && <button type="button" onClick={() => onSelectDay(day)} className="planner-month-more">+{rows.length - visible.length} more</button>}</div>}
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
