import { useStore } from "@/lib/store";
import { Flame } from "lucide-react";

export function HabitProgressBar({ dateISO, compact = true }: { dateISO: string; compact?: boolean }) {
  const { state } = useStore();
  const habits = state.habits.filter(h => h.cadence === "daily");
  if (habits.length === 0) return null;
  const done = habits.filter(h => h.log[dateISO]).length;
  const pct = Math.round((done / habits.length) * 100);
  return (
    <div className={compact ? "mb-2" : "mb-3"}>
      <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" /> Habits</span>
        <span className="tabular-nums">{done}/{habits.length}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}