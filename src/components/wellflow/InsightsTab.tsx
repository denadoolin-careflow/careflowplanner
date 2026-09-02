import { useMemo, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Droplets, Flame, Syringe, TrendingDown, TrendingUp } from "lucide-react";
import { InsightsCharts } from "@/components/wellflow/InsightsCharts";
import { FoodFeelPatterns } from "@/components/wellflow/FoodFeelPatterns";
import { CyclePhaseInsights } from "@/components/wellflow/CyclePhaseInsights";
import { FoodSymptomCompare } from "@/components/wellflow/FoodSymptomCompare";
import { observations, useInsights, type InsightRange, type InsightWindow } from "@/lib/wellflow/insights";
import { todayISO } from "@/lib/wellflow/types";

const WINDOWS: InsightWindow[] = [30, 60, 90];

const daysAgo = (n: number) => {
  const d = new Date(`${todayISO()}T12:00:00`);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export function InsightsTab() {
  const [win, setWin] = useState<InsightWindow>(30);
  const [custom, setCustom] = useState(false);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(todayISO());

  const range: InsightRange = useMemo(
    () => (custom && from && to && from <= to ? { from, to } : win),
    [custom, from, to, win],
  );
  const { data, loading } = useInsights(range);

  return (
    <div className="space-y-4">
      <SectionCard
        title="Insights"
        subtitle="How your logs look on injection days compared with other days"
        accent="sage"
        action={
          <div className="flex gap-1">
            {WINDOWS.map(w => (
              <Button key={w} size="sm" variant={!custom && w === win ? "secondary" : "ghost"}
                      className="h-7 px-2 text-xs" onClick={() => { setCustom(false); setWin(w); }}>
                {w}d
              </Button>
            ))}
            <Button size="sm" variant={custom ? "secondary" : "ghost"} className="h-7 px-2 text-xs"
                    onClick={() => setCustom(c => !c)}>
              Custom
            </Button>
          </div>
        }
      >
        {custom && (
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="wf-ins-from">From</Label>
              <Input id="wf-ins-from" type="date" value={from} max={to}
                     onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="wf-ins-to">To</Label>
              <Input id="wf-ins-to" type="date" value={to} min={from} max={todayISO()}
                     onChange={e => setTo(e.target.value)} />
            </div>
          </div>
        )}

        {loading || !data ? (
          <div className="h-24 animate-pulse rounded-xl bg-muted/50" />
        ) : !data.hasData ? (
          <EmptyState title="Not enough logged yet"
                      hint="Log food, water, weight, and a few check-ins and patterns will appear here." />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <GroupCard title="Injection days" icon={Syringe} stats={data.injectionDays} highlight />
              <GroupCard title="Other days" icon={Flame} stats={data.otherDays} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Tile label="Injections" value={String(data.injectionCount)} />
              <Tile
                label="Weight change"
                value={data.weightChange == null ? "—" : `${data.weightChange > 0 ? "+" : ""}${data.weightChange} lb`}
                icon={data.weightChange != null && data.weightChange < 0 ? TrendingDown : TrendingUp}
              />
              <Tile label="Days logged" value={String(data.injectionDays.days + data.otherDays.days)} />
            </div>

            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              {observations(data).map(o => (
                <li key={o} className="rounded-2xl bg-muted/30 px-3 py-2">{o}</li>
              ))}
            </ul>
          </>
        )}
      </SectionCard>

      {data?.hasData && <InsightsCharts data={data} />}

      <FoodFeelPatterns />

      <FoodSymptomCompare />

      <CyclePhaseInsights />


      <p className="px-1 text-xs text-muted-foreground">
        These are patterns from your own log — a personal summary, not medical advice. Talk with your care
        team about anything that concerns you or about your medication.
      </p>
    </div>
  );
}

function GroupCard({
  title, icon: Icon, stats, highlight,
}: {
  title: string;
  icon: typeof Syringe;
  stats: { days: number; calories: number; protein: number; water: number; energy: number | null };
  highlight?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border px-3 py-3",
      highlight ? "border-primary/40 bg-primary/5" : "border-border/40 bg-card/50")}>
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <Icon className="h-3.5 w-3.5 text-primary" /> {title}
      </p>
      <p className="text-[10px] text-muted-foreground">{stats.days} day{stats.days === 1 ? "" : "s"} logged</p>
      <dl className="mt-2 space-y-1 text-xs">
        <Row label="Calories" value={`${Math.round(stats.calories)}`} />
        <Row label="Protein" value={`${Math.round(stats.protein)}g`} />
        <Row label="Water" value={`${Math.round(stats.water)} oz`} />
        <Row label="Energy" value={stats.energy == null ? "—" : stats.energy.toFixed(1)} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums font-medium">{value}</dd>
    </div>
  );
}

function Tile({ label, value, icon: Icon = Droplets }: { label: string; value: string; icon?: typeof Droplets }) {
  return (
    <div className="rounded-2xl bg-muted/30 px-2 py-2.5">
      <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
