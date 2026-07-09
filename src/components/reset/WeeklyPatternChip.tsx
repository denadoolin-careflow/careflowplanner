import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useResetHistory } from "@/lib/reset-history";
import { cn } from "@/lib/utils";

function startOfWeek(d: Date) {
  const x = new Date(d); const day = x.getDay();
  x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x;
}

export function WeeklyPatternChip({ onClick }: { onClick?: () => void }) {
  const { rows } = useResetHistory(14);

  const stats = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now).getTime();
    const lastWeekStart = thisWeekStart - 7 * 24 * 60 * 60 * 1000;
    let thisWeek = 0, lastWeek = 0;
    const dayCounts: Record<number, number> = {};
    const hourCounts: Record<number, number> = {};
    for (const r of rows) {
      const t = new Date(r.completed_at).getTime();
      if (t >= thisWeekStart) thisWeek++;
      else if (t >= lastWeekStart) lastWeek++;
      const d = new Date(r.completed_at);
      dayCounts[d.getDay()] = (dayCounts[d.getDay()] ?? 0) + 1;
      hourCounts[d.getHours()] = (hourCounts[d.getHours()] ?? 0) + 1;
    }
    const delta = thisWeek - lastWeek;
    const topDay = Object.entries(dayCounts).sort((a,b) => b[1] - a[1])[0];
    const topHour = Object.entries(hourCounts).sort((a,b) => b[1] - a[1])[0];
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const partOf = (h: number) =>
      h < 12 ? "mornings" : h < 17 ? "afternoons" : "evenings";
    const pattern = topDay
      ? `${dayNames[Number(topDay[0])]} ${topHour ? partOf(Number(topHour[0])) : ""}`.trim()
      : "";
    return { thisWeek, lastWeek, delta, pattern };
  }, [rows]);

  if (stats.thisWeek === 0 && stats.lastWeek === 0) return null;

  const Icon = stats.delta > 0 ? TrendingUp : stats.delta < 0 ? TrendingDown : Minus;
  const tone =
    stats.delta > 0 ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 ring-emerald-500/20"
    : stats.delta < 0 ? "text-amber-700 dark:text-amber-300 bg-amber-500/10 ring-amber-500/20"
    : "text-muted-foreground bg-muted ring-border/40";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition-colors hover:brightness-110",
        tone,
      )}
      title={stats.pattern ? `You reset most often on ${stats.pattern}` : undefined}
    >
      <Icon className="h-3 w-3" />
      {stats.thisWeek} this week
      {stats.delta !== 0 && (
        <span className="opacity-80">· {stats.delta > 0 ? "+" : ""}{stats.delta}</span>
      )}
      {stats.pattern && <span className="opacity-70">· {stats.pattern}</span>}
    </button>
  );
}