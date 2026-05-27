import { useMemo } from "react";
import { parseISO, format, differenceInCalendarYears } from "date-fns";
import { MemoryCard } from "./MemoryCard";
import type { Memory } from "@/lib/memories";

export function OnThisDayCard({ memories, onOpen }: {
  memories: Memory[];
  onOpen: (m: Memory) => void;
}) {
  const matches = useMemo(() => {
    const today = new Date();
    const md = format(today, "MM-dd");
    return memories
      .filter((m) => format(parseISO(m.date), "MM-dd") === md)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [memories]);

  if (matches.length === 0) return null;

  return (
    <div className="rounded-3xl border border-[hsl(350_45%_85%/0.6)] bg-[hsl(350_60%_98%/0.7)] p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[hsl(350_45%_45%)]">On this day</div>
          <div className="font-display text-lg">{format(new Date(), "MMMM d")}</div>
        </div>
        <div className="text-xs text-muted-foreground">{matches.length} {matches.length === 1 ? "memory" : "memories"}</div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((m) => {
          const years = differenceInCalendarYears(new Date(), parseISO(m.date));
          return (
            <div key={m.id} className="relative">
              <MemoryCard memory={m} variant="compact" onClick={() => onOpen(m)} />
              {years > 0 && (
                <span className="absolute right-2 top-2 rounded-full bg-[hsl(350_55%_60%)] px-2 py-0.5 text-[10px] font-medium text-white shadow">
                  {years}y ago
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}