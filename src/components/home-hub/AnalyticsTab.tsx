import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Sparkles, TrendingUp, Calendar, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { SectionCard } from "@/components/cards/SectionCard";
import { useStore } from "@/lib/store";
import { useHomeMaintenance, bucketOf } from "@/lib/home-maintenance";
import { cn } from "@/lib/utils";

interface RhythmRow { date: string; slot: string; done: boolean; }

export function AnalyticsTab() {
  const [rhythm, setRhythm] = useState<RhythmRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { state } = useStore() as any;
  const { items: maintenance } = useHomeMaintenance();

  useEffect(() => {
    (async () => {
      const start = format(subDays(new Date(), 13), "yyyy-MM-dd");
      const { data } = await supabase
        .from("home_rhythm_assignments")
        .select("date, slot, done")
        .gte("date", start);
      setRhythm((data as RhythmRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const last14 = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => format(subDays(new Date(), 13 - i), "yyyy-MM-dd"));
    return days.map((d) => {
      const rows = rhythm.filter((r) => r.date === d);
      const total = rows.length;
      const done = rows.filter((r) => r.done).length;
      return { date: d, total, done, pct: total ? done / total : 0 };
    });
  }, [rhythm]);

  const rhythmStreak = useMemo(() => {
    let streak = 0;
    for (let i = last14.length - 1; i >= 0; i--) {
      const d = last14[i];
      if (d.total > 0 && d.done === d.total) streak++;
      else if (d.total === 0) continue;
      else break;
    }
    return streak;
  }, [last14]);

  const maintenanceCounts = useMemo(() => {
    const counts = { overdue: 0, due_soon: 0, upcoming: 0, unscheduled: 0 };
    maintenance.forEach((m) => { counts[bucketOf(m)]++; });
    return counts;
  }, [maintenance]);

  const zoneStats = useMemo(() => {
    const cleaning: any[] = state.cleaning ?? [];
    const m: Record<string, { done: number; total: number }> = {};
    cleaning.forEach((c) => {
      const z = c.zone || "Whole home";
      const cur = m[z] ||= { done: 0, total: 0 };
      cur.total++;
      if (c.done) cur.done++;
    });
    return Object.entries(m).sort((a, b) => b[1].total - a[1].total);
  }, [state.cleaning]);

  const maxIntensity = Math.max(1, ...last14.map((d) => d.total));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Sparkles} label="Rhythm streak" value={`${rhythmStreak}d`} hint="full days completed" />
        <StatCard icon={Calendar} label="Last 14 days" value={`${Math.round(avg(last14.map((d) => d.pct)) * 100)}%`} hint="rhythm completion" />
        <StatCard icon={Wrench} label="Maintenance" value={`${maintenanceCounts.overdue}`} hint="overdue items" tone={maintenanceCounts.overdue > 0 ? "warn" : "ok"} />
        <StatCard icon={TrendingUp} label="Zones" value={`${zoneStats.length}`} hint="active zones" />
      </div>

      <SectionCard title="Rhythm heatmap — last 14 days" accent="calm">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-end gap-1">
              {last14.map((d) => {
                const intensity = d.total / maxIntensity;
                const opacity = d.total === 0 ? 0.08 : 0.2 + intensity * 0.8;
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-md border border-primary/20"
                      style={{
                        height: `${24 + intensity * 36}px`,
                        background: `hsl(var(--primary) / ${opacity})`,
                      }}
                      title={`${d.date} — ${d.done}/${d.total} done`}
                    />
                    <span className="text-[9px] text-muted-foreground">
                      {format(new Date(d.date + "T00:00:00"), "EEEEE")}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Taller = more planned · brighter = more completed. Empty days are kept light on purpose.
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Cleaning consistency by zone" accent="warm">
        {zoneStats.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cleaning tasks tracked yet.</p>
        ) : (
          <ul className="space-y-2">
            {zoneStats.map(([zone, s]) => {
              const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
              return (
                <li key={zone} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{zone}</span>
                    <span className="text-muted-foreground">{s.done}/{s.total} · {pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Maintenance health" accent="calm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([
            ["Overdue", maintenanceCounts.overdue, "text-destructive"],
            ["Due soon", maintenanceCounts.due_soon, "text-primary"],
            ["Upcoming", maintenanceCounts.upcoming, "text-foreground"],
            ["No schedule", maintenanceCounts.unscheduled, "text-muted-foreground"],
          ] as const).map(([label, val, color]) => (
            <div key={label} className="rounded-xl border border-border/50 bg-background/60 p-3 text-center">
              <div className={cn("font-display text-2xl font-semibold", color)}>{val}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function avg(arr: number[]) {
  const nz = arr.filter((n) => n > 0);
  if (!nz.length) return 0;
  return nz.reduce((a, b) => a + b, 0) / nz.length;
}

function StatCard({
  icon: Icon, label, value, hint, tone = "default",
}: { icon: typeof Sparkles; label: string; value: string; hint: string; tone?: "default" | "warn" | "ok" }) {
  return (
    <div className={cn(
      "rounded-2xl border p-3",
      tone === "warn" ? "border-destructive/30 bg-destructive/5" :
      tone === "ok" ? "border-primary/25 bg-primary/5" :
      "border-border/60 bg-card/70",
    )}>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="font-display text-2xl font-semibold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}