import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrends } from "@/lib/wellflow/trends";

/** Compact 7d / 30d averages so Today answers "how's it going?" at a glance. */
export function TrendStrip({ onOpenTab }: { onOpenTab?: (tab: "food" | "progress" | "glp1") => void }) {
  const { week, month, loading } = useTrends();
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const s = range === "7d" ? week : month;

  if (loading) return <div className="h-20 animate-pulse rounded-2xl bg-muted/40" />;
  if (!s) return null;

  const Arrow = s.weightChange == null || s.weightChange === 0
    ? Minus : s.weightChange < 0 ? ArrowDownRight : ArrowUpRight;

  return (
    <div className="rounded-2xl bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Averages · {s.daysLogged} day{s.daysLogged === 1 ? "" : "s"} logged
        </p>
        <div className="flex gap-1">
          {(["7d", "30d"] as const).map(r => (
            <button key={r} type="button" onClick={() => setRange(r)} aria-pressed={range === r}
                    className={cn("rounded-full border px-2 py-0.5 text-[11px]",
                      range === r ? "border-primary bg-primary/15 font-medium"
                                  : "border-border/60 text-muted-foreground")}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
        <Cell label="Calories" value={String(s.avgCalories)} onClick={() => onOpenTab?.("food")} />
        <Cell label="Protein" value={`${s.avgProtein}g`} onClick={() => onOpenTab?.("food")} />
        <Cell label="Fiber" value={`${s.avgFiber}g`} onClick={() => onOpenTab?.("food")} />
        <Cell label="Water" value={`${s.avgWater}oz`} onClick={() => onOpenTab?.("food")} />
        <Cell
          label="Weight"
          value={s.weightChange == null ? "—" : `${s.weightChange > 0 ? "+" : ""}${s.weightChange} lb`}
          icon={<Arrow className="h-3 w-3" />}
          onClick={() => onOpenTab?.("progress")}
        />
        <Cell label="Injections" value={String(s.injections)} onClick={() => onOpenTab?.("glp1")} />
      </div>
    </div>
  );
}

function Cell({
  label, value, icon, onClick,
}: { label: string; value: string; icon?: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
            className="rounded-xl px-1 py-1.5 text-center transition-colors hover:bg-muted/60">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="flex items-center justify-center gap-0.5 text-sm font-semibold tabular-nums">
        {value}{icon}
      </p>
    </button>
  );
}
