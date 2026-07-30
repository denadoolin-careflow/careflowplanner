import { BURNOUT_META, useBurnoutCheckIn, type BurnoutLevel } from "@/lib/burnout-checkin";
import { cn } from "@/lib/utils";
import { DashCard } from "./DashCard";

const OPTIONS: { level: BurnoutLevel; emoji: string; label: string }[] = [
  { level: "spacious", emoji: "😊", label: "Full" },
  { level: "steady",   emoji: "🙂", label: "Good" },
  { level: "tender",   emoji: "😐", label: "Low" },
  { level: "depleted", emoji: "😞", label: "Barely surviving" },
];

export function CapacityCard({ date }: { date: Date }) {
  const { entry, setLevel } = useBurnoutCheckIn(date);
  const current = entry.level;

  return (
    <DashCard eyebrow="Capacity" title="How's your capacity today?">
      <div role="radiogroup" aria-label="Capacity today" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {OPTIONS.map((o) => {
          const active = current === o.level;
          return (
            <button
              key={o.level}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setLevel(active ? null : o.level)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center transition-all duration-200",
                active
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border/50 bg-background/40 text-muted-foreground hover:bg-muted/40",
              )}
            >
              <span className="text-xl" aria-hidden>{o.emoji}</span>
              <span className="text-[11px] font-medium leading-tight">{o.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
        {current
          ? BURNOUT_META[current].hint
          : "Pick one and today's plan softens or stretches to match."}
      </p>
    </DashCard>
  );
}