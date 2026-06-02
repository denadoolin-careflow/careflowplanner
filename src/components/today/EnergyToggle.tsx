import { Battery, BatteryLow, BatteryFull } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDayEnergy, type Energy } from "@/lib/energy-store";

const OPTIONS: { key: Energy; label: string; icon: typeof Battery }[] = [
  { key: "low", label: "Low", icon: BatteryLow },
  { key: "medium", label: "Steady", icon: Battery },
  { key: "high", label: "Bright", icon: BatteryFull },
];

/**
 * 3-button energy check-in for the day. Persisted per ISO date.
 * Visual language borrowed from Lunar Life Home's EnergyToggle.
 */
export function EnergyToggle({ dateISO, className }: { dateISO: string; className?: string }) {
  const [energy, setEnergy] = useDayEnergy(dateISO);
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/70 p-1 shadow-[var(--shadow-soft)]",
        className,
      )}
      role="radiogroup"
      aria-label="Today's energy"
    >
      {OPTIONS.map(({ key, label, icon: Icon }) => {
        const active = energy === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setEnergy(key)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}