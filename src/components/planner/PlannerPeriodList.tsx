import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useStore } from "@/lib/store";
import { useTimeBlocks } from "@/lib/time-blocks";
import { PlannerTaskRow } from "./PlannerTaskRow";
import { Sunrise, Sun, Moon } from "lucide-react";
import type { PlannerPeriod } from "./PlannerPeriodTabs";

const RANGES: Record<Exclude<PlannerPeriod, "grid">, { start: number; end: number; label: string; Icon: React.ComponentType<{ className?: string }>; tint: string }> = {
  morning:   { start: 5,  end: 12, label: "Morning",   Icon: Sunrise, tint: "from-amber-500/10 to-transparent" },
  afternoon: { start: 12, end: 17, label: "Afternoon", Icon: Sun,     tint: "from-sky-500/10 to-transparent" },
  evening:   { start: 17, end: 22, label: "Evening",   Icon: Moon,    tint: "from-violet-500/10 to-transparent" },
};

function hmToMin(hm?: string | null): number | null {
  if (!hm || !/^\d{2}:\d{2}/.test(hm)) return null;
  const [h, m] = hm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export function PlannerPeriodList({ date, period }: { date: Date; period: Exclude<PlannerPeriod, "grid"> }) {
  const { state } = useStore();
  const iso = format(date, "yyyy-MM-dd");
  const { blocks } = useTimeBlocks(iso, iso);
  const range = RANGES[period];

  const items = useMemo(() => {
    const startM = range.start * 60;
    const endM = range.end * 60;
    const blockStartByTask = new Map<string, string>();
    for (const b of blocks) if (b.taskId) blockStartByTask.set(b.taskId, b.startTime);
    const arr = state.tasks
      .filter(t => t.dueDate === iso)
      .map(t => ({ t, m: hmToMin(blockStartByTask.get(t.id) ?? t.startTime) }))
      .filter(x => x.m != null && x.m! >= startM && x.m! < endM)
      .sort((a, b) => a.m! - b.m!);
    return arr;
  }, [state.tasks, blocks, iso, range.start, range.end]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div className={`flex items-center gap-2 border-b border-border/60 bg-gradient-to-r ${range.tint} px-4 py-2.5`}>
        <range.Icon className="h-4 w-4 opacity-70" />
        <div className="text-sm font-semibold">{range.label}</div>
        <div className="text-[11px] text-muted-foreground">{items.length} scheduled</div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="grid h-full place-items-center text-sm text-muted-foreground">Nothing scheduled in this window.</p>
        ) : (
          <div className="space-y-1.5">
            {items.map(({ t, m }) => (
              <div key={t.id} className="flex items-start gap-3">
                <span className="mt-1 shrink-0 rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
                  {formatTime(m!)}
                </span>
                <div className="min-w-0 flex-1">
                  <PlannerTaskRow task={t} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const s = h < 12 ? "a" : "p";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${s}` : `${h12}:${String(m).padStart(2, "0")}${s}`;
}