/**
 * Interactive Insights charts. Descriptive only — these visualise what you
 * logged. They are not medical advice and never suggest dose changes.
 */
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceDot,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/cards/SectionCard";
import type { InsightSummary } from "@/lib/wellflow/insights";

type Metric = "calories" | "protein" | "water" | "weight" | "energy";

const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "cal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "water", label: "Water", unit: "oz" },
  { key: "weight", label: "Weight", unit: "lb" },
  { key: "energy", label: "Energy", unit: "/5" },
];

const short = (d: string) => d.slice(5).replace("-", "/");

export function InsightsCharts({ data }: { data: InsightSummary }) {
  const [metric, setMetric] = useState<Metric>("calories");
  const active = METRICS.find(m => m.key === metric)!;

  const series = useMemo(
    () => data.rows.map(r => ({
      date: r.date,
      label: short(r.date),
      value: r[metric] == null ? null : Number(r[metric]),
      injection: r.injection,
    })),
    [data.rows, metric],
  );

  const markers = useMemo(
    () => series.filter(p => p.injection && p.value != null),
    [series],
  );

  const compare = useMemo(() => ([
    {
      name: "Calories",
      "Injection days": Math.round(data.injectionDays.calories),
      "Other days": Math.round(data.otherDays.calories),
    },
    {
      name: "Protein (g)",
      "Injection days": Math.round(data.injectionDays.protein),
      "Other days": Math.round(data.otherDays.protein),
    },
    {
      name: "Water (oz)",
      "Injection days": Math.round(data.injectionDays.water),
      "Other days": Math.round(data.otherDays.water),
    },
    {
      name: "Fiber (g)",
      "Injection days": Math.round(data.injectionDays.fiber),
      "Other days": Math.round(data.otherDays.fiber),
    },
  ]), [data]);

  const cycle = useMemo(
    () => data.byDayAfter.filter(b => b.count > 0).map(b => ({
      label: b.day === 0 ? "Shot" : `+${b.day}`,
      calories: Math.round(b.calories),
      water: Math.round(b.water),
      energy: b.energy == null ? null : +b.energy.toFixed(1),
      count: b.count,
    })),
    [data.byDayAfter],
  );

  return (
    <div className="space-y-4">
      <SectionCard
        title="Daily trend"
        subtitle="Dots mark the days you logged an injection"
        action={
          <div className="flex flex-wrap justify-end gap-1">
            {METRICS.map(m => (
              <Button key={m.key} size="sm" variant={m.key === metric ? "secondary" : "ghost"}
                      className="h-7 px-2 text-xs" onClick={() => setMetric(m.key)}>
                {m.label}
              </Button>
            ))}
          </div>
        }
      >
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={{ fontSize: 10 }} width={44} />
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
                formatter={(v: number | string) => [`${v} ${active.unit}`, active.label]}
                labelFormatter={(l, p) => {
                  const inj = (p?.[0]?.payload as { injection?: boolean } | undefined)?.injection;
                  return `${l}${inj ? " · injection day" : ""}`;
                }}
              />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2}
                    dot={false} connectNulls isAnimationActive={false} />
              {markers.map(m => (
                <ReferenceDot key={m.date} x={m.label} y={m.value as number} r={4}
                              fill="hsl(var(--accent))" stroke="hsl(var(--background))" />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Injection days vs other days" subtitle="Exact averages across this range">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compare} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={44} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Injection days" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Other days" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {cycle.length > 1 && (
        <SectionCard title="Across the injection cycle" subtitle="Averages by days since your last injection">
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cycle} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={44} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }}
                         labelFormatter={l => (l === "Shot" ? "Shot day" : `Day ${l}`)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="calories" name="Calories" stroke="hsl(var(--primary))"
                      strokeWidth={2} dot isAnimationActive={false} />
                <Line type="monotone" dataKey="water" name="Water (oz)" stroke="hsl(var(--accent))"
                      strokeWidth={2} dot isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
