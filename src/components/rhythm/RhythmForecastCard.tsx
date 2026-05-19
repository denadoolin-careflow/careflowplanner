import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { getRhythmForecast } from "@/lib/rhythm-forecast";
import { useMoonDataVersion } from "@/lib/moon-providers";
import { PlanWithEnergyDialog } from "./PlanWithEnergyDialog";

/**
 * Element tint palette used to color the Rhythm Forecast card after the
 * day's moon sign element. Soft, calming, caregiver-friendly hues.
 *   earth = green · water = blue · air = yellow · fire = orange
 */
const ELEMENT_TINT: Record<"fire" | "earth" | "air" | "water", {
  ring: string; glow1: string; glow2: string; chip: string; chipText: string;
}> = {
  fire:  { ring: "hsl(20 80% 55% / 0.35)",  glow1: "hsl(20 90% 60% / 0.22)",  glow2: "hsl(35 95% 60% / 0.16)",  chip: "hsl(20 80% 55% / 0.18)",  chipText: "hsl(15 70% 30%)" },
  earth: { ring: "hsl(140 45% 40% / 0.32)", glow1: "hsl(140 55% 45% / 0.20)", glow2: "hsl(95 50% 55% / 0.16)",  chip: "hsl(140 45% 45% / 0.18)", chipText: "hsl(140 50% 22%)" },
  air:   { ring: "hsl(48 90% 55% / 0.38)",  glow1: "hsl(48 95% 60% / 0.22)",  glow2: "hsl(40 90% 65% / 0.16)",  chip: "hsl(48 90% 55% / 0.22)",  chipText: "hsl(38 70% 28%)" },
  water: { ring: "hsl(210 75% 55% / 0.32)", glow1: "hsl(210 80% 60% / 0.22)", glow2: "hsl(195 70% 65% / 0.16)", chip: "hsl(210 75% 55% / 0.20)", chipText: "hsl(215 60% 28%)" },
};

interface Props {
  date?: Date;
  /** "widget" = compact dashboard card; "today" = wider "Today's Energy" card */
  variant?: "widget" | "today";
  className?: string;
}

/**
 * Rhythm Forecast — gentle astrology/lunar planning hint.
 * Caregiver-friendly language, no horoscope tone.
 */
export function RhythmForecastCard({ date = new Date(), variant = "widget", className }: Props) {
  useMoonDataVersion();
  const f = getRhythmForecast(date);
  const [planOpen, setPlanOpen] = useState(false);
  const tint = ELEMENT_TINT[f.element];

  return (
    <section
      aria-label="Rhythm forecast"
      className={cn(
        "relative overflow-hidden rounded-2xl ring-1 shadow-soft backdrop-blur-md transition-colors",
        "bg-gradient-to-br from-card/90 via-card/70 to-card/90 p-4",
        className,
      )}
      style={{ boxShadow: `0 0 0 1px ${tint.ring}, 0 8px 24px -12px ${tint.glow1}` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background: `radial-gradient(ellipse at top right, ${tint.glow1}, transparent 65%), radial-gradient(ellipse at bottom left, ${tint.glow2}, transparent 70%)`,
        }}
      />

      <header className="flex items-start gap-3">
        <div className="relative shrink-0">
          <span
            aria-hidden
            className="absolute inset-[-6px] rounded-full blur-md"
            style={{ background: `radial-gradient(circle, ${tint.glow1}, transparent 70%)` }}
          />
          <MoonGlyph date={date} size={variant === "today" ? 52 : 44} className="relative" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Rhythm Forecast</p>
            <span
              className="rounded-full px-1.5 py-px text-[9px] font-medium uppercase tracking-wider"
              style={{ background: tint.chip, color: tint.chipText }}
              title={`Moon in ${f.sign.sign} — ${f.element} element`}
            >
              {f.element}
            </span>
          </div>
          <p className="font-display text-base leading-tight">
            {f.phaseLabel} <span className="text-muted-foreground">·</span> Moon in {f.sign.glyph} {f.sign.sign}
          </p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {f.illumination}% lit · {f.elementLine.split(" — ")[0]}
          </p>
        </div>
      </header>

      <div className="mt-3 space-y-2 text-[12.5px] text-foreground/85">
        <p>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Energy</span>
          <br />
          {f.guidance.keywords.join(" · ")}
        </p>

        {variant === "today" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-primary-soft/40 p-2.5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Do more</p>
              <p className="text-[12.5px]">{f.guidance.doMore.join(", ")}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Do less</p>
              <p className="text-[12.5px]">{f.guidance.doLess.join(", ")}</p>
            </div>
            <p className="italic text-foreground/80 sm:col-span-2">{f.guidance.caregiverNote}</p>
            <p className="text-[12px] text-muted-foreground sm:col-span-2">
              {f.sign.insight}
            </p>
          </div>
        ) : (
          <>
            <p className="italic text-foreground/80">{f.guidance.suggestion}</p>
            <p className="text-[11.5px] text-muted-foreground">{f.sign.insight}</p>
          </>
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-full text-xs"
          onClick={() => setPlanOpen(true)}
        >
          <Sparkles className="mr-1 h-3.5 w-3.5" /> Plan with this energy
        </Button>
      </div>

      <PlanWithEnergyDialog open={planOpen} onOpenChange={setPlanOpen} date={date} forecast={f} />
    </section>
  );
}
