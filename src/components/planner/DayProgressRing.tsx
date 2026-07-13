import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useStore } from "@/lib/store";

/** Small circular progress ring for the planner rhythm header. */
export function DayProgressRing({ date, size = 40 }: { date: Date; size?: number }) {
  const { state } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const { pct, status } = useMemo(() => {
    const dayTasks = state.tasks.filter(t => t.dueDate === iso && !t.parentTaskId);
    const total = dayTasks.length;
    const done = dayTasks.filter(t => t.done).length;
    const p = total === 0 ? 0 : Math.round((done / total) * 100);
    const s = total === 0 ? "Soft" : p >= 80 ? "Almost there" : p >= 40 ? "On track" : "Getting started";
    return { pct: p, status: s };
  }, [state.tasks, iso]);

  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/60 px-3 py-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeOpacity={0.12} strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            className="text-primary"
            stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" fill="none"
            strokeDasharray={c} strokeDashoffset={off}
            style={{ transition: "stroke-dashoffset 500ms ease" }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-[10px] font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="leading-tight">
        <p className="text-xs font-semibold">Day Progress</p>
        <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {status}
        </p>
      </div>
    </div>
  );
}