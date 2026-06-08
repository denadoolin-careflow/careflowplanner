import { Check, X } from "lucide-react";
import { getRhythmForecast } from "@/lib/rhythm-forecast";
import { SIGN_GLYPH, SIGN_ELEMENT, ELEMENT_VAR } from "@/lib/cosmic/glyphs";
import { getSkyMood } from "@/lib/cosmic/sky-mood";
import type { Sign } from "@/lib/transits";

/** Sticky right-rail panel: today's moon + mood / good for / avoid chips. */
export function TodaySkySidebar({ date }: { date: Date }) {
  const forecast = getRhythmForecast(date);
  // rhythm-forecast uses lowercase element strings; map to capitalized for glyphs.ts.
  const signTitle = forecast.sign.sign as unknown as Sign;
  const element = SIGN_ELEMENT[signTitle];
  const mood = getSkyMood(element, forecast.phase);

  return (
    <aside
      aria-label="Today's sky"
      className="cozy-card glass-panel sticky top-4 space-y-3 p-4"
      style={{
        background: `radial-gradient(120% 80% at 50% 0%, hsl(var(${ELEMENT_VAR[element]}) / 0.10), hsl(var(--card)) 60%)`,
      }}
    >
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Today's sky</p>
        <p className="mt-0.5 font-display text-base leading-tight">
          Moon in {forecast.sign.sign} {SIGN_GLYPH[signTitle]}
        </p>
        <p className="text-[11.5px] text-muted-foreground">
          {element} · {forecast.phaseLabel} {forecast.glyph}
        </p>
      </header>

      <section>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Mood</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {mood.mood.map((m) => (
            <span key={m} className="rounded-full border border-border/50 bg-card/70 px-2 py-0.5 text-[11.5px]">{m}</span>
          ))}
        </div>
      </section>

      <section>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Good for</p>
        <ul className="mt-1 space-y-0.5 text-[12.5px]">
          {mood.goodFor.map((g) => (
            <li key={g} className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-[hsl(var(--aspect-harmonious))]" />
              {g}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Go gently with</p>
        <ul className="mt-1 space-y-0.5 text-[12.5px]">
          {mood.avoid.map((g) => (
            <li key={g} className="flex items-center gap-1.5 text-muted-foreground">
              <X className="h-3 w-3 text-[hsl(var(--aspect-dynamic))]" />
              {g}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}