import { useEffect, useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { Check, LayoutGrid, List, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { usePlannerFeed, type PlannerFeedItem } from "@/lib/planner/feed";
import { KIND_ICONS } from "./kindIcon";
import { usePlannerItemOpener } from "./PlannerItemOpener";
import { useCycleDots } from "@/lib/planner/day-rhythm";
import { useIsMobile } from "@/hooks/use-mobile";
import { ViewPills } from "@/components/layout/ViewPills";
import { useTouchDrag } from "@/lib/planner/touch-drag";
import { DailyNoteDot } from "@/components/notes/DailyNoteDot";
import { useDailyNoteMarks } from "@/lib/notes/daily";
import { CapacityIndicator, PlannerMonthSummary } from "./PlannerMonthSummary";
import { PlannerMonthFilters } from "./PlannerMonthFilters";
import { dayLoad, useMonthMove } from "@/lib/planner/month-move";
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
  const move = useMonthMove(byDay);
  const { open: openItem, dialogs } = usePlannerItemOpener();
  const handleOpen = (item: PlannerFeedItem) => onOpenItem ? onOpenItem(item) : openItem(item);
  const cycles = useCycleDots(days);
  const noteMarks = useDailyNoteMarks(days.map(day => format(day, "yyyy-MM-dd")));
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<MobileMonthView>(readMobileView);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const today = new Date();
  const selectedKey = format(selectedDate ?? date, "yyyy-MM-dd");
  const weekLoads = useMemo(() => Array.from({ length: Math.ceil(total / 7) }, (_, week) => {
    const rows = days.slice(week * 7, week * 7 + 7).flatMap(day => byDay.get(format(day, "yyyy-MM-dd")) ?? []);
    return Math.round(dayLoad(rows) / 7);
  }), [byDay, days, total]);
  const touch = useTouchDrag((payload, targetISO) => move.requestMove(payload.type, payload.id, targetISO));

  useEffect(() => { try { localStorage.setItem(MOBILE_VIEW_KEY, mobileView); } catch { /* no-op */ } }, [mobileView]);

  const onDrop = (targetISO: string, event: React.DragEvent) => {
    event.preventDefault(); setDragOver(null);
    const raw = event.dataTransfer.getData("application/x-planner-item") || event.dataTransfer.getData("text/plain");
    const split = raw.indexOf(":");
    if (split < 1) return;
    move.requestMove(raw.slice(0, split), raw.slice(split + 1), targetISO);
  };

  if (isMobile && mobileView === "list") return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2"><PlannerMonthFilters /><ViewPills items={MOBILE_VIEW_ITEMS} value={mobileView} onChange={value => setMobileView(value as MobileMonthView)} ariaLabel="Month layout" /></div>
      <div className="space-y-2">
        {days.filter(day => isSameMonth(day, date)).map(day => {
          const key = format(day, "yyyy-MM-dd"); const rows = byDay.get(key) ?? [];
          return <section key={key} data-drop-day={key} className={cn("planner-month-list-day", key === selectedKey && "planner-month-list-day--selected", touch.overDay === key && "ring-2 ring-primary/50")}>
            <button type="button" onClick={() => onSelectDay(day)} className="flex min-h-11 w-full items-center justify-between gap-3 text-left"><span className="font-display text-base font-semibold">{format(day, "EEEE, MMM d")}</span><CapacityIndicator minutes={dayLoad(rows)} /></button>
            {rows.length ? <div>{rows.map(item => <MonthItem key={item.id} item={item} onOpen={handleOpen} handlers={touch.handlers({ type: item.sourceRef.type, id: item.sourceRef.id, label: item.title })} />)}</div> : <p className="pb-2 text-xs text-muted-foreground">Space to breathe.</p>}
          </section>;
        })}
      </div>
      {touch.ghost && <DragGhost {...touch.ghost} />}{dialogs}<CapacityWarning pending={move.pending} onCancel={move.cancel} onConfirm={move.confirm} />
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
            const visible = rows.slice(0, 3);
            const dim = !isSameMonth(day, date);
            const current = isSameDay(day, today);
            const selected = key === selectedKey;
            const tasks = rows.filter(row => row.sourceRef.type === "task");
            const completed = tasks.filter(row => row.done).length;
            const cycle = cycles.get(key);
            return <article key={key} data-drop-day={key} onDragOver={event => { event.preventDefault(); setDragOver(key); }} onDragLeave={() => setDragOver(value => value === key ? null : value)} onDrop={event => onDrop(key, event)} className={cn("planner-month-day", dim && "planner-month-day--dim", selected && "planner-month-day--selected", current && "planner-month-day--today", (dragOver === key || touch.overDay === key) && "planner-month-day--drop")}>
              <button type="button" onClick={() => onSelectDay(day)} className="planner-month-day__header" aria-label={`Select ${format(day, "EEEE, MMMM d")}${rows.length ? `, ${rows.length} planned` : ""}`}>
                <span className="planner-month-day__number">{format(day, "d")}</span>{current && <span className="planner-month-day__today-label">Today</span>}
                <span className="ml-auto flex items-center gap-1"><DailyNoteDot date={day} mark={noteMarks.get(key)} size={11} />{cycle && <span className="h-1.5 w-1.5 rounded-full bg-calendar-cosmic" title={cycle.text} />}</span>
              </button>
              <div className="planner-month-day__capacity"><CapacityIndicator minutes={dayLoad(rows)} compact={!isMobile} />{!isMobile && tasks.length > 0 && <span className="text-[9px] text-muted-foreground">{completed}/{tasks.length}</span>}</div>
              {isMobile && mobileView === "dots" ? <button type="button" onClick={() => onSelectDay(day)} className="planner-month-day__dots">{rows.slice(0, 5).map(item => <span key={item.id} className={cn("h-1.5 w-1.5 rounded-full", item.done && "opacity-35")} style={{ backgroundColor: item.color }} />)}{rows.length > 5 && <span className="text-[8px] text-muted-foreground">+{rows.length - 5}</span>}</button> : <div className="planner-month-day__items">{visible.map(item => <MonthItem key={item.id} item={item} onOpen={handleOpen} compact={isMobile} handlers={touch.handlers({ type: item.sourceRef.type, id: item.sourceRef.id, label: item.title })} />)}{rows.length > visible.length && <button type="button" onClick={() => onSelectDay(day)} className="planner-month-more">+{rows.length - visible.length} more</button>}</div>}
            </article>;
          })}
        </div>
      </div>
      {touch.ghost && <DragGhost {...touch.ghost} />}{dialogs}<CapacityWarning pending={move.pending} onCancel={move.cancel} onConfirm={move.confirm} />
    </div>
  );
}

function MonthItem({ item, onOpen, handlers, compact }: { item: PlannerFeedItem; onOpen: (item: PlannerFeedItem) => void; handlers: ReturnType<ReturnType<typeof useTouchDrag>["handlers"]>; compact?: boolean }) {
  const Icon = KIND_ICONS[item.kind];
  const draggable = ["task", "appointment", "meal"].includes(item.sourceRef.type);
  return <button type="button" draggable={draggable} onDragStart={event => { event.dataTransfer.setData("application/x-planner-item", `${item.sourceRef.type}:${item.sourceRef.id}`); event.dataTransfer.effectAllowed = "move"; }} onClick={() => onOpen(item)} {...handlers} className={cn("planner-month-item", compact && "planner-month-item--compact", item.done && "opacity-50")}>
    {item.done ? <Check className="h-3 w-3 shrink-0" /> : <Icon className="h-3 w-3 shrink-0" style={{ color: item.color }} />}<span className="truncate">{item.time ? `${fmt12(item.time)} ` : ""}{item.title}</span>
  </button>;
}

function DragGhost({ label, x, y }: { label: string; x: number; y: number }) { return <div aria-hidden className="planner-drag-ghost" style={{ left: x + 14, top: y - 16 }}>{label}</div>; }

function CapacityWarning({ pending, onCancel, onConfirm }: { pending: ReturnType<typeof useMonthMove>["pending"]; onCancel: () => void; onConfirm: () => void }) {
  return <AlertDialog open={!!pending} onOpenChange={open => !open && onCancel()}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>This day is already quite full</AlertDialogTitle><AlertDialogDescription>{pending ? `${format(new Date(`${pending.targetISO}T12:00:00`), "EEEE, MMMM d")} is holding several commitments. You can still move “${pending.item.title}” here, or choose a lighter day.` : ""}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={onCancel}>Choose another day</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>Move anyway</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
