import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { addDays, differenceInCalendarDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { CalendarDays, Check, ChevronRight, Columns3, List, Plus, Rows3, Sprout } from "lucide-react";
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
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { LUNAR_RHYTHM, lunarRhythmAt } from "@/lib/cosmic/lunar-rhythm";
import { moonEnergyWord } from "@/lib/cosmic/moon-energy";
import { PHASE_ICONS } from "./PhaseRibbon";
import { getMoonSign } from "@/lib/zodiac";
import { useStore } from "@/lib/store";
import { habitProgress } from "./PlannerRhythmRow";
import { CosmicEventHover } from "./CosmicEventHover";
import { MonthlyPlanningGarden } from "./MonthlyPlanningGarden";

const KEY_MOON_PHASES = ["new", "first-quarter", "full", "last-quarter"];

export type MobileMonthView = "calendar" | "agenda" | "list" | "board" | "garden";
const MOBILE_VIEW_KEY = "careflow:month-mobile-view:v2";
const MOBILE_VIEW_ITEMS = [
  { value: "calendar" as const, label: "Calendar", icon: CalendarDays },
  { value: "agenda" as const, label: "Agenda", icon: Rows3 },
  { value: "list" as const, label: "List", icon: List },
  { value: "board" as const, label: "Board", icon: Columns3 },
  { value: "garden" as const, label: "Garden", icon: Sprout },
];

function readMobileView(): MobileMonthView {
  try {
    const value = localStorage.getItem(MOBILE_VIEW_KEY);
    if (value === "agenda") return "agenda";
    if (value === "list") return "list";
    if (value === "board") return "board";
    if (value === "garden") return "garden";
    return "calendar";
  } catch { return "calendar"; }
}

/** Wraps a day cell/section so it accepts drops through the shared drag layer. */
function DayDropZone({ dateISO, as = "article", className, children }: { dateISO: string; as?: "article" | "section"; className?: string; children: ReactNode }) {
  const zone = useDropZone({ dateISO }, { id: `month:${dateISO}` });
  const Tag = as;
  return <Tag ref={zone.ref as any} {...zone.nativeProps} {...zone.dataProps} className={cn(className, zone.className, zone.isOver && "planner-month-day--drop")}>{children}</Tag>;
}

const MEAL_ORDER = ["Breakfast", "Lunch", "Dinner", "Snack", "Drink"];
const MEAL_ABBR: Record<string, string> = { Breakfast: "B", Lunch: "L", Dinner: "D", Snack: "S", Drink: "Dr" };
const mealRank = (item: PlannerFeedItem) => { const i = MEAL_ORDER.indexOf(item.title.split(": ")[0]); return i < 0 ? 99 : i; };

export function PlannerMonthView({ date, selectedDate, onSelectDay, onChangeSelectedDate, onCapture, onOpenItem, onOpenDay }: {
  date: Date;
  selectedDate?: Date;
  onSelectDay: (d: Date) => void;
  onChangeSelectedDate?: (d: Date) => void;
  onCapture?: () => void;
  onOpenItem?: (item: PlannerFeedItem) => void;
  onOpenDay?: (d: Date) => void;
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
    index.forEach(list => list.sort((a, b) => (a.kind === "meal" && b.kind === "meal") ? mealRank(a) - mealRank(b) : 0));
    return index;
  }, [days, filteredItems]);
  const { open: openItem, dialogs } = usePlannerItemOpener();
  const handleOpen = (item: PlannerFeedItem) => onOpenItem ? onOpenItem(item) : openItem(item);
  const cycles = useCycleDots(days);
  const { state } = useStore() as any;
  /** Moon glyph on key phase days, moon sign, and the cycle emoji where a phase begins. */
  const rhythmMarks = useMemo(() => {
    const map = new Map<string, { moon?: string; sign: string; cycleGlyph?: string; title: string }>();
    let prevPhase: string | null = null;
    for (const day of days) {
      const key = format(day, "yyyy-MM-dd");
      const phase = getMoonPhase(day);
      const sign = getMoonSign(day);
      const dot = cycles.get(key);
      const cycleStart = dot && dot.phase !== prevPhase;
      prevPhase = dot ? dot.phase : null;
      map.set(key, {
        moon: KEY_MOON_PHASES.includes(phase) ? MOON_INFO[phase].glyph : undefined,
        sign: `${sign.symbol} ${moonEnergyWord(sign.name)}`,
        cycleGlyph: cycleStart ? dot!.glyph : undefined,
        title: [MOON_INFO[phase].label, `Moon in ${sign.name}`, cycleStart ? `${dot!.label} phase begins` : null].filter(Boolean).join(" · "),
      });
    }
    return map;
  }, [days, cycles]);
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

  const signOf = (day: Date) => { const n = new Date(day); n.setHours(12); try { return getMoonSign(n); } catch { return null; } };
  const DayMeta = ({ day }: { day: Date }) => { const n = new Date(day); n.setHours(12); const sg = signOf(day); const ph = lunarRhythmAt(n); const PIcon = PHASE_ICONS[ph];
    return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><span aria-hidden>{MOON_INFO[getMoonPhase(n)].glyph}</span><PIcon className="h-3.5 w-3.5" style={{ color: `hsl(var(--rhythm-${ph}-deep))` }} aria-label={LUNAR_RHYTHM[ph].label} />{sg && <span title={`Moon in ${sg.name}`}>{sg.symbol} {moonEnergyWord(sg.name)}</span>}</span>; };
  const monthDays = days.filter(day => isSameMonth(day, date));
  const dayRows = (day: Date) => filteredByDay.get(format(day, "yyyy-MM-dd")) ?? [];

  if (isMobile && mobileView === "calendar") return (
    <div className="space-y-3">
      {mobileToolbar}
      <section aria-label={`${format(date, "MMMM")} at a glance`} className="rounded-2xl border border-border/60 bg-card p-2">
        <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-muted-foreground">{["M", "T", "W", "T", "F", "S", "S"].map((l, i) => <span key={i}>{l}</span>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-0.5 text-center text-xs">
          {days.map(day => {
            const key = format(day, "yyyy-MM-dd");
            const has = dayRows(day).length > 0;
            const sel = key === selectedKey;
            const sg = signOf(day);
            return <button key={key} type="button" onClick={() => onChangeSelectedDate?.(day)} aria-pressed={sel} aria-label={`${format(day, "EEEE, MMMM d")}${sg ? `, Moon in ${sg.name}` : ""}${has ? ", has plans" : ""}`}
              className={cn("relative flex h-11 flex-col items-center justify-center rounded-lg tabular-nums leading-tight", !isSameMonth(day, date) && "opacity-35", sel ? "bg-primary text-primary-foreground" : isSameDay(day, today) ? "ring-1 ring-primary" : "", has && !sel && "font-bold text-primary")}>
              <span>{format(day, "d")}</span>
              <span aria-hidden className="text-[9px] font-normal opacity-70">{sg?.symbol}</span>
              {has && <i className={cn("absolute right-1 top-1 h-1 w-1 rounded-full", sel ? "bg-primary-foreground" : "bg-primary")} />}
            </button>;
          })}
        </div>
      </section>
      <DayDropZone dateISO={selectedKey} as="section" className="planner-month-agenda-day">
        <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2">
          <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{format(activeDate, "EEEE")}</p><h3 className="font-display text-lg">{format(activeDate, "MMMM d")}</h3>{DayMeta({ day: activeDate })}</div>
          <div className="flex shrink-0 items-center gap-1">
            {onCapture && <Button size="sm" variant="outline" className="h-10" onClick={onCapture} aria-label={`Add to ${format(activeDate, "MMMM d")}`}><Plus className="h-4 w-4" /></Button>}
            <Button size="sm" className="h-10" onClick={() => (onOpenDay ?? onSelectDay)(activeDate)}>Open <ChevronRight className="ml-0.5 h-4 w-4" /></Button>
          </div>
        </div>
        <div className="py-1">{activeRows.length ? activeRows.map(item => <MonthItem key={item.id} item={item} onOpen={handleOpen} />) : <p className="py-6 text-center text-sm text-muted-foreground">Nothing planned. Tap + to add a gentle anchor.</p>}</div>
      </DayDropZone>
      {dialogs}
    </div>
  );

  const DayCard = ({ day }: { day: Date }) => { const key = format(day, "yyyy-MM-dd"); const rows = dayRows(day);
    return <DayDropZone key={key} dateISO={key} as="section" className={cn("planner-month-list-day", key === selectedKey && "planner-month-list-day--selected")}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <button type="button" onClick={() => onSelectDay(day)} className="flex min-h-11 min-w-0 items-center gap-2 text-left"><span className="font-display text-base font-semibold">{format(day, "EEEE, MMM d")}</span>{isSameDay(day, today) && <span className="rounded-full bg-primary/10 px-2 text-[10px] font-semibold text-primary">Today</span>}</button>
        <div className="flex items-center gap-2">{DayMeta({ day: day })}<CapacityIndicator minutes={dayLoad(rows)} /></div>
      </div>
      {rows.length ? <div className="space-y-1 pb-2">{rows.map(item => <MonthItem key={item.id} item={item} onOpen={handleOpen} />)}</div> : <p className="pb-2 text-xs text-muted-foreground">Space to breathe.</p>}
    </DayDropZone>; };

  if (mobileView === "agenda") {
    const busy = monthDays.filter(day => dayRows(day).length || isSameDay(day, today));
    return <div className="space-y-2">{mobileToolbar}{busy.length ? busy.map(day => <Fragment key={day.toISOString()}>{DayCard({ day })}</Fragment>) : <p className="py-8 text-center text-sm text-muted-foreground">Nothing planned this month yet.</p>}{dialogs}</div>;
  }

  if (mobileView === "list") return <div className="space-y-2">{mobileToolbar}{monthDays.map(day => <Fragment key={day.toISOString()}>{DayCard({ day })}</Fragment>)}{dialogs}</div>;

  if (mobileView === "garden") return <div className="space-y-2">{mobileToolbar}<MonthlyPlanningGarden month={date} />{dialogs}</div>;

  if (mobileView === "board") {
    const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, w) => days.slice(w * 7, w * 7 + 7));
    return (
      <div className="space-y-2">
        {mobileToolbar}
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
          {weeks.map(week => (
            <section key={week[0].toISOString()} className="w-[78vw] max-w-[300px] shrink-0 snap-start rounded-2xl border border-border/60 bg-card/70 p-2 sm:w-64">
              <h4 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{format(week[0], "MMM d")} – {format(week[6], "MMM d")}</h4>
              <div className="space-y-1.5">
                {week.map(day => { const key = format(day, "yyyy-MM-dd"); const rows = dayRows(day);
                  return <DayDropZone key={key} dateISO={key} as="section" className={cn("rounded-xl border border-border/40 bg-background/60 p-1.5", !isSameMonth(day, date) && "opacity-50", isSameDay(day, today) && "border-primary")}>
                    <button type="button" onClick={() => onSelectDay(day)} className="flex min-h-9 w-full flex-wrap items-center justify-between gap-1 px-1 text-left"><span className="text-xs font-semibold">{format(day, "EEE d")}</span>{DayMeta({ day: day })}</button>
                    {rows.map(item => <MonthItem key={item.id} item={item} onOpen={handleOpen} compact />)}
                  </DayDropZone>; })}
              </div>
            </section>
          ))}
        </div>
        {dialogs}
      </div>
    );
  }

  return (
    <div className="planner-month-canvas">
       {!isMobile && <PlannerMonthSummary items={filteredItems.filter(item => isSameMonth(new Date(`${item.date}T12:00:00`), date))} weekLoads={weekLoads} />}
      {mobileToolbar}
      <div className="planner-month-calendar">
        <div className="planner-month-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(label => <div key={label}>{isMobile ? label.slice(0, 1) : label}</div>)}</div>
        <div className="planner-month-grid">
          {days.map(day => {
            const key = format(day, "yyyy-MM-dd");
             const rows = filteredByDay.get(key) ?? [];
             const meals = rows.filter(row => row.kind === "meal");
             const nonMeals = rows.filter(row => row.kind !== "meal");
             const visible = nonMeals.slice(0, isMobile ? 3 : 4);
             const dim = !isSameMonth(day, date);
             const current = isSameDay(day, today);
             const selected = key === selectedKey;
             const tasks = rows.filter(row => row.sourceRef.type === "task");
             const completed = tasks.filter(row => row.done).length;
             const cycle = cycles.get(key);
             const rhythm = rhythmMarks.get(key);
             const habits = habitProgress((state.habits ?? []) as any, day);
             const dayMilestones = (state.projects ?? []).flatMap(p => (p.milestones ?? []).filter(m => m.date === key).map(m => ({ ...m, project: p })));
             return <DayDropZone key={key} dateISO={key} className={cn("group planner-month-day", dim && "planner-month-day--dim", selected && "planner-month-day--selected", current && "planner-month-day--today")}>
              <button type="button" onClick={() => onSelectDay(day)} className="planner-month-day__header" aria-label={`Select ${format(day, "EEEE, MMMM d")}${rows.length ? `, ${rows.length} planned` : ""}`}>
                <span className="planner-month-day__number">{format(day, "d")}</span>{current && <span className="planner-month-day__today-label">Today</span>}
                <span className="ml-auto flex items-center gap-1"><DailyNoteDot date={day} mark={noteMarks.get(key)} size={11} />{cycle && <span className="h-1.5 w-1.5 rounded-full bg-calendar-cosmic" title={cycle.text} />}</span>
              </button>
              {!isMobile && onCapture && <button type="button" onClick={() => { onChangeSelectedDate?.(day); onCapture(); }} className="planner-month-day__add" aria-label={`Add to ${format(day, "MMMM d")}`} title="Add to this day"><Plus className="h-3 w-3" /></button>}
              {(rhythm || dayMilestones.length > 0) && <span className="planner-month-day__rhythm" title={rhythm?.title}>
                <span className="inline-flex items-center gap-0.5 font-medium">{rhythm?.moon && <span aria-hidden>{rhythm.moon}</span>}<span aria-hidden>{rhythm?.sign}</span></span>
                {rhythm?.cycleGlyph && <span className="rounded bg-calendar-cosmic/10 px-1" aria-hidden>{rhythm.cycleGlyph}</span>}
                {dayMilestones.length > 0 && <span className="rounded bg-primary/10 px-1 text-primary" title={dayMilestones.map(m => `${m.project.name}: ${m.title}`).join("\n")}>🚩{dayMilestones.length > 1 ? dayMilestones.length : ""}</span>}
                {habits.total > 0 && <span className="ml-auto inline-flex items-center gap-0.5 text-muted-foreground">🌱 {habits.done}/{habits.total}</span>}
              </span>}
               {!isMobile && <div className="planner-month-day__capacity"><CapacityIndicator minutes={dayLoad(rows)} compact />{tasks.length > 0 && <span className="text-[9px] text-muted-foreground">{completed}/{tasks.length}</span>}</div>}
                {isMobile ? <button type="button" onClick={() => onSelectDay(day)} aria-label={`${rows.length} planned on ${format(day, "MMMM d")}`} className="planner-month-day__dots">{rows.length > 0 && <span className="planner-month-day__count">{completed > 0 ? `${completed}/${tasks.length}` : rows.length}</span>}<span className="planner-month-day__signals"><DailyNoteDot date={day} mark={noteMarks.get(key)} size={9} />{cycle && <i className="h-1.5 w-1.5 rounded-full bg-calendar-cosmic" title={cycle.text} />}</span>{tasks.length > 0 && <span className="planner-month-day__task-progress" style={{ ["--task-progress" as string]: `${Math.round((completed / tasks.length) * 100)}%` }} />}</button> : <div className="planner-month-day__items">{meals.length > 0 && <div className="flex flex-col gap-px rounded-md border border-border/40 bg-muted/30 px-1 py-0.5 text-[9px] leading-tight" aria-label="Meals">{meals.map(m => { const [slot, ...rest] = m.title.split(": "); return <button key={m.id} type="button" onClick={e => { e.stopPropagation(); handleOpen(m); }} title={m.title} className="flex min-w-0 items-baseline gap-1 text-left hover:text-foreground"><span className="shrink-0 font-semibold uppercase text-muted-foreground">{MEAL_ABBR[slot] ?? slot.slice(0, 1)}</span><span className="truncate">{rest.join(": ") || slot}</span></button>; })}</div>}{visible.map(item => <MonthItem key={item.id} item={item} onOpen={handleOpen} />)}{nonMeals.length > visible.length && <button type="button" onClick={() => onSelectDay(day)} className="planner-month-more">+{nonMeals.length - visible.length} more</button>}</div>}
            </DayDropZone>;
          })}
        </div>
      </div>
      {isMobile && <DayDropZone dateISO={selectedKey} as="section" className="planner-month-agenda-day">
        <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2">
          <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{format(activeDate, "EEEE")}</p><h3 className="font-display text-lg">{format(activeDate, "MMMM d")}</h3><p className="text-xs text-muted-foreground">{activeRows.length ? `${activeRows.length} planned · ${activeRows.filter(r => r.done).length} done` : "Space to breathe"}</p></div>
          <div className="flex shrink-0 items-center gap-1">
            {onCapture && <Button size="sm" variant="outline" className="h-10" onClick={onCapture} aria-label={`Add to ${format(activeDate, "MMMM d")}`}><Plus className="h-4 w-4" /></Button>}
            <Button size="sm" className="h-10" onClick={() => (onOpenDay ?? onSelectDay)(activeDate)}>Open <ChevronRight className="ml-0.5 h-4 w-4" /></Button>
          </div>
        </div>
        <div className="py-1">{activeRows.length ? activeRows.map(item => <MonthItem key={item.id} item={item} onOpen={handleOpen} />) : <p className="py-6 text-center text-sm text-muted-foreground">Nothing planned. Tap + to add a gentle anchor.</p>}</div>
      </DayDropZone>}
      {dialogs}
    </div>
  );
}

function MonthItem({ item, onOpen, compact }: { item: PlannerFeedItem; onOpen: (item: PlannerFeedItem) => void; compact?: boolean }) {
  const Icon = KIND_ICONS[item.kind];
  const drag = useDraggableCard(feedDragItem(item), { idPrefix: "month" });
  const { toggleTask } = useStore();
  const isTask = item.sourceRef.type === "task";
  const card = <div
    ref={drag.ref}
    {...drag.props}
    role="button"
    tabIndex={0}
    onClick={() => onOpen(item)}
    onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); onOpen(item); } }}
    className={cn("planner-month-item", compact && "planner-month-item--compact", item.done && "opacity-50", drag.className)}
  >
    {isTask ? <button type="button" className={cn("planner-month-item__checkbox", item.done && "planner-month-item__checkbox--done")} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); void toggleTask(item.sourceRef.id); }} aria-label={item.done ? `Mark ${item.title} not done` : `Mark ${item.title} done`} aria-pressed={!!item.done}>{item.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}</button> : <Icon className="h-3 w-3 shrink-0" style={{ color: item.color }} />}<span className={cn("truncate", item.done && "line-through")}>{item.time ? `${fmt12(item.time)} ` : ""}{item.title}</span>
  </div>;
  return item.cosmicEvent ? <CosmicEventHover event={item.cosmicEvent}>{card}</CosmicEventHover> : card;
}
