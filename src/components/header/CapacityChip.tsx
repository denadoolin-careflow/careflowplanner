import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUp, CalendarClock, Gauge, Sparkles, Zap } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore, todayISO } from "@/lib/store";
import { useCycle } from "@/lib/cycle-store";
import { computeCapacityScore, CAPACITY_BAND_COLOR, findBetterDay } from "@/lib/capacity";
import { setEnergyFor, type Energy } from "@/lib/energy-store";
import { FlowCard, FlowCardEyebrow, FlowCardTitle } from "@/components/ui/flow-card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function CapacityChip({ className }: { className?: string }) {
  const { state } = useStore();
  const { periods, settings: cycleSettings } = useCycle();
  const iso = todayISO();

  const score = useMemo(
    () => computeCapacityScore({ state, periods, cycleSettings }),
    // recompute when the day, tasks, or cycle inputs change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [iso, state.tasks, periods, cycleSettings.enabled],
  );

  const betterDay = useMemo(
    () => (score.band === "rest" || score.band === "soft")
      ? findBetterDay({ periods, cycleSettings }, { minBand: "steady", lookahead: 10 })
      : null,
    [score.band, periods, cycleSettings],
  );

  const color = CAPACITY_BAND_COLOR[score.band];
  const ringStyle = {
    background: `conic-gradient(${color} ${score.score * 3.6}deg, hsl(var(--muted)) 0)`,
  } as React.CSSProperties;

  const logEnergy = (e: Energy) => {
    setEnergyFor(iso, e);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Capacity ${score.score} of 100 — ${score.bandLabel}`}
          title={`Capacity ${score.score} · ${score.bandLabel}`}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-muted px-1 py-1 text-foreground transition hover:bg-muted/80 sm:pr-2.5",
            className,
          )}
        >
          <span
            className="relative grid h-6 w-6 place-items-center rounded-full"
            style={ringStyle}
            aria-hidden
          >
            <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-background text-[10px] font-semibold tabular-nums">
              {score.score}
            </span>
          </span>
          <span className="hidden text-[11px] font-medium leading-none sm:inline">
            {score.bandLabel}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 border-0 bg-transparent p-0 shadow-none">
        <FlowCard tone="today" size="md">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <FlowCardEyebrow className="flex items-center gap-1.5">
                <Gauge className="h-3 w-3" /> Capacity today
              </FlowCardEyebrow>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-3xl font-semibold tabular-nums" style={{ color }}>
                  {score.score}
                </span>
                <FlowCardTitle className="text-base">{score.bandLabel}</FlowCardTitle>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {score.suggestion}
              </p>
            </div>
          </div>

          <ul className="mt-4 space-y-1.5">
            {score.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-muted">
                  {r.delta > 0 ? <ArrowUp className="h-3 w-3 text-emerald-500" />
                   : r.delta < 0 ? <ArrowDown className="h-3 w-3 text-rose-500" />
                   : <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block leading-snug text-foreground">{r.label}</span>
                  {r.note && <span className="block text-[11px] leading-snug text-muted-foreground">{r.note}</span>}
                </span>
                <span className={cn(
                  "tabular-nums text-[11px] font-medium",
                  r.delta > 0 ? "text-emerald-600" : r.delta < 0 ? "text-rose-600" : "text-muted-foreground",
                )}>
                  {r.delta > 0 ? "+" : ""}{r.delta || "·"}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-border/40 pt-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Log energy
            </div>
            <div className="mt-1.5 flex gap-1">
              {(["low", "medium", "high"] as Energy[]).map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => logEnergy(e)}
                  className="flex-1 rounded-full border border-border/60 px-2 py-1 text-[11px] capitalize text-foreground hover:bg-muted"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
            <Link to="/today" className="inline-flex items-center gap-1 text-primary hover:underline">
              <Zap className="h-3 w-3" /> Open Today
            </Link>
            <Link to="/cosmic-flow" className="inline-flex items-center gap-1 text-primary hover:underline">
              <Sparkles className="h-3 w-3" /> Cosmic
            </Link>
          </div>

          {betterDay && (
            <div className="mt-3 rounded-lg border border-border/40 bg-muted/40 p-2.5 text-[11.5px]">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <CalendarClock className="h-3 w-3" /> Defer to a better day
              </div>
              <p className="mt-1 leading-snug">
                <span className="font-medium text-foreground">{format(betterDay.date, "EEEE, MMM d")}</span>{" "}
                looks <span style={{ color: CAPACITY_BAND_COLOR[betterDay.score.band] }}>{betterDay.score.bandLabel.toLowerCase()}</span> ({betterDay.score.score}). Push the harder thing.
              </p>
            </div>
          )}
        </FlowCard>
      </PopoverContent>
    </Popover>
  );
}