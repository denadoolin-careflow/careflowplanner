import { useTempUnit } from "@/lib/weather-store";
import { cn } from "@/lib/utils";

export function UnitToggle({ className }: { className?: string }) {
  const [unit, setUnit] = useTempUnit();
  return (
    <div className={cn("inline-flex rounded-full border border-border/60 bg-muted/40 p-0.5", className)}>
      {(["C", "F"] as const).map(u => (
        <button
          key={u}
          type="button"
          onClick={() => setUnit(u)}
          className={cn(
            "h-5 min-w-[24px] rounded-full px-1.5 text-[10px] font-semibold transition-colors",
            unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
          aria-pressed={unit === u}
        >
          °{u}
        </button>
      ))}
    </div>
  );
}