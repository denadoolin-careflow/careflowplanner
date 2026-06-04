import { useMemo } from "react";
import { format } from "date-fns";
import { CheckCircle2, Star, Moon, Zap, TrendingUp, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useDayEnergy } from "@/lib/energy-store";
import { getMoonData } from "@/lib/moon-providers";

type ChipTone = "sage" | "gold" | "lavender" | "blush" | "sky" | "ember";

const TONE: Record<ChipTone, string> = {
  sage:     "bg-emerald-100/60 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100",
  gold:     "bg-amber-100/70 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100",
  lavender: "bg-violet-100/60 text-violet-900 dark:bg-violet-900/30 dark:text-violet-100",
  blush:    "bg-rose-100/60 text-rose-900 dark:bg-rose-900/30 dark:text-rose-100",
  sky:      "bg-sky-100/60 text-sky-900 dark:bg-sky-900/30 dark:text-sky-100",
  ember:    "bg-orange-100/70 text-orange-900 dark:bg-orange-900/30 dark:text-orange-100",
};

function Chip({ icon: Icon, label, value, tone }: {
  icon: typeof CheckCircle2; label: string; value: string; tone: ChipTone;
}) {
  return (
    <div className="flex w-full items-center gap-2 rounded-2xl border border-border/50 bg-card/70 px-2.5 py-2 shadow-soft backdrop-blur-sm sm:w-auto sm:min-w-[7.5rem] sm:flex-1 sm:gap-2.5 sm:px-3 sm:py-2.5">
      <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full sm:h-9 sm:w-9", TONE[tone])}>
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-base font-semibold leading-none text-foreground sm:text-lg">{value}</div>
        <div className="mt-0.5 truncate text-[9px] uppercase tracking-wider text-muted-foreground sm:text-[10px]">{label}</div>
      </div>
    </div>
  );
}

function computeStreak(allDates: Set<string>, today: Date): number {
  let streak = 0;
  const d = new Date(today);
  // Walk backward day by day
  // Cap at 90 to avoid runaway loops.
  for (let i = 0; i < 90; i++) {
    const k = format(d, "yyyy-MM-dd");
    if (allDates.has(k)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function DailySnapshotRow({ date }: { date: Date }) {
  const { state } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const [energy] = useDayEnergy(iso);
  const moon = getMoonData(date);

  const stats = useMemo(() => {
    const todays = state.tasks.filter(t => t.dueDate === iso && !t.parentTaskId && t.status !== "parked");
    const done = todays.filter(t => t.done).length;
    const total = todays.length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    const wins = todays.filter(t => t.done && (t.isTopThree || t.priority === "high")).length;

    // Streak: consecutive days with at least one completed task ending today.
    const completed = new Set<string>();
    for (const t of state.tasks) {
      if (!t.done) continue;
      const day = t.lastCompletedAt ? t.lastCompletedAt.slice(0, 10) : (t.dueDate ?? null);
      if (day) completed.add(day);
    }
    const streak = computeStreak(completed, date);
    return { done, total, pct, wins, streak };
  }, [state.tasks, iso, date]);

  const energyLabel = energy === "low" ? "Low" : energy === "high" ? "Bright" : "Steady";

  return (
    <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-2.5">
      <Chip icon={CheckCircle2} label={`${stats.total} planned`} value={`${stats.done}`} tone="sage" />
      <Chip icon={Star} label="Wins today" value={`${stats.wins}`} tone="gold" />
      <Chip icon={TrendingUp} label="Complete" value={`${stats.pct}%`} tone="sky" />
      <Chip icon={Zap} label={`${energyLabel} energy`} value={energyLabel} tone="ember" />
      <Chip icon={Moon} label="Moon" value={moon.glyph} tone="lavender" />
      <Chip icon={Flame} label="Day streak" value={`${stats.streak}`} tone="blush" />
    </div>
  );
}