import { useMemo, useState } from "react";
import { addDays, format, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { useStore } from "@/lib/store";
import { openTaskEditor } from "@/lib/open-task-editor";
import { useNavigate } from "react-router-dom";
import { apptOccursOn } from "@/lib/appointment-range";
import {
  Sun, CalendarRange, Inbox as InboxIcon, ChevronDown, Calendar as CalendarIcon,
  Cake, PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

const STORAGE_KEY = "careflow:inbox-overview";

type OpenMap = { today: boolean; upcoming: boolean; needs: boolean };
const DEFAULT_OPEN: OpenMap = { today: true, upcoming: true, needs: true };

function readOpen(): OpenMap {
  if (typeof window === "undefined") return DEFAULT_OPEN;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_OPEN;
    return { ...DEFAULT_OPEN, ...(JSON.parse(raw) as Partial<OpenMap>) };
  } catch { return DEFAULT_OPEN; }
}

/** Compact event line shared by Today + Upcoming buckets. */
function EventLine({
  title, time, kind, onClick,
}: { title: string; time: string; kind: "task" | "appointment" | "birthday" | "holiday"; onClick?: () => void }) {
  const Icon = kind === "appointment" ? CalendarIcon
    : kind === "birthday" ? Cake
    : kind === "holiday" ? PartyPopper
    : InboxIcon;
  const tone =
    kind === "appointment" ? "text-primary"
    : kind === "birthday" ? "text-rose-500"
    : kind === "holiday" ? "text-amber-600"
    : "text-muted-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/60"
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", tone)} />
      <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{title}</span>
      <span className="shrink-0 text-[10.5px] text-muted-foreground">{time}</span>
    </button>
  );
}

function SectionShell({
  icon, title, count, open, onToggle, accent, children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/40 p-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2"
      >
        <span className={cn("grid h-7 w-7 place-items-center rounded-full ring-1", accent)}>{icon}</span>
        <span className="font-display text-[14px] font-medium tracking-tight text-foreground">{title}</span>
        <span className="ml-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">{count}</span>
        <ChevronDown className={cn("ml-auto h-4 w-4 text-muted-foreground transition-transform", open ? "rotate-0" : "-rotate-90")} />
      </button>
      {open && (
        <div className="mt-2 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

export function InboxOverview() {
  const { state, updateTask } = useStore() as any;
  const navigate = useNavigate();
  const [openMap, setOpenMap] = useState<OpenMap>(() => readOpen());

  const persist = (next: OpenMap) => {
    setOpenMap(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const today = startOfDay(new Date());
  const todayISO = format(today, "yyyy-MM-dd");
  const weekEnd = addDays(today, 7);

  const data = useMemo(() => {
    const tasksToday: Task[] = [];
    const tasksUpcoming: { date: string; t: Task }[] = [];
    const needs: Task[] = [];
    for (const t of state.tasks as Task[]) {
      if (t.done || t.parentTaskId || t.status === "parked") continue;
      if (!t.dueDate) {
        if (t.inbox) needs.push(t);
        continue;
      }
      if (t.dueDate === todayISO) tasksToday.push(t);
      else {
        const d = parseISO(t.dueDate);
        if (isWithinInterval(d, { start: addDays(today, 1), end: weekEnd })) {
          tasksUpcoming.push({ date: t.dueDate, t });
        }
      }
    }
    const apptsToday = (state.appointments ?? []).filter((a: any) => apptOccursOn(a, todayISO));
    const apptsUpcoming = (state.appointments ?? []).filter((a: any) => {
      if (!a.date) return false;
      const d = parseISO(a.date);
      return isWithinInterval(d, { start: addDays(today, 1), end: weekEnd });
    });
    const bdaysUpcoming = (state.birthdays ?? []).filter((b: any) => {
      // Birthdays often store MM-DD; treat the next occurrence within the week.
      if (!b?.date) return false;
      try {
        const md = String(b.date).slice(5, 10);
        for (let i = 0; i <= 7; i++) {
          const d = addDays(today, i);
          if (format(d, "MM-dd") === md) return true;
        }
      } catch {}
      return false;
    });
    const holidaysUpcoming = (state.holidays ?? []).filter((h: any) => {
      if (!h?.date) return false;
      try {
        const d = parseISO(h.date);
        return isWithinInterval(d, { start: today, end: weekEnd });
      } catch { return false; }
    });
    return {
      tasksToday,
      apptsToday,
      tasksUpcoming,
      apptsUpcoming,
      bdaysUpcoming,
      holidaysUpcoming,
      needs,
    };
  }, [state.tasks, state.appointments, state.birthdays, state.holidays, todayISO, today, weekEnd]);

  const todayCount = data.tasksToday.length + data.apptsToday.length;
  const upcomingCount =
    data.tasksUpcoming.length + data.apptsUpcoming.length +
    data.bdaysUpcoming.length + data.holidaysUpcoming.length;
  const needsCount = data.needs.length;

  if (todayCount + upcomingCount + needsCount === 0) return null;

  return (
    <section className="grid gap-3 rounded-[24px] border border-border/50 bg-card/60 p-4 backdrop-blur-md md:p-5 lg:grid-cols-3">
      <SectionShell
        icon={<Sun className="h-3.5 w-3.5 text-amber-600" />}
        title="Today"
        count={todayCount}
        open={openMap.today}
        onToggle={() => persist({ ...openMap, today: !openMap.today })}
        accent="bg-amber-50/70 ring-amber-100 dark:bg-amber-500/10 dark:ring-amber-500/20"
      >
        {data.apptsToday.map((a: any) => (
          <EventLine
            key={`appt-${a.id}`}
            title={a.title}
            time={a.time ?? "All day"}
            kind="appointment"
            onClick={() => navigate(`/calendar?date=${todayISO}`)}
          />
        ))}
        {data.tasksToday.map((t) => (
          <EventLine
            key={`t-${t.id}`}
            title={t.title}
            time={t.startTime ?? t.dayPart ?? "Today"}
            kind="task"
            onClick={() => openTaskEditor(t.id)}
          />
        ))}
        {todayCount === 0 && (
          <p className="px-2 py-1 text-[12px] text-muted-foreground">Nothing scheduled for today — breathe.</p>
        )}
      </SectionShell>

      <SectionShell
        icon={<CalendarRange className="h-3.5 w-3.5 text-emerald-700" />}
        title="Upcoming"
        count={upcomingCount}
        open={openMap.upcoming}
        onToggle={() => persist({ ...openMap, upcoming: !openMap.upcoming })}
        accent="bg-emerald-50/70 ring-emerald-100 dark:bg-emerald-500/10 dark:ring-emerald-500/20"
      >
        {data.apptsUpcoming.slice(0, 6).map((a: any) => (
          <EventLine
            key={`uappt-${a.id}`}
            title={a.title}
            time={format(parseISO(a.date), "EEE MMM d")}
            kind="appointment"
            onClick={() => navigate(`/calendar?date=${a.date}`)}
          />
        ))}
        {data.tasksUpcoming.slice(0, 6).map(({ t }) => (
          <EventLine
            key={`ut-${t.id}`}
            title={t.title}
            time={format(parseISO(t.dueDate!), "EEE MMM d")}
            kind="task"
            onClick={() => openTaskEditor(t.id)}
          />
        ))}
        {data.bdaysUpcoming.slice(0, 3).map((b: any) => (
          <EventLine
            key={`bday-${b.id}`}
            title={`${b.name ?? "Birthday"}`}
            time={(() => { try { return format(parseISO(b.date), "MMM d"); } catch { return ""; } })()}
            kind="birthday"
            onClick={() => navigate(`/seasons/holidays`)}
          />
        ))}
        {data.holidaysUpcoming.slice(0, 3).map((h: any) => (
          <EventLine
            key={`hol-${h.id}`}
            title={h.name ?? "Holiday"}
            time={(() => { try { return format(parseISO(h.date), "EEE MMM d"); } catch { return ""; } })()}
            kind="holiday"
            onClick={() => navigate(`/seasons/holidays`)}
          />
        ))}
        {upcomingCount === 0 && (
          <p className="px-2 py-1 text-[12px] text-muted-foreground">No plans in the next seven days.</p>
        )}
      </SectionShell>

      <SectionShell
        icon={<InboxIcon className="h-3.5 w-3.5 text-primary" />}
        title="Needs scheduling"
        count={needsCount}
        open={openMap.needs}
        onToggle={() => persist({ ...openMap, needs: !openMap.needs })}
        accent="bg-primary/10 ring-primary/20"
      >
        {data.needs.slice(0, 8).map((t) => (
          <EventLine
            key={`n-${t.id}`}
            title={t.title}
            time={t.area ?? "Inbox"}
            kind="task"
            onClick={() => openTaskEditor(t.id)}
          />
        ))}
        {needsCount > 8 && (
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("inbox-held");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-[11.5px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            View all {needsCount} →
          </button>
        )}
        {needsCount === 0 && (
          <p className="px-2 py-1 text-[12px] text-muted-foreground">Inbox is clear of unscheduled items.</p>
        )}
      </SectionShell>
    </section>
  );
}
