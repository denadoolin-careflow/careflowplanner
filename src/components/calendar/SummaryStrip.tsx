import { useMemo } from "react";
import { Link } from "react-router-dom";
import { addDays, differenceInCalendarDays, format, parseISO, setYear, isBefore } from "date-fns";
import { ArrowRight, CalendarClock, Cake, Sparkles, CalendarRange } from "lucide-react";
import { useStore, todayISO } from "@/lib/store";
import { cn } from "@/lib/utils";

function nextBirthday(iso: string): Date {
  const d = parseISO(iso);
  const now = new Date();
  const c = setYear(d, now.getFullYear());
  return isBefore(c, new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    ? setYear(d, now.getFullYear() + 1)
    : c;
}

function Card({
  title, icon: Icon, accent, to, children,
}: {
  title: string;
  icon: typeof CalendarClock;
  accent: string;
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group flex min-w-[200px] flex-col rounded-2xl border border-border/40 bg-card/70 p-3 transition-colors hover:border-primary/30 hover:bg-card snap-start"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5">
          <span className={cn("grid h-6 w-6 place-items-center rounded-lg", accent)}>
            <Icon className="h-3 w-3" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
        </div>
        <ArrowRight className="h-3 w-3 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="min-h-[44px]">{children}</div>
    </Link>
  );
}

/** Summary strip: Upcoming · Birthdays · Appointments · Holidays.
 *  Responsive: horizontal swipe on mobile, 2x2 on tablet, 4-col on desktop. */
export function SummaryStrip() {
  const { state } = useStore();
  const today = todayISO();
  const horizon = format(addDays(new Date(), 30), "yyyy-MM-dd");

  const upcomingCount = useMemo(() => {
    const appts = (state.appointments ?? []).filter(a => a.date >= today && a.date <= horizon).length;
    const tasks = (state.tasks ?? []).filter(t => !t.done && t.dueDate && t.dueDate >= today && t.dueDate <= horizon).length;
    return appts + tasks;
  }, [state.appointments, state.tasks, today, horizon]);

  const nextAppt = useMemo(
    () => (state.appointments ?? [])
      .filter(a => a.date >= today)
      .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))[0],
    [state.appointments, today],
  );

  const nextBday = useMemo(() => {
    const list = (state.birthdays ?? [])
      .map(b => ({ ...b, next: nextBirthday(b.date) }))
      .sort((a, b) => a.next.getTime() - b.next.getTime());
    return list[0];
  }, [state.birthdays]);

  const bdayCount = useMemo(
    () => (state.birthdays ?? []).filter(b => {
      const d = differenceInCalendarDays(nextBirthday(b.date), new Date());
      return d >= 0 && d <= 30;
    }).length,
    [state.birthdays],
  );

  const nextHol = useMemo(
    () => (state.holidays ?? [])
      .filter(h => h.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0],
    [state.holidays, today],
  );

  return (
    <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-4">
      <Card
        title="Upcoming"
        icon={CalendarRange}
        accent="bg-primary/15 text-primary"
        to="/upcoming"
      >
        <div className="text-lg font-display leading-tight">{upcomingCount}</div>
        <div className="text-[11px] text-muted-foreground">events in next 30 days</div>
      </Card>

      <Card
        title="Birthdays"
        icon={Cake}
        accent="bg-rose-500/15 text-rose-600 dark:text-rose-300"
        to="/calendar"
      >
        {nextBday ? (
          <>
            <div className="truncate text-sm font-medium">{nextBday.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {format(nextBday.next, "EEE MMM d")} · {bdayCount} this month
            </div>
          </>
        ) : (
          <div className="text-[11px] text-muted-foreground">No birthdays soon.</div>
        )}
      </Card>

      <Card
        title="Appointments"
        icon={CalendarClock}
        accent="bg-sky-500/15 text-sky-600 dark:text-sky-300"
        to="/calendar"
      >
        {nextAppt ? (
          <>
            <div className="truncate text-sm font-medium">{nextAppt.title}</div>
            <div className="text-[11px] text-muted-foreground">
              {format(parseISO(nextAppt.date), "EEE MMM d")}{nextAppt.time ? ` · ${nextAppt.time}` : ""}
            </div>
          </>
        ) : (
          <div className="text-[11px] text-muted-foreground">No appointments coming up.</div>
        )}
      </Card>

      <Card
        title="Holidays"
        icon={Sparkles}
        accent="bg-amber-500/15 text-amber-600 dark:text-amber-300"
        to="/calendar"
      >
        {nextHol ? (
          <>
            <div className="truncate text-sm font-medium">{nextHol.name}</div>
            <div className="text-[11px] text-muted-foreground">
              in {Math.max(0, differenceInCalendarDays(parseISO(nextHol.date), new Date()))} days · {format(parseISO(nextHol.date), "MMM d")}
            </div>
          </>
        ) : (
          <div className="text-[11px] text-muted-foreground">No holidays on the horizon.</div>
        )}
      </Card>
    </div>
  );
}