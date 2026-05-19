import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { getRhythmForecast } from "@/lib/rhythm-forecast";
import { PlanWithEnergyDialog } from "./PlanWithEnergyDialog";

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
  const f = getRhythmForecast(date);
  const [planOpen, setPlanOpen] = useState(false);

  return (
    <section
      aria-label="Rhythm forecast"
      className={cn(
        "relative overflow-hidden rounded-2xl ring-1 ring-border/60 shadow-soft backdrop-blur-md",
        "bg-gradient-to-br from-card/90 via-card/70 to-card/90 p-4",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at top right, hsl(var(--primary)/0.12), transparent 65%), radial-gradient(ellipse at bottom left, hsl(var(--accent)/0.10), transparent 70%)",
        }}
      />

      <header className="flex items-start gap-3">
        <div className="relative shrink-0">
          <span
            aria-hidden
            className="absolute inset-[-6px] rounded-full blur-md"
            style={{ background: "radial-gradient(circle, hsl(48 80% 70% / 0.30), transparent 70%)" }}
          />
          <MoonGlyph date={date} size={variant === "today" ? 52 : 44} className="relative" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Rhythm Forecast</p>
          <p className="font-display text-base leading-tight">
            {f.phaseLabel} <span className="text-muted-foreground">·</span> {f.sign.glyph} {f.sign.sign}
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
