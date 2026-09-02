/**
 * Compare how one food has felt over time — average energy, how often each
 * symptom showed up, and how strong it was. Descriptive only.
 */
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { SectionCard } from "@/components/cards/SectionCard";
import { EmptyState } from "@/components/cards/EmptyState";
import { cn } from "@/lib/utils";
import {
  POSITIVE_SYMPTOMS, comparableFoods, profileForFood, useFoodFeel,
} from "@/lib/wellflow/food-feel";

const RATING_LABEL = ["", "Rough", "Drained", "Neutral", "Good", "Great"];

export function FoodSymptomCompare({ days = 120 }: { days?: number }) {
  const { logs, loading } = useFoodFeel(days);
  const [picked, setPicked] = useState<string | null>(null);

  const foods = useMemo(() => comparableFoods(logs).filter(f => f.count >= 2), [logs]);
  const active = picked ?? foods[0]?.label ?? null;
  const profile = useMemo(() => (active ? profileForFood(logs, active) : null), [logs, active]);

  return (
    <SectionCard title="Compare a food" subtitle="How each food has felt across every time you logged it" accent="warm">
      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
      ) : foods.length === 0 ? (
        <EmptyState
          title="Log a food twice to compare"
          hint="After you rate the same food more than once, its pattern shows up here."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {foods.slice(0, 12).map(f => (
              <button
                key={f.key} type="button" onClick={() => setPicked(f.label)} aria-pressed={active === f.label}
                className={cn(
                  "min-h-[2.25rem] rounded-full border px-3 text-xs transition-colors",
                  active === f.label ? "border-primary bg-primary/15 font-medium" : "border-border/60 bg-card/50 text-muted-foreground",
                )}
              >
                {f.label} <span className="opacity-60">×{f.count}</span>
              </button>
            ))}
          </div>

          {profile && (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-muted/30 px-3 py-2.5">
                <p className="text-sm font-medium">{profile.food}</p>
                <p className="text-xs text-muted-foreground">
                  {profile.count} entries · averages {profile.avgRating.toFixed(1)} / 5
                  {" — "}{RATING_LABEL[Math.round(profile.avgRating)] ?? "Neutral"}
                </p>
              </div>

              {profile.symptoms.length > 0 && (
                <ul className="space-y-1.5">
                  {profile.symptoms.map(s => {
                    const good = POSITIVE_SYMPTOMS.has(s.symptom);
                    const pct = Math.min(100, (s.avgSeverity / 3) * 100);
                    return (
                      <li key={s.symptom} className="rounded-2xl border border-border/40 bg-card/50 px-3 py-2">
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-medium">{s.symptom}</span>
                          <span className="text-muted-foreground">
                            {s.times} of {profile.count} · strength {s.avgSeverity.toFixed(1)}/3
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/50">
                          <div className={cn("h-full rounded-full", good ? "bg-primary" : "bg-destructive/70")}
                               style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Over time
                </p>
                <div className="flex items-end gap-1.5">
                  {profile.trend.map((t, i) => (
                    <div key={`${t.date}-${i}`} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t-md bg-primary/30"
                           style={{ height: `${8 + t.rating * 10}px` }}
                           title={`${t.date}: ${t.rating}/5`} />
                      <span className="text-[9px] text-muted-foreground">
                        {format(new Date(`${t.date}T12:00:00`), "M/d")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}
