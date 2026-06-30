import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Progress } from "@/components/ui/progress";
import { format, parseISO, startOfYear, endOfYear, addDays, getDay, differenceInCalendarDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { PlanningHeader } from "@/components/today/PlanningHeader";
import { QuickAddBar } from "@/components/today/QuickAddBar";
import { TaskEditor } from "@/components/tasks/TaskEditor";

export default function Year() {
  const { state } = useStore();
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const editingTask = editTaskId ? state.tasks.find(t => t.id === editTaskId) ?? null : null;
  const today = useMemo(() => new Date(), []);
  const months = Array.from({ length: 12 }, (_, i) => new Date(new Date().getFullYear(), i, 1));
  const quarters = [["Q1", [0,1,2]], ["Q2", [3,4,5]], ["Q3", [6,7,8]], ["Q4", [9,10,11]]] as const;
  const habitsAvg = state.habits.length ? Math.round(state.habits.reduce((s, h) => s + Math.min(100, h.streak * 5), 0) / state.habits.length) : 0;
  const goalsAvg = state.goals.length ? Math.round(state.goals.reduce((s, g) => s + g.progress, 0) / state.goals.length) : 0;

  const [tbDates, setTbDates] = useState<string[]>([]);
  const year = new Date().getFullYear();
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("time_blocks")
        .select("date")
        .gte("date", `${year}-01-01`)
        .lte("date", `${year}-12-31`);
      setTbDates((data ?? []).map((r: any) => r.date));
    })();
  }, [year]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    const bump = (k: string) => m.set(k, (m.get(k) ?? 0) + 1);
    state.tasks.forEach(t => {
      if (!t.done) return;
      const k = (t.lastCompletedAt ?? "").slice(0, 10) || t.dueDate;
      if (k && k.startsWith(String(year))) bump(k);
    });
    state.appointments.forEach(a => { if (a.date?.startsWith(String(year))) bump(a.date); });
    tbDates.forEach(d => bump(d));
    return m;
  }, [state.tasks, state.appointments, tbDates, year]);

  const max = Math.max(1, ...counts.values());
  const intensity = (n: number) => {
    if (!n) return 0;
    const r = n / max;
    if (r > 0.66) return 4;
    if (r > 0.33) return 3;
    if (r > 0.15) return 2;
    return 1;
  };
  const bgFor = (lvl: number) => {
    const a = [0, 0.12, 0.28, 0.5, 0.78][lvl];
    return lvl === 0 ? "hsl(var(--muted) / 0.5)" : `hsl(var(--primary) / ${a})`;
  };

  // Build columns of weeks. Start from first Sunday on/before Jan 1 so weeks align.
  const yStart = startOfYear(new Date(year, 0, 1));
  const yEnd = endOfYear(yStart);
  const gridStart = addDays(yStart, -getDay(yStart)); // back up to Sunday
  const totalDays = differenceInCalendarDays(yEnd, gridStart) + 1;
  const weeks = Math.ceil(totalDays / 7);
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const d = addDays(gridStart, w * 7);
    if (d.getMonth() !== lastMonth && d.getFullYear() === year) {
      monthLabels.push({ col: w, label: format(d, "MMM") });
      lastMonth = d.getMonth();
    }
  }

  return (
    <div className="space-y-6">
      <PlanningHeader
        date={today}
        title={`${today.getFullYear()}`}
        subtitle="Your greeting, weather, and cosmic rhythm — carried across each planning view."
        slot={<QuickAddBar date={today} />}
        onTaskClick={setEditTaskId}
      />
      <div className="cozy-card gradient-dawn p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Year</p>
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">{new Date().getFullYear()}</h2>
        <p className="mt-1 text-sm text-muted-foreground">A long, gentle horizon.</p>
      </div>

      <SectionCard title="Activity heatmap" subtitle={`${year} · tasks completed, appointments, time blocks`} accent="calm">
        <div className="overflow-x-auto">
          <div className="inline-block">
            <div className="ml-7 mb-1 grid" style={{ gridTemplateColumns: `repeat(${weeks}, 14px)`, columnGap: 2 }}>
              {Array.from({ length: weeks }, (_, w) => {
                const lbl = monthLabels.find(m => m.col === w);
                return <div key={w} className="text-[9px] text-muted-foreground">{lbl?.label ?? ""}</div>;
              })}
            </div>
            <div className="flex">
              <div className="mr-1 flex flex-col justify-between py-0.5 text-[9px] text-muted-foreground" style={{ height: 7 * 14 - 2 }}>
                <span>Sun</span><span>Wed</span><span>Sat</span>
              </div>
              <div className="grid" style={{ gridTemplateColumns: `repeat(${weeks}, 12px)`, gridAutoRows: 12, columnGap: 2, rowGap: 2 }}>
                {Array.from({ length: weeks * 7 }, (_, idx) => {
                  const w = Math.floor(idx / 7);
                  const dow = idx % 7;
                  const d = addDays(gridStart, w * 7 + dow);
                  const inYear = d.getFullYear() === year;
                  const iso = d.toISOString().slice(0, 10);
                  const n = counts.get(iso) ?? 0;
                  const lvl = intensity(n);
                  return (
                    <div
                      key={idx}
                      title={inYear ? `${iso}: ${n} item${n === 1 ? "" : "s"}` : ""}
                      className={cn("h-3 w-3 rounded-[3px]", !inYear && "opacity-0")}
                      style={{ gridColumn: w + 1, gridRow: dow + 1, background: bgFor(lvl) }}
                    />
                  );
                })}
              </div>
            </div>
            <div className="ml-7 mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span>Less</span>
              {[0,1,2,3,4].map(l => <span key={l} className="h-3 w-3 rounded-[3px]" style={{ background: bgFor(l) }} />)}
              <span>More</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {months.map(m => (
          <div key={m.toISOString()} className="cozy-card p-4">
            <div className="font-display text-lg font-semibold">{format(m, "MMMM")}</div>
            <div className="text-xs text-muted-foreground">
              {state.appointments.filter(a => parseISO(a.date).getMonth() === m.getMonth()).length} appts ·{" "}
              {state.birthdays.filter(b => parseISO(b.date).getMonth() === m.getMonth()).length} birthdays
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <SectionCard title="Goals by quarter" accent="calm">
          <div className="space-y-3">
            {quarters.map(([q]) => (
              <div key={q}>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{q}</div>
                <ul className="mt-1 space-y-1 text-sm">
                  {state.goals.filter(g => g.timeline === q).map(g => <li key={g.id} className="rounded-lg bg-muted/40 px-3 py-1.5">{g.title}</li>)}
                  {state.goals.filter(g => g.timeline === q).length === 0 && <li className="px-3 py-1.5 text-xs text-muted-foreground">— open —</li>}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Big family events" accent="warm">
          <ul className="space-y-1.5 text-sm">
            {[...state.birthdays.map(b => `🎂 ${b.name} · ${format(parseISO(b.date), "MMM d")}`),
              ...state.holidays.map(h => `✨ ${h.name} · ${format(parseISO(h.date), "MMM d")}`)]
              .slice(0, 8).map((s, i) => <li key={i} className="rounded-lg bg-muted/40 px-3 py-2">{s}</li>)}
          </ul>
        </SectionCard>

        <SectionCard title="Seasonal resets" accent="sage">
          <ul className="space-y-1.5 text-sm">
            <li className="rounded-lg bg-muted/40 px-3 py-2">Spring: closet swap, deep clean kitchen, donate outgrown</li>
            <li className="rounded-lg bg-muted/40 px-3 py-2">Summer: sunscreen + water-bottle station, slower mornings</li>
            <li className="rounded-lg bg-muted/40 px-3 py-2">Fall: school routines, soups in rotation, calendar refresh</li>
            <li className="rounded-lg bg-muted/40 px-3 py-2">Winter: cozy corners, holiday box, low-energy menus</li>
          </ul>
        </SectionCard>

        <SectionCard title="Progress summary" accent="calm">
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm"><span>Goals</span><span className="text-muted-foreground">{goalsAvg}%</span></div>
              <Progress value={goalsAvg} className="h-2" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm"><span>Habits</span><span className="text-muted-foreground">{habitsAvg}%</span></div>
              <Progress value={habitsAvg} className="h-2" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Yearly reflection prompts" accent="warm" className="md:col-span-2">
          <ul className="space-y-1.5 font-display text-base">
            <li>What did this year teach me about being a caregiver?</li>
            <li>What did I outgrow?</li>
            <li>What systems actually held me when I was tired?</li>
            <li>Who do I want more of next year?</li>
            <li>What do I want to protect?</li>
          </ul>
        </SectionCard>
      </div>
      <TaskEditor task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditTaskId(null)} />
    </div>
  );
}
