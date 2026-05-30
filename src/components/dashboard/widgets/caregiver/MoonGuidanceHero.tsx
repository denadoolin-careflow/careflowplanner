import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";
import { getMoonPhase, getIllumination, MOON_INFO } from "@/lib/moon";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { useWeekForecast } from "@/lib/use-week-forecast";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, Wand2 } from "lucide-react";

function cToF(c: number) { return Math.round(c * 9 / 5 + 32); }

function energyLabel(level: "low" | "medium" | "high"): string {
  if (level === "low") return "Low Energy";
  if (level === "high") return "High Energy";
  return "Steady Energy";
}

/**
 * Hero card combining moon phase, illumination, cycle phase, weather and a
 * single guiding affirmation. Renders its own card chrome — register with
 * `bare: true`.
 */
export function MoonGuidanceHero() {
  const { settings, periods } = useCycle();
  const now = new Date();
  const phase = getMoonPhase(now);
  const illum = getIllumination(now);
  const info = MOON_INFO[phase];
  const cycle = useMemo(
    () => (settings.enabled ? getPhaseInfo(now, periods, settings) : null),
    [settings, periods, now],
  );
  const { days } = useWeekForecast();
  const todayWx = days?.[0];

  const energy = cycle ? energyLabel(cycle.energyFloor) : energyLabel("medium");
  const affirmation = cycle?.affirmation ?? info.affirmation;

  return (
    <div
      className="relative h-full overflow-hidden rounded-3xl border border-secondary/40 p-6 sm:p-7"
      style={{
        background:
          "linear-gradient(135deg, hsl(145 35% 92%) 0%, hsl(36 45% 96%) 50%, hsl(265 45% 94%) 100%)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-50 blur-3xl"
        style={{ background: "hsl(265 50% 75% / 0.45)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full opacity-40 blur-3xl"
        style={{ background: "hsl(42 60% 78% / 0.5)" }}
      />

      <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center justify-center">
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 -m-3 rounded-full opacity-70 animate-pulse"
              style={{ background: "radial-gradient(closest-side, hsl(265 50% 80% / 0.45), transparent)" }}
            />
            <MoonGlyph size={88} className="relative" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-secondary-foreground/70">
            <Sparkles className="h-3 w-3" /> Moon Guidance
          </p>
          <h2 className="mt-0.5 font-display text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
            {info.label}
          </h2>
          <p className="mt-0.5 text-sm text-foreground/70">
            {illum}% Lit
          </p>
          <p className="mt-1 text-xs text-foreground/65">
            {energy}
            {cycle ? ` • Day ${cycle.cycleDay} ${cycle.label}` : ""}
            {todayWx ? ` • ${cToF(todayWx.highC)}° ${todayWx.label}` : ""}
          </p>

          <blockquote className="mt-3 max-w-md font-display text-base italic leading-snug text-foreground/85 sm:text-lg">
            "{affirmation}"
          </blockquote>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary" className="rounded-full">
              <Link to="/today"><BookOpen className="mr-1 h-3.5 w-3.5" /> Read More</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link to="/today?focus=lunar"><Sparkles className="mr-1 h-3.5 w-3.5" /> Lunar Insights</Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full"
              onClick={() => window.dispatchEvent(new CustomEvent("careflow:plan-with-energy"))}
            >
              <Wand2 className="mr-1 h-3.5 w-3.5" /> Plan With This Energy
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}