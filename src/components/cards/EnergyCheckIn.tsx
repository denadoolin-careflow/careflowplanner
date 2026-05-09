import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { Energy } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTS: { v: Energy; label: string; emoji: string }[] = [
  { v: "low", label: "Low", emoji: "🌙" },
  { v: "medium", label: "Steady", emoji: "🌿" },
  { v: "high", label: "Bright", emoji: "🌼" },
];

export function EnergyCheckIn({ compact = false }: { compact?: boolean }) {
  const { state, setEnergyToday } = useStore();
  return (
    <div className={cn("flex items-center gap-2", compact ? "" : "flex-wrap")}>
      {!compact && <span className="text-xs text-muted-foreground">Energy?</span>}
      {OPTS.map(o => (
        <Button
          key={o.v}
          size="sm"
          variant={state.energyToday === o.v ? "default" : "outline"}
          className="h-7 rounded-full px-2.5 text-xs"
          onClick={() => setEnergyToday(o.v)}
        >
          <span className="mr-1 text-xs">{o.emoji}</span>{o.label}
        </Button>
      ))}
    </div>
  );
}
