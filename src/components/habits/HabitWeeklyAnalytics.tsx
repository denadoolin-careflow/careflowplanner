import { useEffect, useMemo, useState } from "react";
import { useStore, todayISO } from "@/lib/store";
import { computeHabitGrowth, STAGE_LABEL } from "@/lib/habit-consistency";
import { subDays, format } from "date-fns";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, TrendingUp, TrendingDown, Award, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CACHE_KEY = "habit_overview_cache_v1";

interface Insight { title: string; body: string; tag?: string }
interface Overview { summary?: string; insights?: Insight[] }

export function HabitWeeklyAnalytics() {
  const { state } = useStore();
  const habits = state.habits;

  const days7 = useMemo(() => Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i)), []);

  const dailyData = useMemo(() => days7.map(d => {
    const k = d.toISOString().slice(0, 10);
    const done = habits.filter(h => h.log[k]).length;
    const pct = habits.length ? Math.round((done / habits.length) * 100) : 0;
    return { day: format(d, "EEE"), date: k, done, total: habits.length, pct };
  }), [days7, habits]);

  const growths = useMemo(() => habits.map(h => ({ habit: h, g: computeHabitGrowth(h) })), [habits]);

  const totalTends = useMemo(
    () => habits.reduce((acc, h) => acc + days7.reduce((a, d) => a + (h.log[d.toISOString().slice(0,10)] ? 1 : 0), 0), 0),
    [habits, days7],
  );
  const bestDay = useMemo(() => dailyData.reduce((b, d) => d.done > (b?.done ?? -1) ? d : b, dailyData[0]), [dailyData]);
  const mostConsistent = useMemo(() => growths.slice().sort((a, b) => b.g.ratio - a.g.ratio)[0], [growths]);
  const growing = growths.filter(x => x.g.stageIndex >= 2).length;
  const wilting = growths.filter(x => x.g.stageIndex === 0 && x.g.doneDays === 0).length;

  const timeOfDayData = useMemo(() => {
    const buckets: Record<string, number> = { Morning: 0, Midday: 0, Afternoon: 0, Evening: 0, Anytime: 0 };
    for (const h of habits) {
      const tendedThisWeek = days7.reduce((a, d) => a + (h.log[d.toISOString().slice(0,10)] ? 1 : 0), 0);
      if (!tendedThisWeek) continue;
      const times = h.timesOfDay?.length ? h.timesOfDay : ["anytime" as const];
      for (const t of times) {
        const label = (t as string)[0].toUpperCase() + (t as string).slice(1);
        buckets[label] = (buckets[label] ?? 0) + tendedThisWeek;
      }
    }
    return Object.entries(buckets).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [habits, days7]);

  const PIE_COLORS = ["hsl(var(--primary))","hsl(var(--accent))","hsl(var(--secondary))","hsl(var(--muted-foreground))","hsl(var(--primary)/0.5)"];

  // AI overview
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.t && Date.now() - parsed.t < 24 * 60 * 60 * 1000) setOverview(parsed.data);
    } catch { /* ignore */ }
  }, []);

  const refreshOverview = async () => {
    if (!habits.length) { toast("Add a habit first."); return; }
    setLoading(true);
    try {
      const days28 = Array.from({ length: 28 }, (_, i) => subDays(new Date(), 27 - i).toISOString().slice(0, 10));
      const payload = {
        days: days28.map(d => ({
          date: d,
          done: habits.filter(h => h.log[d]).length,
          total: habits.length,
        })),
        habits: habits.map(h => {
          const g = computeHabitGrowth(h);
          return {
            title: h.title,
            category: h.category,
            cadence: h.cadence,
            stage: g.stage,
            ratio14d: Number(g.ratio.toFixed(2)),
            streak: g.forgivingStreak,
            timesOfDay: h.timesOfDay ?? [],
            linkedProjects: (h.linkedProjectIds ?? []).map(id => state.projects.find(p => p.id === id)?.name).filter(Boolean),
            linkedRoutines: (h.linkedRoutineIds ?? []).length,
          };
        }),
      };
      const { data, error } = await supabase.functions.invoke("ai-habit-overview", { body: payload });
      if (error) throw error;
      setOverview(data as Overview);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data })); } catch { /* ignore */ }
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't generate overview");
    } finally {
      setLoading(false);
    }
  };

  if (!habits.length) {
    return <p className="text-sm text-muted-foreground">Add a habit to see your weekly review.</p>;
  }

  return (
    <div className="space-y-5">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile icon={<Award className="h-3.5 w-3.5" />} label="Tends this week" value={String(totalTends)} />
        <Tile icon={<TrendingUp className="h-3.5 w-3.5" />} label="Best day" value={bestDay ? `${bestDay.day} · ${bestDay.done}` : "—"} />
        <Tile icon={<Sparkles className="h-3.5 w-3.5" />} label="Growing" value={`${growing}/${habits.length}`} />
        <Tile icon={<TrendingDown className="h-3.5 w-3.5" />} label="Need love" value={String(wilting)} />
      </div>

      {/* 7-day chart */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-medium">Last 7 days · completion %</h4>
          {mostConsistent && (
            <span className="text-[11px] text-muted-foreground">Most consistent: {mostConsistent.habit.title}</span>
          )}
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: any, _n, p: any) => [`${v}% (${p.payload.done}/${p.payload.total})`, "Done"]}
              />
              <Bar dataKey="pct" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Time-of-day pie + per-habit list */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card/50 p-3">
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium"><Clock className="h-3.5 w-3.5" /> Time of day</h4>
          {timeOfDayData.length === 0 ? (
            <p className="text-xs text-muted-foreground">Assign times of day on your habits to see this.</p>
          ) : (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={timeOfDayData} dataKey="value" nameKey="name" innerRadius={32} outerRadius={56} paddingAngle={2}>
                    {timeOfDayData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-card/50 p-3">
          <h4 className="mb-2 text-sm font-medium">Per habit · 14-day</h4>
          <ul className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {growths.map(({ habit, g }) => (
              <li key={habit.id} className="flex items-center gap-2 text-xs">
                <span className="min-w-0 flex-1 truncate">{habit.title}</span>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(g.ratio * 100)}%` }} />
                </div>
                <span className="w-16 text-right text-muted-foreground">{STAGE_LABEL[g.stage]}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* AI overview */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h4 className="flex items-center gap-1.5 text-sm font-medium"><Sparkles className="h-3.5 w-3.5 text-primary" /> AI overview</h4>
          <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" onClick={refreshOverview} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : overview ? "Refresh" : "Generate"}
          </Button>
        </div>
        {!overview && !loading && (
          <p className="text-xs text-muted-foreground">Get a gentle AI read on your habit rhythm over the last 28 days.</p>
        )}
        {overview && (
          <div className="space-y-2">
            {overview.summary && <p className="text-sm italic text-foreground/90">{overview.summary}</p>}
            <ul className="space-y-1.5">
              {(overview.insights ?? []).map((it, i) => (
                <li key={i} className="rounded-lg bg-background/60 p-2 text-xs">
                  <div className="font-medium">{it.title}</div>
                  <div className="text-muted-foreground">{it.body}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">{icon} {label}</div>
      <div className="mt-1 font-display text-xl">{value}</div>
    </div>
  );
}