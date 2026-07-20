import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { useWeatherSnapshot, formatTemp } from "@/lib/weather-store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import { cn } from "@/lib/utils";
import { DashboardTabs } from "@/components/shared/DashboardTabs";
import {
  Inbox as InboxIcon, CalendarDays, CalendarRange, CalendarClock, Calendar,
  ListTodo, LayoutList, Clock, Moon, Archive, FolderKanban, BookMarked,
  ChevronRight, Play, CloudSun, ArrowRight, Sparkles,
} from "lucide-react";

type AgendaItem = {
  id: string;
  time: string;      // display
  sortKey: string;   // ISO for sorting
  label: string;
  category: string;
};

function useAgenda(): AgendaItem[] {
  const { state } = useStore();
  return useMemo(() => {
    const now = new Date();
    const items: AgendaItem[] = [];

    for (const a of state.appointments) {
      if (!a.date) continue;
      const t = a.time ?? "00:00";
      const dt = new Date(`${a.date}T${t}`);
      if (isNaN(dt.getTime()) || dt.getTime() < now.getTime()) continue;
      items.push({
        id: `a-${a.id}`,
        time: a.allDay || !a.time ? "All day" : format(dt, "h:mm a"),
        sortKey: dt.toISOString(),
        label: a.title,
        category: a.areaName ?? a.type ?? "Event",
      });
    }

    for (const t of state.tasks) {
      if (t.done || !t.dueDate || !t.startTime) continue;
      const dt = new Date(`${t.dueDate}T${t.startTime}`);
      if (isNaN(dt.getTime()) || dt.getTime() < now.getTime()) continue;
      items.push({
        id: `t-${t.id}`,
        time: format(dt, "h:mm a"),
        sortKey: dt.toISOString(),
        label: t.title,
        category: t.area ?? "Task",
      });
    }

    items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return items.slice(0, 3);
  }, [state.appointments, state.tasks]);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </h2>
  );
}

const PLANNING_VIEWS = [
  { to: "/planner",  icon: ListTodo,      title: "Planner",   desc: "Drag tasks onto the day" },
  { to: "/week",     icon: CalendarRange, title: "Week",      desc: "This week at a glance" },
  { to: "/month",    icon: CalendarDays,  title: "Month",     desc: "Broader monthly view" },
  { to: "/year",     icon: Calendar,      title: "Year",      desc: "Long-arc rhythm & seasons" },
  { to: "/calendar", icon: CalendarClock, title: "Calendar",  desc: "Timeline & appointments" },
  { to: "/upcoming", icon: LayoutList,    title: "Upcoming",  desc: "What's around the corner" },
];

const NOT_RIGHT_NOW = [
  { to: "/anytime",   icon: Clock,   title: "Anytime",    subtitle: "Loose things without a date" },
  { to: "/someday",   icon: Moon,    title: "Someday",    subtitle: "Dreams and later ideas" },
  { to: "/not-today", icon: Archive, title: "Not Today",  subtitle: "Deferred from today's plan" },
];

const REVIEW = [
  { to: "/logbook",  icon: BookMarked,   title: "Logbook",  subtitle: "Everything you've completed" },
  { to: "/projects", icon: FolderKanban, title: "Projects", subtitle: "Ongoing work with milestones" },
];

export default function Dashboard() {
  const { state } = useStore();
  useEnsureWeather();
  const weather = useWeatherSnapshot();
  const agenda = useAgenda();
  const navigate = useNavigate();
  const today = new Date();

  const inboxCount = state.tasks.filter(
    (t) => t.inbox && !t.done && !t.parentTaskId && t.status !== "parked",
  ).length;

  return (
    <div className="space-y-8">
      <DashboardTabs />
      {/* ============ HERO ============ */}
      <section
        aria-label="Today's agenda preview"
        className="relative overflow-hidden rounded-3xl p-6 text-white shadow-soft sm:p-8"
        style={{ background: "var(--gradient-seasonal)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/25"
        />
        <div className="relative flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">
                {format(today, "EEEE, MMMM d")}
              </p>
              <h1 className="mt-1 font-display text-3xl font-semibold leading-tight sm:text-4xl">
                Your day, at a glance
              </h1>
            </div>
            {weather ? (
              <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-sm backdrop-blur-sm ring-1 ring-white/20">
                <CloudSun className="h-5 w-5" />
                <div className="leading-tight">
                  <div className="font-display text-lg font-semibold tabular-nums">
                    {formatTemp(weather.tempC)}
                  </div>
                  <div className="text-[11px] text-white/85">{weather.conditionLabel}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-xs text-white/80 backdrop-blur-sm ring-1 ring-white/15">
                <CloudSun className="h-4 w-4" />
                Weather loading…
              </div>
            )}
          </div>

          {/* Next 3 scheduled items */}
          <ul className="space-y-2">
            {agenda.length === 0 ? (
              <li className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/85 backdrop-blur-sm ring-1 ring-white/15">
                <Sparkles className="mr-2 inline h-4 w-4" />
                Nothing scheduled next — a clear stretch ahead.
              </li>
            ) : (
              agenda.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl bg-white/12 px-4 py-2.5 backdrop-blur-sm ring-1 ring-white/15"
                >
                  <span className="w-20 shrink-0 font-display text-sm font-semibold tabular-nums text-white/95">
                    {item.time}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
                  <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                    {item.category}
                  </span>
                </li>
              ))
            )}
          </ul>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => navigate("/planner")}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-white/95"
            >
              <ListTodo className="h-4 w-4" />
              Daily Plan
            </button>
            <button
              onClick={() => navigate("/focus")}
              className="inline-flex items-center gap-2 rounded-full bg-white/12 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur-sm transition hover:bg-white/20"
            >
              <Play className="h-4 w-4" />
              Start Focus
            </button>
          </div>
        </div>
      </section>

      {/* ============ INBOX ROW ============ */}
      <Link
        to="/inbox"
        className="group flex items-center gap-4 rounded-2xl bg-card px-5 py-4 ring-1 ring-border shadow-soft transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <InboxIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold leading-tight">Inbox</p>
          <p className="text-xs text-muted-foreground">
            Capture anything — sort it later
          </p>
        </div>
        {inboxCount > 0 && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {inboxCount}
          </span>
        )}
        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
      </Link>

      {/* ============ PLANNING VIEWS ============ */}
      <section>
        <SectionLabel>Planning Views</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PLANNING_VIEWS.map(({ to, icon: Icon, title, desc }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-border shadow-soft transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary/60 text-secondary-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold leading-tight">{title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>

      {/* ============ NOT RIGHT NOW ============ */}
      <SettingsList label="Not Right Now" items={NOT_RIGHT_NOW} />

      {/* ============ REVIEW ============ */}
      <SettingsList label="Review" items={REVIEW} />
    </div>
  );
}

function SettingsList({
  label,
  items,
}: {
  label: string;
  items: { to: string; icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string }[];
}) {
  return (
    <section>
      <SectionLabel>{label}</SectionLabel>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-border shadow-soft">
        {items.map(({ to, icon: Icon, title, subtitle }, i) => (
          <li key={to}>
            <Link
              to={to}
              className={cn(
                "group flex items-center gap-3 px-4 py-3 transition hover:bg-muted/40",
                i === 0 && "rounded-t-2xl",
                i === items.length - 1 && "rounded-b-2xl",
              )}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground/80">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">{title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
