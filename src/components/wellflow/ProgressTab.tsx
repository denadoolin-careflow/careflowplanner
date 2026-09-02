import { useMemo, useState } from "react";
import { format, parseISO, subDays, subMonths, subYears } from "date-fns";
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/cards/SectionCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { Scale, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteWeight, useGoals, useWeights } from "@/lib/wellflow/data";

const RANGES = [
  { key: "7d", label: "7 days", from: (d: Date) => subDays(d, 7) },
  { key: "30d", label: "30 days", from: (d: Date) => subDays(d, 30) },
  { key: "3m", label: "3 months", from: (d: Date) => subMonths(d, 3) },
  { key: "6m", label: "6 months", from: (d: Date) => subMonths(d, 6) },
  { key: "1y", label: "1 year", from: (d: Date) => subYears(d, 1) },
  { key: "all", label: "All time", from: () => new Date(0) },
] as const;

export function ProgressTab({ onWeight, onGoals }: { onWeight: () => void; onGoals: () => void }) {
  const { goals } = useGoals();
  const { entries, loading, latest } = useWeights();
  const [range, setRange] = useState<string>("30d");

  const start = goals.starting_weight ?? entries[0]?.weight_lb ?? null;
  const goal = goals.goal_weight;
  const current = latest?.weight_lb ?? null;
  const lost = start != null && current != null ? start - current : null;
  const remaining = goal != null && current != null ? current - goal : null;
  const pct = start != null && goal != null && current != null && start !== goal
    ? Math.max(0, Math.min(100, ((start - current) / (start - goal)) * 100))
    : null;

  const data = useMemo(() => {
    const cfg = RANGES.find(r => r.key === range) ?? RANGES[1];
    const from = cfg.from(new Date());
    return entries
      .filter(e => parseISO(`${e.date}T12:00:00`) >= from)
      .map((e, i, arr) => ({
        date: e.date,
        label: format(parseISO(`${e.date}T12:00:00`), "MMM d"),
        weight: e.weight_lb,
        delta: i > 0 ? Math.round((e.weight_lb - arr[i - 1].weight_lb) * 10) / 10 : null,
        notes: e.notes,
      }));
  }, [entries, range]);

  return (
    <div className="space-y-4">
      <SectionCard
        title="Weight & progress"
        accent="sage"
        action={
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={onGoals} className="gap-1.5">
              <Target className="h-4 w-4" /> Goals
            </Button>
            <Button size="sm" onClick={onWeight} className="gap-1.5">
              <Scale className="h-4 w-4" /> Record
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
          <Stat label="Starting" value={start != null ? `${start} lb` : "—"} />
          <Stat label="Current" value={current != null ? `${current} lb` : "—"} />
          <Stat label="Goal" value={goal != null ? `${goal} lb` : "—"} />
          <Stat label="Lost" value={lost != null ? `${Math.round(lost * 10) / 10} lb` : "—"} />
          <Stat label="Remaining" value={remaining != null ? `${Math.round(remaining * 10) / 10} lb` : "—"} />
        </div>

        {pct != null && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{start} lb</span>
              <span className="font-medium text-foreground">{Math.round(pct)}%</span>
              <span>{goal} lb</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-700"
                   style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="My weight journey" subtitle="Every weigh-in you've recorded">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {RANGES.map(r => (
            <button key={r.key} type="button" onClick={() => setRange(r.key)}
                    aria-pressed={range === r.key}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      range === r.key
                        ? "border-primary bg-primary/15 font-medium"
                        : "border-border/60 text-muted-foreground hover:bg-muted/50",
                    )}>
              {r.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-56 animate-pulse rounded-xl bg-muted/50" />
        ) : data.length === 0 ? (
          <EmptyState title="No weigh-ins in this range" hint="Record a weight to start your journey.">
            <Button size="sm" className="mt-2" onClick={onWeight}>Record weight</Button>
          </EmptyState>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <Tooltip content={<WeightTooltip />} />
                {goal != null && (
                  <ReferenceLine y={goal} strokeDasharray="4 4" className="stroke-accent"
                                 label={{ value: "Goal", position: "insideTopRight", fontSize: 10 }} />
                )}
                <Line type="monotone" dataKey="weight" strokeWidth={2}
                      className="stroke-primary" stroke="currentColor"
                      dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Progress isn't always linear. Look at the trend over time.
        </p>
      </SectionCard>

      <SectionCard title="Weigh-in history" collapsibleId="wellflow-weights" defaultOpen={false}>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {[...entries].reverse().map(e => (
              <li key={e.id} className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/50 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium tabular-nums">
                    {e.weight_lb} lb
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {format(parseISO(`${e.date}T12:00:00`), "MMM d, yyyy")}
                    </span>
                  </p>
                  {e.notes && <p className="truncate text-xs text-muted-foreground">{e.notes}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Delete weigh-in"
                        onClick={async () => { await deleteWeight(e.id); toast.success("Weigh-in removed"); }}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function WeightTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-border/60 bg-popover px-3 py-2 text-xs shadow-soft">
      <p className="font-medium">{p.label}</p>
      <p className="tabular-nums">{p.weight} lb</p>
      {p.delta != null && (
        <p className="text-muted-foreground tabular-nums">
          {p.delta > 0 ? "+" : ""}{p.delta} lb from previous
        </p>
      )}
      {p.notes && <p className="mt-1 max-w-[180px] text-muted-foreground">{p.notes}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/30 px-2 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
