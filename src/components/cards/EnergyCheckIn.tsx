import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { Energy } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";

const OPTS: { v: Energy; label: string; emoji: string }[] = [
  { v: "low", label: "Low", emoji: "🌙" },
  { v: "medium", label: "Steady", emoji: "🌿" },
  { v: "high", label: "Bright", emoji: "🌼" },
];

export function EnergyCheckIn({ compact = false }: { compact?: boolean }) {
  const { state, setEnergyToday } = useStore();
  const navigate = useNavigate();
  const { settings, periods } = useCycle();
  const today = new Date();
  const moon = MOON_INFO[getMoonPhase(today)];
  const phaseInfo = settings.enabled ? getPhaseInfo(today, periods, settings) : null;

  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const open = () => navigate("/rhythm");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-xl px-1 py-0.5 -mx-1 transition-colors hover:bg-muted/40",
        compact ? "" : "flex-wrap",
      )}
      title="Open rhythm overview"
    >
      {!compact && <span className="text-xs text-muted-foreground">Energy?</span>}
      {OPTS.map(o => (
        <Button
          key={o.v}
          size="sm"
          variant={state.energyToday === o.v ? "default" : "outline"}
          className="h-7 rounded-full px-2.5 text-xs"
          onClick={(e) => { stop(e); setEnergyToday(o.v); }}
        >
          <span className="mr-1 text-xs">{o.emoji}</span>{o.label}
        </Button>
      ))}

      <span
        className="inline-flex h-7 items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2 text-[11px] text-foreground/80"
        title={`${moon.label} · ${moon.invitation}`}
      >
        <span>{moon.glyph}</span>
        <span className="hidden sm:inline">{moon.label}</span>
      </span>

      {phaseInfo ? (
        <span
          className="inline-flex h-7 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 text-[11px] text-foreground/90"
          title={`${phaseInfo.label} · ${phaseInfo.invitation}`}
        >
          <span>{phaseInfo.glyph}</span>
          <span className="hidden sm:inline">{phaseInfo.label}</span>
          <span className="text-muted-foreground">· day {phaseInfo.cycleDay}</span>
        </span>
      ) : (
        <span className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-border/60 px-2 text-[11px] text-muted-foreground">
          🌙 {settings.enabled ? "Log period" : "Cycle off"}
        </span>
      )}

      <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wider text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        Open rhythm <ChevronRight className="h-3 w-3" />
      </span>
    </div>
  );
}
