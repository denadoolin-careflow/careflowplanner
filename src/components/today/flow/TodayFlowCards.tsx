import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, BookOpen, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { addDays, format, isSameDay } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { PhaseIcon } from "@/lib/phase-icons";
import { HORIZONS, HORIZON_LABEL, PHASE_LABEL, phaseFor } from "@/lib/rhythm/horizons";
import { TwinRingsWidget } from "@/components/cycle/TwinRingsWidget";
import { TodayNotebookPane } from "@/components/inbox/TodayNotebookPane";
import { useTodayNotebook } from "@/hooks/useTodayNotebook";
import { cn } from "@/lib/utils";

export const flowCard = "rounded-[20px] bg-card p-4 shadow-soft";

/** Twin rings plus where you are in each of the five timeframes. */
export function RhythmsCard({ date }: { date: Date }) {
  return (
    <section aria-labelledby="today-rhythms-h" className={cn(flowCard, "space-y-3")}>
      <h2 id="today-rhythms-h" className="font-display text-lg text-foreground">Your rhythms</h2>
      <TwinRingsWidget date={date} />
      <ul className="divide-y divide-border/50">
        {HORIZONS.map(h => {
          const p = phaseFor(h, h === "day" ? new Date() : date);
          return (
            <li key={h}>
              <Link to={`/planner?range=rhythm&horizon=${h}`}
                className="flex min-h-11 items-center gap-3 rounded-lg px-1 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="w-16 text-muted-foreground">{HORIZON_LABEL[h]}</span>
                <PhaseIcon phase={p} size="sm" />
                <span className="font-semibold" style={{ color: `hsl(var(--rhythm-${p}-deep))` }}>{PHASE_LABEL[p]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link to="/health" className="flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline">Edit cycle dates</Link>
    </section>
  );
}

/** Today's daily note, editable right on the Today page. */
export function TodayNotebookCard() {
  const notebook = useTodayNotebook();
  return (
    <section aria-labelledby="today-notebook-h" className={cn(flowCard, "space-y-2")}>
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" aria-hidden />
        <h2 id="today-notebook-h" className="flex-1 font-display text-lg text-foreground">Today's notebook</h2>
        <Link to="/notes" aria-label="Open notes" className="grid h-11 w-11 place-items-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ExternalLink className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <TodayNotebookPane notebook={notebook} />
    </section>
  );
}

/** One tinted row: first reminder visible, "+N more" expands the rest. Hidden when empty. */
export function ReminderRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const update = () => setCount(Array.from(el.children).filter(c => (c as HTMLElement).offsetHeight > 0 || c.childElementCount > 0).length);
    update();
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  return (
    <section aria-label="Gentle reminders" className={cn("rounded-[20px] p-2 shadow-soft", count === 0 && "hidden")}
      style={{ background: "hsl(var(--rhythm-grow-tint))" }}>
      <div ref={ref} className={cn("space-y-2", !open && "[&>*:not(:first-child)]:hidden")}>{children}</div>
      {count > 1 && (
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
          className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ color: "hsl(var(--rhythm-grow-deep))" }}>
          <Bell className="h-4 w-4" aria-hidden />
          <span className="flex-1 text-left">{open ? "Show less" : `+${count - 1} more`}</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      )}
    </section>
  );
}

/** Slim sticky day header: weekday line, big date, prev/next and one calendar menu (date, layout, scope). */
export function SlimDayHeader({ date, onDate, view, onView, labels }: {
  date: Date; onDate: (d: Date) => void; view: string; onView: (v: string) => void; labels: Record<string, string>;
}) {
  const isToday = isSameDay(date, new Date());
  const btn = "grid h-11 w-11 place-items-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <header className="sticky top-0 z-20 -mx-1 flex items-center gap-1 rounded-b-[20px] bg-background/90 px-1 py-1 backdrop-blur">
      <div className="min-w-0 flex-1 px-1">
        <p className="text-xs text-muted-foreground">{format(date, "EEEE")}{isToday ? " · Today" : ""}</p>
        <p className="font-display text-2xl leading-tight text-foreground">{format(date, "MMMM d")}</p>
      </div>
      <button type="button" className={btn} aria-label="Previous day" onClick={() => onDate(addDays(date, -1))}><ChevronLeft className="h-5 w-5" aria-hidden /></button>
      <button type="button" className={btn} aria-label="Next day" onClick={() => onDate(addDays(date, 1))}><ChevronRight className="h-5 w-5" aria-hidden /></button>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={cn(btn, "bg-card shadow-soft")} aria-label="Choose date, layout and view"><CalendarDays className="h-5 w-5" aria-hidden /></button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))] space-y-3 p-3">
          <Calendar mode="single" selected={date} onSelect={(d) => d && onDate(d)} initialFocus />
          {!isToday && <Button variant="outline" className="h-11 w-full rounded-full" onClick={() => onDate(new Date())}>Back to today</Button>}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Layout</p>
            <div role="radiogroup" aria-label="Day layout" className="grid grid-cols-2 gap-1">
              {Object.entries(labels).map(([k, l]) => (
                <button key={k} type="button" role="radio" aria-checked={view === k} onClick={() => onView(k)}
                  className={cn("min-h-11 rounded-xl px-2 text-sm", view === k ? "bg-primary/15 font-semibold text-primary" : "text-foreground hover:bg-muted")}>{l}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">View</p>
            <div className="grid grid-cols-3 gap-1">
              {[["Day", `/planner/${format(date, "yyyy-MM-dd")}`], ["Week", "/planner?range=week"], ["Month", "/planner?range=month"]].map(([l, to]) => (
                <Link key={l} to={to} className="grid min-h-11 place-items-center rounded-xl text-sm hover:bg-muted">{l}</Link>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </header>
  );
}
