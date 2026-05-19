import { cn } from "@/lib/utils";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { getMoonResetTip, useRhythmForecastEnabled } from "@/lib/rhythm-forecast";
import { useMoonDataVersion } from "@/lib/moon-providers";

interface Props {
  date?: Date;
  className?: string;
  /** "card" = standalone soft card; "inline" = compact strip */
  variant?: "card" | "inline";
}

/**
 * Tiny moon-aware reset suggestion for Home Reset / Weekly Reset pages.
 * Phase-aware bullets, caregiver-friendly language, never prescriptive.
 */
export function MoonResetTip({ date = new Date(), className, variant = "card" }: Props) {
  const [on] = useRhythmForecastEnabled();
  useMoonDataVersion();
  if (!on) return null;
  const tip = getMoonResetTip(date);

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 text-[12px] text-muted-foreground", className)}>
        <MoonGlyph date={date} size={20} />
        <span><span className="text-foreground/80">{tip.phaseLabel}:</span> {tip.title} · {tip.bullets[0]}</span>
      </div>
    );
  }

  return (
    <section
      aria-label="Moon-aware reset"
      className={cn(
        "relative overflow-hidden rounded-2xl ring-1 ring-border/60 shadow-soft",
        "bg-gradient-to-br from-card/90 via-card/70 to-card/90 p-4",
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <MoonGlyph date={date} size={36} />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Moon-aware reset
          </p>
          <p className="font-display text-sm leading-tight">
            {tip.phaseLabel} · {tip.title}
          </p>
        </div>
      </header>
      <ul className="mt-2 space-y-1 text-[12.5px] text-foreground/85">
        {tip.bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11.5px] italic text-muted-foreground">{tip.note}</p>
    </section>
  );
}
