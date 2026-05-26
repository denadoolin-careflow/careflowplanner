import { useEffect, useState, useCallback, useMemo } from "react";
import { format, parseISO, isBefore, addDays, startOfDay } from "date-fns";
import { Sparkles, RefreshCw, Loader2, CalendarClock, AlertCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { getRhythmForecast } from "@/lib/rhythm-forecast";

const cacheKey = (iso: string) => `careflow:daily-brief:${iso}`;

export function DailyBrief({ date }: { date: Date }) {
  const iso = format(date, "yyyy-MM-dd");
  const today = startOfDay(date);
  const { state } = useStore();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const forecast = useMemo(() => getRhythmForecast(date), [date]);

  const buckets = useMemo(() => {
    const tomorrowISO = format(addDays(today, 1), "yyyy-MM-dd");
    const weekEnd = addDays(today, 7);
    const overdue: any[] = []; const todays: any[] = []; const tomorrow: any[] = []; const upcoming: any[] = [];
    for (const t of state.tasks) {
      if (t.done || t.parentTaskId || t.status === "parked" || !t.dueDate) continue;
      const d = parseISO(t.dueDate);
      if (t.dueDate === iso) todays.push(t);
      else if (t.dueDate === tomorrowISO) tomorrow.push(t);
      else if (isBefore(d, today)) overdue.push(t);
      else if (isBefore(d, weekEnd)) upcoming.push(t);
    }
    return { overdue, todays, tomorrow, upcoming };
  }, [state.tasks, iso, today]);

  const appts = state.appointments.filter(a => a.date === iso);
  const topThree = buckets.todays.filter(t => t.isTopThree).slice(0, 3);

  useEffect(() => {
    try { const c = localStorage.getItem(cacheKey(iso)); if (c) setText(c); } catch {}
    setError(null);
  }, [iso]);

  const generate = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const lite = (t: any) => ({ title: t.title, dueDate: t.dueDate, isTopThree: t.isTopThree, area: t.area });
      const { data, error: fnErr } = await supabase.functions.invoke("ai-daily-update", {
        body: {
          date: iso,
          overdue: buckets.overdue.map(lite),
          today: buckets.todays.map(lite),
          tomorrow: buckets.tomorrow.map(lite),
          upcoming: buckets.upcoming.map(lite),
          appointments: appts.map(a => ({ title: a.title, date: a.date, time: a.time })),
          topThree: topThree.map(t => t.title),
        },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      const next = (data?.update as string) ?? "";
      setText(next);
      try { localStorage.setItem(cacheKey(iso), next); } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate brief.");
    } finally { setLoading(false); }
  }, [iso, buckets, appts, topThree]);

  return (
    <section aria-label="Daily brief" className="cozy-card overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Daily Brief
        </div>
        <span className="text-[10px] text-muted-foreground">{format(date, "EEE MMM d")}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Today" value={buckets.todays.length} icon={<CalendarClock className="h-3 w-3" />} />
        <Stat label="Overdue" value={buckets.overdue.length} icon={<AlertCircle className="h-3 w-3" />} tone={buckets.overdue.length ? "warn" : "muted"} />
        <Stat label="Appts" value={appts.length} icon={<CalendarClock className="h-3 w-3" />} />
        <Stat label="Moon" value={forecast.phaseLabel} icon={<Star className="h-3 w-3" />} compact />
      </div>

      {topThree.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Top 3</div>
          <ul className="mt-1 space-y-0.5">
            {topThree.map(t => (
              <li key={t.id} className="truncate text-xs">• {t.title}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 rounded-lg bg-muted/40 p-3">
        {text ? (
          <p className="text-[13px] leading-relaxed text-foreground/90">{text}</p>
        ) : loading ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Drafting your brief…</p>
        ) : error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs italic text-muted-foreground">Tap “Generate” for a personalized briefing on your day.</p>
        )}
        <div className="mt-2">
          <Button size="sm" variant="outline" className="h-7 rounded-full text-xs" onClick={generate} disabled={loading}>
            <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            {text ? "Regenerate" : "Generate"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, icon, tone = "default", compact = false }: { label: string; value: string | number; icon: React.ReactNode; tone?: "default" | "warn" | "muted"; compact?: boolean }) {
  const toneCls = tone === "warn" ? "text-destructive" : tone === "muted" ? "text-muted-foreground" : "text-foreground";
  return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{icon} {label}</div>
      <div className={`mt-0.5 ${compact ? "text-xs font-medium" : "text-lg font-semibold"} ${toneCls}`}>{value}</div>
    </div>
  );
}