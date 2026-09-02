/**
 * Nutrition by cycle phase — averages from your own log, grouped by where you
 * were in your cycle. Descriptive only.
 */
import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/cards/SectionCard";
import { supabase } from "@/integrations/supabase/client";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";
import { PHASE_NOURISHMENT, averagesByPhase } from "@/lib/wellflow/cycle-nutrition";

export function CyclePhaseInsights({ days = 90 }: { days?: number }) {
  const { settings, periods, loaded } = useCycle();
  const [food, setFood] = useState<{ date: string; calories: number; protein: number }[]>([]);
  const [water, setWater] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      const [f, w] = await Promise.all([
        supabase.from("food_entries").select("date,calories,protein").gte("date", since),
        supabase.from("water_entries").select("date,ounces").gte("date", since),
      ]);
      if (cancel) return;
      setFood((f.data ?? []).map((r: any) => ({
        date: r.date, calories: Number(r.calories) || 0, protein: Number(r.protein) || 0,
      })));
      const map: Record<string, number> = {};
      (w.data ?? []).forEach((r: any) => { map[r.date] = (map[r.date] ?? 0) + (Number(r.ounces) || 0); });
      setWater(map);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [days]);

  const rows = useMemo(() => {
    if (!loaded || !settings.enabled) return [];
    return averagesByPhase(food, water, iso => {
      const info = getPhaseInfo(new Date(`${iso}T12:00:00`), periods, settings);
      return info?.phase ?? null;
    });
  }, [food, water, periods, settings, loaded]);

  if (!loaded || !settings.enabled) return null;

  return (
    <SectionCard
      title="Nutrition by cycle phase"
      subtitle={`Averages across the last ${days} days`}
      accent="calm"
      collapsibleId="wellflow-cycle-phase"
    >
      {loading ? (
        <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Once you've logged food across a full cycle, phase averages show up here.
        </p>
      ) : (
        <div className="space-y-1.5">
          {rows.map(r => (
            <div key={r.phase} className="rounded-2xl border border-border/40 bg-card/50 px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{r.days} day{r.days === 1 ? "" : "s"}</p>
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                {r.avgCalories} cal · {r.avgProtein}g protein · {r.avgWater} oz water per day
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {PHASE_NOURISHMENT[r.phase].focus}
              </p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        A view of your own patterns — not medical advice or a diagnosis.
      </p>
    </SectionCard>
  );
}
