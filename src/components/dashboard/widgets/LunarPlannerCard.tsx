import { format } from "date-fns";
import { MoonLogo } from "@/components/widgets/MoonLogo";
import { EnergyToggle } from "@/components/today/EnergyToggle";
import { getRhythmForecast } from "@/lib/rhythm-forecast";
import { getTransitsForDate } from "@/lib/transits";
import { useAstrologyEnabled, useTransitsEnabled } from "@/lib/astrology-prefs";

/**
 * Lunar Life × CareFlow planner card — gentle greeting, energy toggle,
 * day's top transit. Renders its own card chrome.
 */
export function LunarPlannerCard() {
  const today = new Date();
  const iso = format(today, "yyyy-MM-dd");
  const [astroOn] = useAstrologyEnabled();
  const transitsOn = useTransitsEnabled();
  const forecast = astroOn ? getRhythmForecast(today) : null;
  const top = transitsOn ? getTransitsForDate(today)[0] : null;

  const greeting = (() => {
    const h = today.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Soft night to you";
  })();

  return (
    <section
      aria-label="Lunar planner"
      className="relative h-full overflow-hidden rounded-2xl border border-border/50 p-5"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--secondary-soft)) 0%, hsl(var(--card)) 50%, hsl(var(--accent-soft)) 100%)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-50 blur-2xl"
        style={{ background: "hsl(var(--primary) / 0.25)" }}
      />
      <header className="relative flex items-center gap-3">
        <MoonLogo size={36} />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Lunar planner</p>
          <p className="font-display text-lg leading-tight">{greeting}</p>
          <p className="text-[11px] text-muted-foreground">
            {format(today, "EEEE, MMM d")}
            {forecast ? ` · ${forecast.phaseLabel} · Moon in ${forecast.sign.sign}` : ""}
          </p>
        </div>
      </header>

      <div className="relative mt-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          How's your energy?
        </p>
        <div className="mt-1.5">
          <EnergyToggle dateISO={iso} />
        </div>
      </div>

      {top && (
        <div className="relative mt-4 rounded-xl border border-border/50 bg-card/60 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Sky note
          </p>
          <p className="mt-1 text-sm font-medium">
            <span aria-hidden className="mr-1">{top.glyph}</span>{top.label}
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-foreground/80">{top.detail}</p>
        </div>
      )}

      <p className="relative mt-4 text-center text-[11.5px] italic text-foreground/70">
        "You are not behind. You are exactly where today needed you."
      </p>
    </section>
  );
}