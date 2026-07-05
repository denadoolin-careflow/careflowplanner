import { useMemo } from "react";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, getMoonAlignment, MOON_ALIGNMENT_LABEL } from "@/lib/cycle";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function PhaseBadge({
  date = new Date(),
  className,
  onClick,
}: { date?: Date; className?: string; onClick?: () => void }) {
  const { settings, periods } = useCycle();
  const info = useMemo(() => getPhaseInfo(date, periods, settings), [date, periods, settings]);
  if (!settings.enabled) return null;

  if (!info) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-dashed border-border/60 bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground",
          className,
        )}
      >
        🌸 Log first period
      </button>
    );
  }

  const moonPhase = getMoonPhase(date);
  const moonGlyph = MOON_INFO[moonPhase].glyph;
  const last = periods[0];
  const alignment = settings.pairWithMoon && last
    ? getMoonAlignment(getMoonPhase(parseISO(last.periodStart)), settings)
    : null;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card/95 px-2.5 py-1 text-[11px] font-medium text-card-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-card",
              className,
            )}
            style={{
              borderColor: `hsl(var(${info.tokenVar}) / 0.55)`,
              boxShadow: `inset 0 0 0 1px hsl(var(${info.tokenVar}) / 0.15)`,
            }}
          >
            <span aria-hidden>{info.glyph}</span>
            <span>Day {info.cycleDay}</span>
            <span className="opacity-60">·</span>
            <span>{info.label}</span>
            {settings.pairWithMoon && (
              <>
                <span className="opacity-50">·</span>
                <span aria-hidden>{moonGlyph}</span>
              </>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs font-medium">{info.label} · {info.archetype}</p>
          <p className="mt-1 text-[11px] italic opacity-80">{info.invitation}</p>
          <p className="mt-1 text-[11px] opacity-80">{info.daysUntilNextPeriod === 0 ? "Period expected today" : `~${info.daysUntilNextPeriod} days until next period`}</p>
          {info.inFertileWindow && settings.showFertility && (
            <p className="mt-1 text-[11px] opacity-80">🌱 Fertile window</p>
          )}
          {alignment && (
            <p className="mt-1 text-[11px] opacity-80">{MOON_ALIGNMENT_LABEL[alignment]}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
