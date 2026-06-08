import { useEffect, useMemo, useState } from "react";
import { subDays, format, startOfDay } from "date-fns";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, ReferenceLine,
} from "recharts";
import { Sparkles, Loader2, Clock, ListChecks, Moon, Flower2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/cards/SectionCard";
import { usePomodoroHistory } from "@/lib/pomodoro-history";
import { useStore } from "@/lib/store";
import { useCycle } from "@/lib/cycle-store";
import { phaseForDate } from "@/lib/cycle";
import { moonPhaseFor } from "@/lib/moon-phase";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { aiInvoke } from "@/lib/ai-invoke";
import { CareyInsightsWidget } from "@/components/carey/CareyInsightsWidget";

interface DayDatum {
  date: string;
  focusMinutes: number;
  tasksDone: number;
  cyclePhase?: string | null;
  cycleDay?: number | null;
  moonPhase?: string | null;
}

interface Insight { title: string; body: string; tag: string; }

const PHASE_COLOR: Record<string, string> = {
  menstrual: "hsl(var(--destructive) / 0.3)",
  follicular: "hsl(var(--primary) / 0.2)",
  ovulatory: "hsl(var(--accent) / 0.3)",
  luteal: "hsl(var(--secondary) / 0.3)",
};

export default function Insights() {
  const { rows: pomos, stats } = usePomodoroHistory();
  const { state } = useStore();
  const { periods, settings } = useCycle();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Build 28-day series
  const days = useMemo<DayDatum[]>(() => {
    const out: DayDatum[] = [];
    const today = startOfDay(new Date());
    for (let i = 27; i >= 0; i--) {
      const d = subDays(today, i);
      const iso = d.toISOString().slice(0, 10);
      const dayPomos = pomos.filter(p => p.completed_at?.slice(0, 10) === iso);
      const focusMinutes = Math.round(dayPomos.reduce((s, p) => s + p.focus_seconds, 0) / 60);
      const tasksDone = state.tasks.filter(t => t.done && (t.dueDate === iso || (!t.dueDate && t.createdAt?.slice(0,10) === iso))).length;
      const phase = settings.enabled ? phaseForDate(d, periods, settings) : null;
      const moon = moonPhaseFor(d);
      out.push({
        date: iso,
        focusMinutes,
        tasksDone,
        cyclePhase: phase ?? null,
        moonPhase: moon?.phase ?? null,
      });
    }
    return out;
  }, [pomos, state.tasks, periods, settings]);

  const today = days[days.length - 1];

  // Today: time-by-template donut
  const todayDonut = useMemo(() => {
    const todayISO = today?.date;
    const dayPomos = pomos.filter(p => p.completed_at?.slice(0, 10) === todayISO);
    const byTemplate = new Map<string, number>();
    for (const p of dayPomos) {
      const k = p.template_label ?? p.task_title ?? "Custom";
      byTemplate.set(k, (byTemplate.get(k) ?? 0) + p.focus_seconds);
    }
    return [...byTemplate.entries()]
      .map(([label, sec]) => ({ name: label, value: Math.round(sec / 60) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [pomos, today]);

  const fullMoonDays = days.filter(d => d.moonPhase === "full").map(d => d.date);
  const newMoonDays = days.filter(d => d.moonPhase === "new").map(d => d.date);

  const runInsights = async () => {
    setLoading(true);
    try {
      const topTemplates = stats.byTemplate.slice(0, 5).map(t => ({ label: t.label, minutes: Math.round(t.totalSeconds / 60) }));
      const topTasks = stats.byTask.slice(0, 5).map(t => ({ label: t.label, minutes: Math.round(t.totalSeconds / 60) }));
      const { data, error } = await aiInvoke("ai-rhythm-insights", {
        body: { days, topTemplates, topTasks },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInsights(data?.insights ?? []);
      setSummary(data?.summary ?? "");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't fetch insights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (pomos.length || state.tasks.length) void runInsights(); /* eslint-disable-next-line */ }, []);

  const totalFocusMin = days.reduce((s, d) => s + d.focusMinutes, 0);
  const totalTasks = days.reduce((s, d) => s + d.tasksDone, 0);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 md:p-6">
      <header className="cozy-card gradient-sage p-6">
        <h1 className="font-display text-3xl font-semibold">Rhythm Insights</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Where your focus, tasks, cycle and the moon meet — gently observed.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{Math.round(totalFocusMin / 60)}h focus · 28 days</span>
          <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" />{totalTasks} tasks done</span>
          <span className="flex items-center gap-1"><Moon className="h-3 w-3" />{fullMoonDays.length} full · {newMoonDays.length} new</span>
        </div>
      </header>

      <CareyInsightsWidget />

      {/* Today donut */}
      <SectionCard title="Where today went" subtitle="Focus time by session type" accent="warm">
        {todayDonut.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No focus sessions logged today yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={todayDonut} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2}>
                    {todayDonut.map((_, i) => (
                      <Cell key={i} fill={`hsl(var(--chart-${(i % 5) + 1}, var(--primary)))`} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: any) => [`${v}m`, "Focus"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex flex-col justify-center gap-1.5 text-sm">
              {todayDonut.map((d, i) => (
                <li key={d.name} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 truncate">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: `hsl(var(--chart-${(i % 5) + 1}, var(--primary)))` }} />
                    <span className="truncate">{d.name}</span>
                  </span>
                  <span className="text-muted-foreground tabular-nums">{d.value}m</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>

      {/* 28-day trend */}
      <SectionCard title="28-day rhythm" subtitle="Focus minutes & tasks, with cycle and lunar bands" accent="calm">
        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={days} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="tasksGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => format(new Date(v), "MMM d")}
                interval={3}
              />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                labelFormatter={(v) => format(new Date(v), "EEE, MMM d")}
                formatter={(value: any, name: string, item: any) => {
                  if (name === "focusMinutes") {
                    const p = item?.payload as DayDatum;
                    const extras = [
                      p?.cyclePhase && `Cycle: ${p.cyclePhase}`,
                      p?.moonPhase && `Moon: ${p.moonPhase}`,
                    ].filter(Boolean).join(" · ");
                    return [`${value}m focus`, extras || "Focus"];
                  }
                  return [value, name === "tasksDone" ? "Tasks" : name];
                }}
              />
              {fullMoonDays.map(d => (
                <ReferenceLine key={`fm-${d}`} x={d} stroke="hsl(var(--foreground))" strokeOpacity={0.25} strokeDasharray="2 4" />
              ))}
              {newMoonDays.map(d => (
                <ReferenceLine key={`nm-${d}`} x={d} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.4} strokeDasharray="1 3" />
              ))}
              <Area type="monotone" dataKey="focusMinutes" stroke="hsl(var(--primary))" fill="url(#focusGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="tasksDone" stroke="hsl(var(--accent))" fill="url(#tasksGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Focus min</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" /> Tasks done</span>
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-px border-l border-dashed border-foreground/40" /> Full moon</span>
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-px border-l border-dotted border-muted-foreground" /> New moon</span>
        </div>
      </SectionCard>

      {/* Cycle phase strip */}
      {settings.enabled && (
        <SectionCard title="Cycle phases" subtitle="The last 28 days, colored by phase" accent="sage">
          <div className="flex h-6 w-full overflow-hidden rounded-full border border-border/60">
            {days.map(d => (
              <div
                key={d.date}
                title={`${format(new Date(d.date), "MMM d")}${d.cyclePhase ? ` · ${d.cyclePhase}` : ""}`}
                className="flex-1"
                style={{ background: d.cyclePhase ? PHASE_COLOR[d.cyclePhase] : "hsl(var(--muted))" }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            {Object.entries(PHASE_COLOR).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: v }} /> {k}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* AI insights */}
      <SectionCard
        title="Patterns we noticed"
        subtitle={summary || "Gentle observations across your 28-day rhythm"}
        accent="warm"
        action={
          <Button size="sm" variant="ghost" onClick={runInsights} disabled={loading} className="h-7 text-xs">
            {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
            Refresh
          </Button>
        }
      >
        {loading && insights.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Reading your rhythm…</p>
        )}
        {!loading && insights.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Tap Refresh to surface patterns.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.map((ins, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card/60 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                <Flower2 className="h-3 w-3" /> {ins.tag}
              </div>
              <div className="text-sm font-medium">{ins.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{ins.body}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
