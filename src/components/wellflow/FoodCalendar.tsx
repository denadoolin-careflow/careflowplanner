/**
 * Food calendar — a month (or compact week on mobile) of what you logged,
 * with a day detail sheet. Private to your account, descriptive only.
 */
import { useEffect, useMemo, useState } from "react";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth,
  startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Droplets, Scale, Syringe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SectionCard } from "@/components/cards/SectionCard";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useFoodEntries, sumEntries } from "@/lib/wellflow/data";
import { todayISO } from "@/lib/wellflow/types";

interface DayCell {
  calories: number;
  protein: number;
  meals: number;
  water: number;
  injection: boolean;
  weight: number | null;
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");

function useMonthData(anchor: Date) {
  const [map, setMap] = useState<Record<string, DayCell>>({});
  const [loading, setLoading] = useState(true);
  const from = iso(startOfWeek(startOfMonth(anchor)));
  const to = iso(endOfWeek(endOfMonth(anchor)));

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const [food, water, inj, weights] = await Promise.all([
        supabase.from("food_entries").select("date,calories,protein").gte("date", from).lte("date", to),
        supabase.from("water_entries").select("date,ounces").gte("date", from).lte("date", to),
        supabase.from("glp1_injections").select("date").gte("date", from).lte("date", to),
        supabase.from("weight_logs").select("date,weight_lb").gte("date", from).lte("date", to),
      ]);
      if (cancel) return;
      const next: Record<string, DayCell> = {};
      const cell = (d: string) => (next[d] ??= { calories: 0, protein: 0, meals: 0, water: 0, injection: false, weight: null });
      (food.data ?? []).forEach((r: any) => {
        const c = cell(r.date);
        c.calories += Number(r.calories) || 0;
        c.protein += Number(r.protein) || 0;
        c.meals += 1;
      });
      (water.data ?? []).forEach((r: any) => { cell(r.date).water += Number(r.ounces) || 0; });
      (inj.data ?? []).forEach((r: any) => { cell(r.date).injection = true; });
      (weights.data ?? []).forEach((r: any) => { cell(r.date).weight = Number(r.weight_lb) || null; });
      setMap(next);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [from, to]);

  return { map, loading };
}

export function FoodCalendar() {
  const [anchor, setAnchor] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const { map, loading } = useMonthData(anchor);

  const days = useMemo(
    () => eachDayOfInterval({
      start: startOfWeek(startOfMonth(anchor)),
      end: endOfWeek(endOfMonth(anchor)),
    }),
    [anchor],
  );

  return (
    <div className="space-y-4">
      <SectionCard
        title="Food calendar"
        subtitle="What you logged, day by day"
        accent="sage"
        action={
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Previous month"
                    onClick={() => setAnchor(a => subMonths(a, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[7rem] text-center text-sm font-medium">{format(anchor, "MMMM yyyy")}</span>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Next month"
                    onClick={() => setAnchor(a => addMonths(a, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      >
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className={cn("grid grid-cols-7 gap-1", loading && "opacity-60")}>
          {days.map(d => {
            const key = iso(d);
            const cell = map[key];
            const inMonth = isSameMonth(d, anchor);
            const isToday = key === todayISO();
            return (
              <button
                key={key} type="button" onClick={() => setSelected(key)}
                aria-label={`${format(d, "MMMM d")}${cell ? `, ${Math.round(cell.calories)} calories` : ", nothing logged"}`}
                className={cn(
                  "flex min-h-[3.5rem] flex-col items-center gap-0.5 rounded-xl border px-1 py-1 text-[10px] transition-colors",
                  inMonth ? "border-border/40 bg-card/50" : "border-transparent text-muted-foreground/50",
                  isToday && "border-primary/60 bg-primary/10",
                )}
              >
                <span className="font-medium">{format(d, "d")}</span>
                {cell?.calories ? (
                  <span className="tabular-nums text-[10px] font-semibold">{Math.round(cell.calories)}</span>
                ) : null}
                <span className="flex gap-0.5">
                  {cell?.meals ? <Dot className="bg-primary" /> : null}
                  {cell?.water ? <Dot className="bg-sky-400" /> : null}
                  {cell?.injection ? <Dot className="bg-accent" /> : null}
                  {cell?.weight != null ? <Dot className="bg-muted-foreground" /> : null}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <Legend className="bg-primary" label="Food" />
          <Legend className="bg-sky-400" label="Water" />
          <Legend className="bg-accent" label="Injection" />
          <Legend className="bg-muted-foreground" label="Weight" />
        </div>

        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={() => { setAnchor(new Date()); setSelected(todayISO()); }}>
            Jump to today
          </Button>
        </div>
      </SectionCard>

      <DaySheet date={selected} onClose={() => setSelected(null)} summary={selected ? map[selected] : undefined} />
    </div>
  );
}

function Dot({ className }: { className: string }) {
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", className)} />;
}

function Legend({ className, label }: { className: string; label: string }) {
  return <span className="flex items-center gap-1"><Dot className={className} /> {label}</span>;
}

function DaySheet({
  date, summary, onClose,
}: { date: string | null; summary?: DayCell; onClose: () => void }) {
  const { entries, loading } = useFoodEntries(date ?? todayISO());
  const totals = useMemo(() => sumEntries(entries), [entries]);

  return (
    <Sheet open={!!date} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="font-display">
            {date ? format(new Date(`${date}T12:00:00`), "EEEE, MMMM d") : ""}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="Calories" value={Math.round(totals.calories)} />
          <Stat label="Protein" value={`${Math.round(totals.protein)}g`} />
          <Stat label="Water" value={`${Math.round(summary?.water ?? 0)} oz`} />
        </div>

        {(summary?.injection || summary?.weight != null) && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {summary?.injection && (
              <span className="flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1">
                <Syringe className="h-3 w-3" /> Injection logged
              </span>
            )}
            {summary?.weight != null && (
              <span className="flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1">
                <Scale className="h-3 w-3" /> {summary.weight} lb
              </span>
            )}
            {!!summary?.water && (
              <span className="flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1">
                <Droplets className="h-3 w-3" /> {Math.round(summary.water)} oz
              </span>
            )}
          </div>
        )}

        <div className="mt-4 space-y-1.5 pb-6">
          {loading ? (
            <div className="h-16 animate-pulse rounded-xl bg-muted/50" />
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing logged this day.</p>
          ) : entries.map(e => (
            <div key={e.id} className="rounded-2xl border border-border/40 bg-card/50 px-3 py-2">
              <p className="truncate text-sm font-medium">{e.food_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {e.meal_type} · {Math.round(e.calories)} cal • {Math.round(e.protein)}g P • {Math.round(e.carbs)}g C • {Math.round(e.fat)}g F
              </p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-muted/30 px-2 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
