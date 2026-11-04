import { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ChevronRight, CloudSun, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useWeatherSnapshot, formatTemp } from "@/lib/weather-store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import { DashboardTabs } from "@/components/shared/DashboardTabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { dayMoon } from "@/components/planner/schedule/day-moon";
import { useSchedData } from "@/components/planner/schedule/ScheduleStyles";
import { NowPhaseCard, PhaseDayCard } from "@/components/dashboard/DayPhases";
import { ProgressRing, PhasePill, SlimHeader } from "@/components/projects/ProgressRing";
import { PHASE_ORDER } from "@/lib/today-phase-items";
import { parseTaskInput } from "@/lib/nlp-task";
import { projectDue, projectPhase, projectProgress } from "@/lib/projects/phase";
import type { Area } from "@/lib/types";

function greeting(d: Date) { const h = d.getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; }

export default function Dashboard() {
  const { state, user, addTask } = useStore() as any;
  useEnsureWeather();
  const weather = useWeatherSnapshot();
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const iso = format(today, "yyyy-MM-dd");
  const sched = useSchedData(today, () => navigate("/planner"));
  const nowPhase = sched.nowPhase ?? "plan";
  const nowIdx = PHASE_ORDER.indexOf(nowPhase);
  const byPhase = (p: string) => sched.day.filter(i => i.phase === p);
  const doneCount = sched.day.filter(i => i.done).length;
  const moon = dayMoon(today);
  const name = String(user?.user_metadata?.full_name ?? user?.user_metadata?.first_name ?? "").split(" ")[0];

  const tasks = state.tasks as any[];
  const inboxCount = tasks.filter(t => t.inbox && !t.done && !t.parentTaskId && t.status !== "parked").length;
  const counts = {
    anytime: tasks.filter(t => !t.done && !t.dueDate && !t.inbox && !t.parentTaskId && (!t.status || t.status === "active")).length,
    someday: tasks.filter(t => !t.done && t.status === "someday").length,
    notToday: tasks.filter(t => !t.done && !t.parentTaskId && t.status === "parked").length,
  };
  const inMotion = (state.projects ?? [])
    .filter((p: any) => !p.archivedAt && ["grow", "care"].includes(projectPhase(p)))
    .sort((a: any, b: any) => (projectDue(a) ?? "9999").localeCompare(projectDue(b) ?? "9999"))
    .slice(0, 3);

  const [capture, setCapture] = useState("");
  const saveCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = capture.trim(); if (!raw) return;
    const p = parseTaskInput(raw);
    await addTask({ title: p.title || raw, dueDate: p.dueDate, area: p.area as Area | undefined, energy: p.energy, tags: p.tags, estMinutes: p.estMinutes, inbox: true });
    setCapture("");
    toast.success("Caught it ✨", { description: "Safely held in your inbox." });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <SlimHeader
        title={`${greeting(today)}${name ? `, ${name}` : ""}`}
        subtitle={<>
          <span>{format(today, "EEE, MMM d")}</span><span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1"><MoonGlyph date={today} size={14} />{moon.label}</span>
          {weather && <><span aria-hidden>·</span><span className="inline-flex items-center gap-1"><CloudSun className="h-4 w-4" aria-hidden />{formatTemp(weather.tempC)}</span></>}
        </>}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="More tools" className="grid h-11 w-11 place-items-center rounded-full hover:bg-muted"><MoreHorizontal className="h-5 w-5" /></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => navigate("/calendar")}>Calendar</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("/upcoming")}>Upcoming</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("/inbox")}>Inbox</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("/focus")}>Focus timer</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("/projects")}>Projects</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <DashboardTabs />

      <NowPhaseCard phase={nowPhase} items={byPhase(nowPhase)} toggle={sched.toggle} />

      <form onSubmit={saveCapture} className="planner-card flex items-center gap-2 p-3">
        <input value={capture} onChange={e => setCapture(e.target.value)} aria-label="Capture to Inbox" placeholder={`Capture anything… "call mom 3:30"`}
          className="h-11 min-w-0 flex-1 rounded-full bg-background px-4 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-primary" />
        <Link to="/inbox" className="inline-flex min-h-[44px] shrink-0 items-center rounded-full bg-muted px-4 text-sm font-semibold">Inbox · {inboxCount}</Link>
      </form>

      <section className="planner-card p-4">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="font-display text-xl">Your day in four phases</h2>
          <span className="text-sm text-muted-foreground" aria-live="polite">{doneCount} of {sched.day.length} done</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PHASE_ORDER.map((p, i) => (
            <PhaseDayCard key={p} phase={p} items={byPhase(p)} now={p === nowPhase} past={i < nowIdx}
              toggle={sched.toggle} onAdd={t => sched.add(p, t, iso)} />
          ))}
        </div>
      </section>

      <section className="planner-card p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-xl">Projects in motion</h2>
          <Link to="/projects" className="inline-flex min-h-[44px] items-center gap-0.5 text-sm font-semibold text-primary">All projects<ChevronRight className="h-4 w-4" /></Link>
        </div>
        {inMotion.length === 0 ? <p className="text-sm text-muted-foreground">No projects growing right now.</p> : (
          <ul className="space-y-2">
            {inMotion.map((p: any) => {
              const ph = projectPhase(p); const pr = projectProgress(p.id, tasks); const due = projectDue(p);
              return (
                <li key={p.id}>
                  <Link to={`/projects/${p.id}`} className="flex min-h-[56px] items-center gap-3 rounded-2xl bg-card px-3 py-2 ring-1 ring-border/60">
                    <ProgressRing pct={pr.pct} phase={ph} />
                    <span className="min-w-0 flex-1">
                      <span className="block break-words font-semibold">{p.name}</span>
                      {pr.next && <span className="block break-words text-sm text-muted-foreground">Next: {pr.next.title}</span>}
                    </span>
                    {due && <PhasePill phase={ph}>{format(new Date(`${due}T00:00`), "MMM d")}</PhasePill>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="planner-card p-4">
        <h2 className="mb-3 font-display text-xl">Go to</h2>
        <nav aria-label="Planner views" className="grid grid-cols-4 rounded-full bg-muted p-1">
          {[["Day", "/planner"], ["Week", "/week"], ["Month", "/month"], ["Year", "/year"]].map(([l, to]) => (
            <NavLink key={to} to={to} className="grid min-h-[44px] place-items-center rounded-full text-sm font-semibold text-muted-foreground hover:bg-card hover:text-foreground">{l}</NavLink>
          ))}
        </nav>
        <div className="mt-3 flex flex-wrap gap-2">
          {[["Anytime", "/anytime", counts.anytime], ["Someday", "/someday", counts.someday], ["Not today", "/not-today", counts.notToday], ["Logbook", "/logbook", null]].map(([l, to, n]) => (
            <Link key={to as string} to={to as string} className="inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold ring-1 ring-border hover:bg-muted">
              {l as string}{n != null ? ` · ${n}` : ""}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
