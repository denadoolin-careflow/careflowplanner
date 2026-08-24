/**
 * One combined rhythm card for Today: moon, cycle and solar (zodiac) season,
 * built from the same modules the planner uses so both pages always agree.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ExternalLink, Moon, ShieldCheck, Sparkles } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DashCard } from "@/components/today/dashboard/DashCard";
import { cn } from "@/lib/utils";
import { getMoonPhase, MOON_INFO, getIllumination } from "@/lib/moon";
import { moonPlanningTip } from "@/lib/planner/moon-planning-tip";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";
import { useCycleSuggestion } from "@/lib/planner/cycle-templates";
import { solarSeasonFor, daysLeftInSolarSeason, ELEMENT_LABEL } from "@/lib/planner/solar-season";
import { applyOverride, useSeasonOverrides } from "@/lib/planner/solar-season-custom";

const OPEN_KEY = "careflow:today:rhythm-open";

function useOpen() {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(OPEN_KEY) !== "0";
  });
  return [open, (v: boolean) => {
    setOpen(v);
    try { window.localStorage.setItem(OPEN_KEY, v ? "1" : "0"); } catch { /* private mode */ }
  }] as const;
}

function Row({ children }: { children: React.ReactNode }) {
  return <p className="text-[12.5px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{children}</p>;
}

function Chips({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {items.slice(0, 4).map(i => (
        <span key={i} className="rounded-full border border-border/50 bg-background/50 px-2 py-0.5 text-[11px] text-foreground/80">
          {i}
        </span>
      ))}
    </div>
  );
}

export function RhythmTodayCard({ date, className }: { date: Date; className?: string }) {
  const [open, setOpen] = useOpen();
  const { periods, settings } = useCycle();
  const suggestion = useCycleSuggestion(date);
  const { overrides } = useSeasonOverrides();

  const moonPhase = getMoonPhase(date);
  const moon = MOON_INFO[moonPhase];
  const illum = Math.round(getIllumination(date) * 100);
  const tip = useMemo(() => moonPlanningTip(date), [date]);

  const cycle = useMemo(() => {
    if (!settings.enabled) return null;
    try { return getPhaseInfo(date, periods, settings); } catch { return null; }
  }, [date, periods, settings]);

  const season = useMemo(() => applyOverride(solarSeasonFor(date), overrides), [date, overrides]);
  const seasonLeft = useMemo(() => daysLeftInSolarSeason(date), [date]);

  return (
    <DashCard
      eyebrow="Rhythm"
      title={
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span aria-hidden>{moon.glyph}</span>
          <span>{moon.label}</span>
          <span aria-hidden className="text-muted-foreground">·</span>
          <span aria-hidden>{season.glyph}</span>
          <span className="text-[13px] font-normal text-muted-foreground">{season.label}</span>
          {cycle && (
            <>
              <span aria-hidden className="text-muted-foreground">·</span>
              <span className="text-[13px] font-normal text-muted-foreground">
                {cycle.label} day {cycle.cycleDay}
              </span>
            </>
          )}
        </span>
      }
      action={
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Collapse rhythm details" : "Expand rhythm details"}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          {open ? "Less" : "More"}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      }
      className={className}
    >
      <Row>{tip.text}</Row>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="sr-only">Toggle rhythm details</CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3">
          {/* Moon */}
          <section className="space-y-1 rounded-2xl border border-border/40 bg-background/40 p-3">
            <h4 className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <Moon className="h-3 w-3" aria-hidden /> Moon
            </h4>
            <Row>{moon.label} · {illum}% lit · {ELEMENT_LABEL[season.element]} season sky</Row>
            <Link
              to="/cosmic-flow"
              className="inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline"
            >
              Open Cosmic Flow <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>
          </section>

          {/* Cycle */}
          <section className="space-y-1.5 rounded-2xl border border-border/40 bg-background/40 p-3">
            <h4 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Cycle</h4>
            {!cycle ? (
              <Row>
                Cycle tracking is off. <Link to="/health" className="text-primary hover:underline">Log a period</Link> to see your phase here.
              </Row>
            ) : (
              <>
                <Row>
                  Day {cycle.cycleDay} of {cycle.cycleLength} ·{" "}
                  {cycle.daysUntilNextPeriod === 0 ? "period due" : `${cycle.daysUntilNextPeriod}d to next`}
                </Row>
                <p className="text-[12.5px] italic leading-snug text-foreground/80">{cycle.invitation}</p>
                {suggestion && (
                  <>
                    <Row>
                      Suggested shape: {suggestion.shape.priorities}{" "}
                      {suggestion.shape.priorities === 1 ? "priority" : "priorities"} ·{" "}
                      {suggestion.shape.blockMinutes}-minute blocks
                    </Row>
                    <p className="flex items-start gap-1.5 text-[12px] text-muted-foreground">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="[overflow-wrap:anywhere]">{suggestion.dayNudge}</span>
                    </p>
                  </>
                )}
                <Link to="/health" className="inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline">
                  Open Health <ExternalLink className="h-3 w-3" aria-hidden />
                </Link>
              </>
            )}
          </section>

          {/* Solar season */}
          <section className="space-y-1.5 rounded-2xl border border-border/40 bg-background/40 p-3">
            <h4 className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <Sparkles className="h-3 w-3" aria-hidden /> {season.label}
            </h4>
            <Row>{season.theme} · {seasonLeft.days}d left</Row>
            <Row>{season.energy}</Row>
            <div className="space-y-1.5 pt-0.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Focus</p>
              <Chips items={season.focus} />
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Habits</p>
              <Chips items={season.habits} />
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Meals</p>
              <Chips items={season.meals} />
            </div>
            <Link to="/planner" className="inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline">
              Customise on the planner <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>
          </section>
        </CollapsibleContent>
      </Collapsible>
    </DashCard>
  );
}
