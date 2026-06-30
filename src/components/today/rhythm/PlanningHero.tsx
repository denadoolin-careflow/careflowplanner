import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Clock, CloudSun, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { personalGreeting } from "@/lib/greeting";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";

/**
 * Compact, decoration-only planning hero shared by Week and Month so the
 * greeting / date / time / weather feel consistent with Today's big hero.
 * Today still uses its own larger hero inside RhythmDashboard.
 */
export function PlanningHero({
  date,
  title,
  subtitle,
}: {
  date: Date;
  title?: string;
  subtitle?: string;
}) {
  const { state } = useStore();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const tempStr = snap ? `${unit === "F" ? cToF(snap.tempC) : Math.round(snap.tempC)}°` : null;

  return (
    <section className="relative text-center">
      <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
        <Sparkles className="mr-1.5 inline h-3 w-3 text-primary" />
        {personalGreeting(state.settings.name)}
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
        {title ?? format(date, "EEEE, MMMM d")}
      </h2>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-foreground/80">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-primary" />
          <span className="tabular-nums font-medium">{format(now, "h:mm a")}</span>
        </span>
        {tempStr && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1.5">
              <CloudSun className="h-4 w-4 text-primary" />
              <span className="tabular-nums font-medium">{tempStr}</span>
              {snap?.conditionLabel && (
                <span className="text-muted-foreground">{snap.conditionLabel}</span>
              )}
            </span>
          </>
        )}
      </div>
    </section>
  );
}