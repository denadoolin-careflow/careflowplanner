import { cn } from "@/lib/utils";
import { CAPACITY_META, type MomCapacity } from "@/lib/seasons/zodiac-seasons";

const ORDER: MomCapacity[] = ["light", "full", "survival"];

/** Mom capacity for the month — changes how much the month suggests. */
export function CapacitySelector({
  value, onChange,
}: { value: MomCapacity; onChange: (v: MomCapacity) => void }) {
  return (
    <div>
      <div className="flex gap-2" role="radiogroup" aria-label="Capacity this month">
        {ORDER.map(k => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={value === k}
            onClick={() => onChange(k)}
            className={cn(
              "flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
              value === k ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted/40",
            )}
          >
            {CAPACITY_META[k].label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{CAPACITY_META[value].blurb} The plan adapts to you.</p>
    </div>
  );
}
