import { useMemo } from "react";
import { format, subDays, parseISO } from "date-fns";
import { type Energy } from "@/lib/energy-store";
import { cn } from "@/lib/utils";

const COLOR: Record<Energy, string> = {
  low: "#ef4444",
  medium: "#eab308",
  high: "#22c55e",
};

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function EnergyTimeline({
  map,
  days = 30,
  compact = false,
  className,
}: {
  map: Record<string, Energy>;
  days?: number;
  compact?: boolean;
  className?: string;
}) {
  const cells = useMemo(() => {
    const today = new Date();
    const out: { iso: string; date: Date; energy: Energy | null }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(today, i);
      const iso = isoDay(d);
      out.push({ iso, date: d, energy: map[iso] ?? null });
    }
    return out;
  }, [map, days]);

  const size = compact ? 10 : 16;

  return (
    <div className={cn("w-full", className)}>
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
      >
        {cells.map(c => (
          <div
            key={c.iso}
            title={`${format(c.date, "EEE, MMM d")} — ${c.energy ?? "no log"}`}
            className="rounded-[3px] border border-border/40"
            style={{
              height: size,
              backgroundColor: c.energy ? COLOR[c.energy] + "cc" : "transparent",
            }}
          />
        ))}
      </div>
      {!compact && (
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{format(parseISO(cells[0].iso), "MMM d")}</span>
          <div className="flex items-center gap-2">
            {(["low", "medium", "high"] as Energy[]).map(e => (
              <span key={e} className="inline-flex items-center gap-1 capitalize">
                <span
                  className="inline-block h-2 w-2 rounded-sm"
                  style={{ backgroundColor: COLOR[e] }}
                />
                {e}
              </span>
            ))}
          </div>
          <span>Today</span>
        </div>
      )}
    </div>
  );
}