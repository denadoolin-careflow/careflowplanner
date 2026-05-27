import { Sparkles } from "lucide-react";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";
import { useMemo } from "react";

/**
 * Health Hub hero — Sage Sanctuary atmosphere.
 * Soft botanical gradient, current moon + cycle, gentle affirmation.
 */
export function HealthHero() {
  const { settings, periods } = useCycle();
  const now = new Date();
  const moon = MOON_INFO[getMoonPhase(now)];
  const cycle = useMemo(
    () => (settings.enabled ? getPhaseInfo(now, periods, settings) : null),
    [settings, periods, now],
  );

  const affirmation = cycle?.affirmation ?? moon.affirmation;

  return (
    <header
      className="relative overflow-hidden rounded-3xl border border-secondary/40 p-6 sm:p-8"
      style={{
        background:
          "linear-gradient(135deg, hsl(145 35% 92%) 0%, hsl(36 45% 96%) 55%, hsl(145 30% 88%) 100%)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {/* botanical decorative blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-50 blur-3xl"
        style={{ background: "hsl(145 40% 70% / 0.55)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full opacity-40 blur-3xl"
        style={{ background: "hsl(42 60% 78% / 0.5)" }}
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-secondary-foreground/70">
            <Sparkles className="h-3 w-3" /> Sage Sanctuary
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Your Health Hub
          </h1>
          <p className="mt-2 max-w-md text-sm italic text-foreground/70">
            "{affirmation}"
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-2xl bg-card/70 px-4 py-3 backdrop-blur-sm">
          <MoonGlyph size={48} />
          <div className="text-xs leading-tight">
            <p className="font-display text-base">{moon.label}</p>
            {cycle ? (
              <p className="text-muted-foreground">
                Day {cycle.cycleDay} · {cycle.label}
              </p>
            ) : (
              <p className="text-muted-foreground">A gentle day to begin</p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}