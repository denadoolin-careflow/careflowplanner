import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useWeekForecast } from "@/lib/use-week-forecast";
import { useTempUnit, cToF } from "@/lib/weather-store";
import { Cloud, CloudDrizzle, CloudFog, CloudRain, CloudSnow, CloudSun, Sun, Zap, Plus, Sprout, Star, Utensils } from "lucide-react";
import type { WeatherCondition } from "@/lib/weather";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function WxIcon({ c, className }: { c: WeatherCondition; className?: string }) {
  const cls = cn("h-4 w-4", className);
  if (c === "clear") return <Sun className={cls} />;
  if (c === "partly-cloudy") return <CloudSun className={cls} />;
  if (c === "cloudy") return <Cloud className={cls} />;
  if (c === "fog") return <CloudFog className={cls} />;
  if (c === "drizzle") return <CloudDrizzle className={cls} />;
  if (c === "rain") return <CloudRain className={cls} />;
  if (c === "snow") return <CloudSnow className={cls} />;
  if (c === "thunderstorm") return <Zap className={cls} />;
  return <Cloud className={cls} />;
}

/** Three free-form "Top 3" placeholders persisted per-date in localStorage. */
function useTop3(iso: string): [string[], (i: number, v: string) => void] {
  const key = `careflow.top3.${iso}`;
  const [vals, setVals] = useState<string[]>(["", "", ""]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setVals([arr[0] ?? "", arr[1] ?? "", arr[2] ?? ""]);
        else setVals(["", "", ""]);
      } else setVals(["", "", ""]);
    } catch { setVals(["", "", ""]); }
  }, [key]);
  const setOne = (i: number, v: string) => {
    setVals(prev => {
      const next = [...prev]; next[i] = v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return [vals, setOne];
}

type DayPart = "morning" | "afternoon" | "evening" | "allday";
const DAY_PART_TITLE: Record<DayPart, "Morning" | "Afternoon" | "Evening" | "Late Night"> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  allday: "Late Night",
};

export function DayDetailExtras({ iso }: { iso: string }) {
  const { state, addTask, addMeal, toggleTask } = useStore();
  const { days } = useWeekForecast();
  const [unit] = useTempUnit();
  const wx = days?.find(d => d.date === iso);
  const fmtT = (c: number) => `${unit === "F" ? cToF(c) : Math.round(c)}°`;

  // Top 3 ----------------------------------------------------------------
  const [top3, setTop3] = useTop3(iso);

  const saveTop3AsTask = async (i: number) => {
    const t = top3[i].trim();
    if (!t) return;
    await addTask({ title: t, dueDate: iso, priority: "high", isTopThree: true });
    toast.success("Added to Top 3 for the day");
  };

  // Habits progress ------------------------------------------------------
  const dow = new Date(iso + "T00:00:00").getDay();
  const dueHabits = useMemo(() => state.habits.filter(h => {
    if (h.cadence === "daily") return true;
    if (h.cadence === "weekly") return h.daysOfWeek?.length ? h.daysOfWeek.includes(dow) : true;
    return false;
  }), [state.habits, dow]);
  const doneHabits = dueHabits.filter(h => !!h.log?.[iso]).length;
  const habitPct = dueHabits.length ? Math.round((doneHabits / dueHabits.length) * 100) : 0;

  // Meals ----------------------------------------------------------------
  const meals = state.meals.filter(m => m.date === iso);

  return (
    <div className="mt-4 space-y-5">
      {/* Weather row */}
      {wx && (
        <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/60 p-2.5 text-xs">
          <WxIcon c={wx.condition} className="h-4 w-4 text-foreground/80" />
          <span className="tabular-nums font-medium">{fmtT(wx.highC)}</span>
          <span className="text-muted-foreground">/ {fmtT(wx.lowC)}</span>
          <span className="ml-1 truncate text-muted-foreground">{wx.label}</span>
        </div>
      )}

      {/* Top 3 ------------------------------------------------------- */}
      <section>
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Star className="h-3.5 w-3.5" /> Top 3 for the day
        </div>
        <ul className="space-y-1.5">
          {[0, 1, 2].map(i => (
            <li key={i} className="flex items-center gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">{i + 1}</span>
              <Input
                value={top3[i]}
                onChange={(e) => setTop3(i, e.target.value)}
                onBlur={() => { if (top3[i].trim()) void saveTop3AsTask(i); }}
                placeholder="Tap to write…"
                className="h-8 text-sm"
              />
            </li>
          ))}
        </ul>
      </section>

      {/* Inline +add per day part ----------------------------------- */}
      <section>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Add to this day
        </div>
        <div className="space-y-1.5">
          {(["morning", "afternoon", "evening", "allday"] as DayPart[]).map(part => (
            <QuickAddRow
              key={part}
              label={DAY_PART_TITLE[part] === "Late Night" ? "Anytime" : DAY_PART_TITLE[part]}
              onAdd={async (title) => {
                await addTask({
                  title,
                  dueDate: iso,
                  dayPart: DAY_PART_TITLE[part],
                  area: "Personal",
                  priority: "medium",
                });
                toast.success("Task added");
              }}
            />
          ))}
        </div>
      </section>

      {/* Meals ------------------------------------------------------ */}
      <section>
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Utensils className="h-3.5 w-3.5" /> Meals
        </div>
        {meals.length > 0 && (
          <ul className="mb-1.5 space-y-1">
            {meals.map(m => (
              <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5 text-sm">
                <span className="min-w-0 truncate">{m.name}</span>
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{m.slot}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {(["Breakfast", "Lunch", "Dinner", "Snack"] as const).map(slot => (
            <MealQuickAdd key={slot} slot={slot} onAdd={async (name) => {
              await addMeal({ name, date: iso, slot });
              toast.success(`Added ${slot.toLowerCase()}`);
            }} />
          ))}
        </div>
      </section>

      {/* Habits progress -------------------------------------------- */}
      {dueHabits.length > 0 && (
        <section>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="flex items-center gap-1.5"><Sprout className="h-3.5 w-3.5" /> Routines & Habits</span>
            <span className="font-normal normal-case tracking-normal text-muted-foreground/80">{doneHabits} / {dueHabits.length} complete</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${habitPct}%` }} />
          </div>
        </section>
      )}
    </div>
  );
}

function QuickAddRow({ label, onAdd }: { label: string; onAdd: (title: string) => Promise<void> }) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const t = val.trim();
    if (!t || busy) return;
    setBusy(true);
    try { await onAdd(t); setVal(""); } finally { setBusy(false); }
  };
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[11px] font-medium text-muted-foreground">{label}</span>
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
        placeholder="Add task…"
        className="h-8 text-sm"
      />
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={submit} disabled={!val.trim() || busy} aria-label={`Add ${label} task`}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function MealQuickAdd({ slot, onAdd }: { slot: "Breakfast" | "Lunch" | "Dinner" | "Snack"; onAdd: (name: string) => Promise<void> }) {
  const [val, setVal] = useState("");
  const submit = async () => {
    const t = val.trim();
    if (!t) return;
    await onAdd(t); setVal("");
  };
  return (
    <div className="rounded-lg border border-border/50 bg-card/60 p-1.5">
      <div className="px-1 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{slot}</div>
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
        placeholder="+ add"
        className="h-7 px-2 text-xs"
      />
    </div>
  );
}