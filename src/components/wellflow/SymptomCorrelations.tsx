/**
 * Symptom correlations. Descriptive charts built only from what you logged.
 * Small samples are labelled. Nothing here is medical advice.
 */
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { SectionCard } from "@/components/cards/SectionCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FEEL_SYMPTOMS } from "@/lib/wellflow/food-feel";
import {
  MIN_SAMPLE, movementVsSymptom, symptomByFood, symptomOverTime, useCorrelations,
} from "@/lib/wellflow/correlations";

const RANGES = [30, 60, 90] as const;

export function SymptomCorrelations() {
  const [days, setDays] = useState<number>(90);
  const [symptom, setSymptom] = useState<string>("Bloating");
  const { logs, moves, loading, foods, portionFor } = useCorrelations(days);
  const [food, setFood] = useState<string>("");

  const byFood = useMemo(() => symptomByFood(logs, symptom).slice(0, 8), [logs, symptom]);
  const overTime = useMemo(() => symptomOverTime(logs, symptom), [logs, symptom]);
  const byMovement = useMemo(() => movementVsSymptom(logs, moves, symptom), [logs, moves, symptom]);

  const activeFood = food || byFood[0]?.food || "";
  const portion = useMemo(
    () => (activeFood ? portionFor(activeFood, symptom) : []),
    [activeFood, symptom, portionFor],
  );

  return (
    <SectionCard
      title="Symptom correlations"
      subtitle="How your ratings line up with foods, portions, and movement"
      action={
        <div className="flex gap-1">
          {RANGES.map(r => (
            <Button key={r} size="sm" variant={r === days ? "secondary" : "ghost"}
                    className="h-7 px-2 text-xs" onClick={() => setDays(r)}>
              {r}d
            </Button>
          ))}
        </div>
      }
    >
      <div className="flex flex-wrap gap-1.5">
        {FEEL_SYMPTOMS.map(s => (
          <button key={s} type="button" onClick={() => { setSymptom(s); setFood(""); }}
                  aria-pressed={s === symptom}
                  className={cn("rounded-full border px-3 py-1 text-xs",
                    s === symptom ? "border-primary bg-primary/15 font-medium"
                                  : "border-border/60 text-muted-foreground hover:bg-muted/50")}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted/50" />
      ) : !logs.length ? (
        <EmptyState title="No food-feel notes yet"
                    hint="Rate how a few meals felt and comparisons will show up here." />
      ) : (
        <div className="mt-4 space-y-6">
          <div>
            <p className="mb-1 text-xs font-medium">Average severity by food</p>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byFood} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                  <XAxis type="number" domain={[0, 3]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="food" width={92} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }}
                           formatter={(v: number, _n, p: any) =>
                             [`${v} avg · ${p?.payload?.hits}/${p?.payload?.count} logs`, symptom]} />
                  <Bar dataKey="avgSeverity" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {byFood.some(f => f.lowSample) && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Foods with fewer than {MIN_SAMPLE} logs are still early — treat them lightly.
              </p>
            )}
          </div>

          {foods.length > 0 && (
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <p className="text-xs font-medium">Portion size vs {symptom.toLowerCase()}</p>
                <div className="ml-auto flex flex-wrap gap-1">
                  {foods.slice(0, 5).map(f => (
                    <button key={f.label} type="button" onClick={() => setFood(f.label)}
                            aria-pressed={f.label === activeFood}
                            className={cn("rounded-full border px-2 py-0.5 text-[11px]",
                              f.label === activeFood ? "border-primary bg-primary/15"
                                                     : "border-border/60 text-muted-foreground")}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {portion.length < 2 ? (
                <p className="rounded-2xl bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Not enough entries for {activeFood || "this food"} yet.
                </p>
              ) : (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis type="number" dataKey="calories" name="Calories" tick={{ fontSize: 10 }} />
                      <YAxis type="number" dataKey="severity" domain={[0, 3]} tick={{ fontSize: 10 }} width={44} />
                      <ZAxis range={[60, 60]} />
                      <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} cursor={{ strokeDasharray: "3 3" }} />
                      <Scatter data={portion} fill="hsl(var(--primary))" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {byMovement.length > 1 && (
            <div>
              <p className="mb-1 text-xs font-medium">By how much you moved that day</p>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byMovement} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 3]} tick={{ fontSize: 10 }} width={44} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }}
                             formatter={(v: number, _n, p: any) => [`${v} avg · ${p?.payload?.days} days`, symptom]} />
                    <Bar dataKey="avgSeverity" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {overTime.length > 1 && (
            <div>
              <p className="mb-1 text-xs font-medium">Week by week</p>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overTime} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 3]} tick={{ fontSize: 10 }} width={44} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Line type="monotone" dataKey="severity" name={symptom} stroke="hsl(var(--primary))"
                          strokeWidth={2} dot isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            These comparisons describe your own notes. They can't prove cause, and they aren't medical
            advice — bring anything worrying to your care team.
          </p>
        </div>
      )}
    </SectionCard>
  );
}
