import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { format, parseISO, subDays, startOfWeek } from "date-fns";
import { TrendingUp, TrendingDown, Minus, Activity, HeartPulse, Trophy } from "lucide-react";
import { useProgressEntries } from "@/lib/person-progress";
import { checkinsStore, type CheckinResponse } from "@/lib/checkins";
import type { CareRecipient } from "@/lib/types";

type Range = 30 | 90 | 365;

export function PersonTrendsSection({ recipient }: { recipient: CareRecipient }) {
  const allEntries = useProgressEntries();
  const [responses, setResponses] = useState<CheckinResponse[]>([]);
  const [range, setRange] = useState<Range>(30);

  useEffect(() => {
    let cancelled = false;
    checkinsStore.listResponsesByRecipient(recipient.id).then(r => {
      if (!cancelled) setResponses(r);
    });
    return () => { cancelled = true; };
  }, [recipient.id]);

  const since = useMemo(() => subDays(new Date(), range), [range]);
  const priorSince = useMemo(() => subDays(since, range), [since, range]);

  const entries = useMemo(
    () => allEntries.filter(e => e.recipient_id === recipient.id),
    [allEntries, recipient.id]
  );
  const inRange = useMemo(
    () => entries.filter(e => new Date(e.recorded_at) >= since),
    [entries, since]
  );
  const priorEntries = useMemo(
    () => entries.filter(e => {
      const d = new Date(e.recorded_at);
      return d >= priorSince && d < since;
    }),
    [entries, priorSince, since]
  );
  const respInRange = useMemo(
    () => responses.filter(r => new Date(r.responded_at) >= since),
    [responses, since]
  );
  const respPrior = useMemo(
    () => responses.filter(r => {
      const d = new Date(r.responded_at);
      return d >= priorSince && d < since;
    }),
    [responses, priorSince, since]
  );

  // ---- Mood & energy series (daily averages from check-in responses + numeric mood entries)
  const moodSeries = useMemo(() => buildMoodEnergySeries(respInRange, inRange, range), [respInRange, inRange, range]);

  // ---- Health metrics: pick top 3 labels by frequency
  const healthSeries = useMemo(() => buildHealthSeries(inRange, range), [inRange, range]);

  // ---- Milestones per week
  const milestoneSeries = useMemo(() => buildMilestoneBuckets(inRange, range), [inRange, range]);

  // ---- Summary stats
  const moodAvg = avg(respInRange.map(r => r.mood).filter(isNum));
  const moodAvgPrior = avg(respPrior.map(r => r.mood).filter(isNum));
  const energyAvg = avg(respInRange.map(r => r.energy).filter(isNum));
  const energyAvgPrior = avg(respPrior.map(r => r.energy).filter(isNum));
  const milestonesNow = inRange.filter(e => e.category === "milestone").length;
  const milestonesPrior = priorEntries.filter(e => e.category === "milestone").length;
  const healthNow = inRange.filter(e => e.category === "health").length;
  const healthPrior = priorEntries.filter(e => e.category === "health").length;

  const hasAnyData = entries.length > 0 || responses.length > 0;

  return (
    <SectionCard
      title="Trends"
      subtitle="Charts & summaries over time"
      accent="sage"
      action={
        <div className="flex gap-1">
          {([30, 90, 365] as Range[]).map(d => (
            <Button
              key={d}
              size="sm"
              variant={range === d ? "default" : "ghost"}
              className="h-7 rounded-full px-2.5 text-[11px]"
              onClick={() => setRange(d)}
            >
              {d === 365 ? "1y" : `${d}d`}
            </Button>
          ))}
        </div>
      }
    >
      {!hasAnyData ? (
        <p className="text-sm text-muted-foreground">
          Log a few mood check-ins, milestones, or health notes — patterns will appear here.
        </p>
      ) : (
        <div className="space-y-5">
          {/* Summary chips */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatChip
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Mood avg"
              value={moodAvg != null ? moodAvg.toFixed(1) : "—"}
              delta={delta(moodAvg, moodAvgPrior)}
              suffix="/5"
            />
            <StatChip
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Energy avg"
              value={energyAvg != null ? energyAvg.toFixed(1) : "—"}
              delta={delta(energyAvg, energyAvgPrior)}
              suffix="/5"
            />
            <StatChip
              icon={<Trophy className="h-3.5 w-3.5" />}
              label="Milestones"
              value={String(milestonesNow)}
              delta={delta(milestonesNow, milestonesPrior)}
            />
            <StatChip
              icon={<HeartPulse className="h-3.5 w-3.5" />}
              label="Health notes"
              value={String(healthNow)}
              delta={delta(healthNow, healthPrior)}
            />
          </div>

          <Tabs defaultValue="mood">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="mood">Mood</TabsTrigger>
              <TabsTrigger value="health">Health</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
            </TabsList>

            <TabsContent value="mood" className="pt-3">
              {moodSeries.length === 0 ? (
                <EmptyChart label="No mood or energy data yet in this range." />
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer>
                    <AreaChart data={moodSeries} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="energyFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--accent-foreground))" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="hsl(var(--accent-foreground))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={28} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="mood" stroke="hsl(var(--primary))" fill="url(#moodFill)" strokeWidth={2} connectNulls />
                      <Area type="monotone" dataKey="energy" stroke="hsl(var(--accent-foreground))" fill="url(#energyFill)" strokeWidth={2} connectNulls />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </TabsContent>

            <TabsContent value="health" className="pt-3">
              {healthSeries.data.length === 0 ? (
                <EmptyChart label="No numeric health entries yet — try logging weight, sleep hours, or symptom score." />
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer>
                    <LineChart data={healthSeries.data} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={32} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {healthSeries.keys.map((k, i) => (
                        <Line
                          key={k}
                          type="monotone"
                          dataKey={k}
                          stroke={`hsl(var(${HEALTH_COLORS[i % HEALTH_COLORS.length]}))`}
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </TabsContent>

            <TabsContent value="milestones" className="pt-3">
              {milestoneSeries.length === 0 ? (
                <EmptyChart label="No milestones logged in this range." />
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer>
                    <BarChart data={milestoneSeries} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={28} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <NarrativeSummary
            moodDelta={delta(moodAvg, moodAvgPrior)}
            energyDelta={delta(energyAvg, energyAvgPrior)}
            milestonesNow={milestonesNow}
            milestonesPrior={milestonesPrior}
            healthNow={healthNow}
            healthPrior={healthPrior}
            range={range}
          />
        </div>
      )}
    </SectionCard>
  );
}

/* ---------- helpers ---------- */

const HEALTH_COLORS = ["--primary", "--accent-foreground", "--destructive"];

function isNum(v: any): v is number { return typeof v === "number" && !Number.isNaN(v); }
function avg(xs: number[]): number | null {
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function delta(now: number | null, prior: number | null): number | null {
  if (now == null || prior == null) return null;
  return now - prior;
}

function bucketKey(date: Date, range: Range): string {
  if (range === 30) return format(date, "yyyy-MM-dd");
  if (range === 90) return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
  return format(date, "yyyy-MM");
}
function bucketLabel(key: string, range: Range): string {
  if (range === 365) {
    const [y, m] = key.split("-");
    return format(new Date(Number(y), Number(m) - 1, 1), "MMM");
  }
  return format(parseISO(key), range === 30 ? "MMM d" : "MMM d");
}

function buildMoodEnergySeries(
  responses: CheckinResponse[],
  entries: ReturnType<typeof useProgressEntries> extends Array<infer T> ? T[] : any[],
  range: Range,
) {
  const buckets = new Map<string, { mood: number[]; energy: number[] }>();
  for (const r of responses) {
    const k = bucketKey(new Date(r.responded_at), range);
    if (!buckets.has(k)) buckets.set(k, { mood: [], energy: [] });
    const b = buckets.get(k)!;
    if (isNum(r.mood)) b.mood.push(r.mood);
    if (isNum(r.energy)) b.energy.push(r.energy);
  }
  for (const e of entries) {
    if (e.category !== "mood" || !isNum(e.value_numeric)) continue;
    const k = bucketKey(new Date(e.recorded_at), range);
    if (!buckets.has(k)) buckets.set(k, { mood: [], energy: [] });
    buckets.get(k)!.mood.push(e.value_numeric);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => ({
      label: bucketLabel(k, range),
      mood: v.mood.length ? +(v.mood.reduce((a, b) => a + b, 0) / v.mood.length).toFixed(2) : null,
      energy: v.energy.length ? +(v.energy.reduce((a, b) => a + b, 0) / v.energy.length).toFixed(2) : null,
    }));
}

function buildHealthSeries(entries: any[], range: Range) {
  const healthEntries = entries.filter(e => e.category === "health" && isNum(e.value_numeric));
  // Count occurrences per label, pick top 3
  const counts = new Map<string, number>();
  for (const e of healthEntries) counts.set(e.label, (counts.get(e.label) ?? 0) + 1);
  const keys = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const buckets = new Map<string, Record<string, number[]>>();
  for (const e of healthEntries) {
    if (!keys.includes(e.label)) continue;
    const k = bucketKey(new Date(e.recorded_at), range);
    if (!buckets.has(k)) buckets.set(k, {});
    const row = buckets.get(k)!;
    if (!row[e.label]) row[e.label] = [];
    row[e.label].push(e.value_numeric as number);
  }
  const data = [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, row]) => {
      const out: Record<string, any> = { label: bucketLabel(k, range) };
      for (const key of keys) {
        const arr = row[key];
        out[key] = arr && arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null;
      }
      return out;
    });
  return { data, keys };
}

function buildMilestoneBuckets(entries: any[], range: Range) {
  const ms = entries.filter(e => e.category === "milestone");
  const buckets = new Map<string, number>();
  for (const e of ms) {
    const k = bucketKey(new Date(e.recorded_at), range);
    buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, count]) => ({ label: bucketLabel(k, range), count }));
}

/* ---------- tiny UI bits ---------- */

function StatChip({
  icon, label, value, delta, suffix,
}: { icon: React.ReactNode; label: string; value: string; delta: number | null; suffix?: string }) {
  const dir = delta == null || Math.abs(delta) < 0.05 ? "flat" : delta > 0 ? "up" : "down";
  const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}<span>{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-semibold tabular-nums">{value}</span>
        {suffix && <span className="text-[11px] text-muted-foreground">{suffix}</span>}
      </div>
      {delta != null && (
        <div className={
          "mt-0.5 flex items-center gap-0.5 text-[10px] " +
          (dir === "up" ? "text-emerald-600 dark:text-emerald-400"
            : dir === "down" ? "text-rose-600 dark:text-rose-400"
            : "text-muted-foreground")
        }>
          <Icon className="h-2.5 w-2.5" />
          <span>{delta > 0 ? "+" : ""}{Math.abs(delta) < 10 ? delta.toFixed(1) : Math.round(delta)}</span>
        </div>
      )}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
      {label}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-background/95 px-2 py-1.5 text-xs shadow-md">
      <div className="mb-0.5 font-medium">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name ?? p.dataKey}:</span>
          <span className="font-medium tabular-nums">{p.value ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}

function NarrativeSummary(props: {
  moodDelta: number | null; energyDelta: number | null;
  milestonesNow: number; milestonesPrior: number;
  healthNow: number; healthPrior: number; range: Range;
}) {
  const lines: string[] = [];
  const rangeWord = props.range === 30 ? "month" : props.range === 90 ? "quarter" : "year";
  if (props.moodDelta != null) {
    if (Math.abs(props.moodDelta) < 0.2) lines.push(`Mood is steady this ${rangeWord}.`);
    else if (props.moodDelta > 0) lines.push(`Mood is trending up (+${props.moodDelta.toFixed(1)} vs prior ${rangeWord}).`);
    else lines.push(`Mood has dipped (${props.moodDelta.toFixed(1)} vs prior ${rangeWord}) — worth a gentle check-in.`);
  }
  if (props.energyDelta != null) {
    if (Math.abs(props.energyDelta) < 0.2) lines.push(`Energy is holding even.`);
    else if (props.energyDelta > 0) lines.push(`Energy is climbing (+${props.energyDelta.toFixed(1)}).`);
    else lines.push(`Energy has softened (${props.energyDelta.toFixed(1)}).`);
  }
  if (props.milestonesNow || props.milestonesPrior) {
    const d = props.milestonesNow - props.milestonesPrior;
    lines.push(
      d > 0 ? `${props.milestonesNow} milestones this ${rangeWord} — ${d} more than before.`
      : d < 0 ? `${props.milestonesNow} milestones this ${rangeWord} (${Math.abs(d)} fewer than prior).`
      : `${props.milestonesNow} milestones, matching last ${rangeWord}.`
    );
  }
  if (props.healthNow || props.healthPrior) {
    const d = props.healthNow - props.healthPrior;
    if (d !== 0) lines.push(`${props.healthNow} health notes logged (${d > 0 ? "+" : ""}${d} vs prior).`);
  }
  if (!lines.length) return null;
  return (
    <div className="rounded-xl border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/70">
        <Activity className="h-3 w-3" /> Trend summary
      </div>
      {lines.map((l, i) => <p key={i}>{l}</p>)}
    </div>
  );
}