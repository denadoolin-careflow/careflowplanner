import { MOON_INFO, daysUntilFull, daysUntilNew, getIllumination, getMoonPhase } from "@/lib/moon";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { cn } from "@/lib/utils";

/**
 * Tonight's moon — Lunar Life–inspired widget.
 * Soft starlit backdrop, hand-drawn moon glyph, phase label,
 * illumination percentage, and an "invitation" line per phase.
 */
export function MoonPhaseWidget({ compact = false }: { compact?: boolean }) {
  const now = new Date();
  const phase = getMoonPhase(now);
  const info = MOON_INFO[phase];
  const illum = getIllumination(now);
  const toFull = daysUntilFull(now);
  const toNew = daysUntilNew(now);
  const proximity =
    toFull === 0
      ? "Full tonight"
      : toNew === 0
      ? "New tonight"
      : toFull < toNew
      ? `${toFull} ${toFull === 1 ? "day" : "days"} to full`
      : `${toNew} ${toNew === 1 ? "day" : "days"} to new`;

  return (
    <section
      aria-label="Tonight's moon"
      className={cn(
        "relative overflow-hidden rounded-2xl p-4",
        "bg-gradient-to-br from-card/90 via-card/70 to-card/90",
        "ring-1 ring-border/60 shadow-soft backdrop-blur-md",
      )}
    >
      {/* Soft starlit backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at top, hsl(245 60% 18% / 0.18), transparent 60%), radial-gradient(ellipse at bottom right, hsl(280 50% 30% / 0.14), transparent 70%)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <span className="absolute top-3 left-6 h-1 w-1 rounded-full bg-foreground/40" />
        <span className="absolute top-10 left-20 h-0.5 w-0.5 rounded-full bg-foreground/30" />
        <span className="absolute top-6 right-10 h-0.5 w-0.5 rounded-full bg-foreground/40" />
        <span className="absolute bottom-6 right-20 h-1 w-1 rounded-full bg-foreground/30" />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <span
            aria-hidden
            className="absolute inset-[-8px] rounded-full blur-lg"
            style={{
              background:
                "radial-gradient(circle at center, hsl(48 80% 70% / 0.35), transparent 70%)",
            }}
          />
          <MoonGlyph date={now} size={56} className="relative" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Tonight's moon
          </p>
          <p className="font-display text-base leading-tight">{info.label}</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {illum}% lit · {proximity}
          </p>
        </div>
      </div>
      {!compact && (
        <p className="mt-3 border-t border-border/50 pt-2.5 text-[12.5px] italic text-foreground/85 text-balance">
          {info.invitation}
        </p>
      )}
    </section>
  );
}
