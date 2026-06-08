import { useMemo } from "react";
import { getActiveAspects, intensityStars } from "@/lib/cosmic/active-aspects";
import { interpretPlanetInSign, aspectTone } from "@/lib/cosmic/interpretations";
import { Badge } from "@/components/ui/badge";

/**
 * Interpretation-first replacement for the raw transit table. For each of
 * the top active aspects, shows the title, a one-line meaning, and 2–3
 * focus chips derived from the receiving sign.
 */
export function TransitInterpretationList({ date, limit = 4 }: { date: Date; limit?: number }) {
  const aspects = useMemo(() => getActiveAspects(date, limit), [date, limit]);

  return (
    <section className="cozy-card glass-panel p-5" aria-label="Current transits">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="font-display text-base">Current Transits</h3>
        <p className="text-[11px] text-muted-foreground">Interpretation, not raw data.</p>
      </header>

      {aspects.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          A quiet sky — a fine day for steady ordinary things.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {aspects.map((a) => {
            const tone = aspectTone(a.aspect);
            const interp = interpretPlanetInSign(a.a, a.aSign);
            return (
              <li
                key={a.id}
                className={
                  "rounded-2xl border bg-card/70 p-3.5 " +
                  (tone === "harmonic"
                    ? "border-[hsl(var(--aspect-harmonious)/0.35)]"
                    : tone === "tension"
                    ? "border-[hsl(var(--aspect-dynamic)/0.35)]"
                    : "border-border/50")
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[14px] font-medium leading-tight">
                      <span aria-hidden className="text-base">{a.aGlyph}</span>
                      {a.a} {a.aspect} {a.b}
                      <span aria-hidden className="text-base text-muted-foreground">{a.bGlyph}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{a.window} · {a.motion}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[12px] tracking-tight text-primary/80">
                    {intensityStars(a.intensity)}
                  </span>
                </div>

                <p className="mt-1.5 text-[13px] leading-snug">{a.meaning}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-foreground/85">{interp.meaning}</p>

                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Focus</span>
                  {interp.focus.map((f) => (
                    <Badge
                      key={f}
                      variant="secondary"
                      className="rounded-full bg-primary/10 px-2 py-0 text-[11px] font-normal text-primary"
                    >
                      {f}
                    </Badge>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}