import { useMemo } from "react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { personalGreeting, resolveDisplayName } from "@/lib/greeting";
import { useWeatherSnapshot, formatTemp } from "@/lib/weather-store";
import { AFFIRMATIONS } from "@/lib/affirmations";
import { CloudSun } from "lucide-react";

function timeEmoji(h: number) {
  if (h < 5) return "🌙";
  if (h < 12) return "🌅";
  if (h < 17) return "☀️";
  if (h < 21) return "🌇";
  return "🌙";
}

export function GreetingBlock({ date }: { date: Date }) {
  const { state } = useStore();
  const snap = useWeatherSnapshot();
  const name = resolveDisplayName(state.settings.name, state.settings.email);
  const now = new Date();
  const quote = useMemo(
    () => AFFIRMATIONS[Math.abs(Number(format(date, "yyyyMMdd"))) % AFFIRMATIONS.length],
    [date],
  );

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary-soft/60 via-card/70 to-warm-soft/60 p-6 shadow-soft backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Today</p>
      <h1 className="mt-1 font-display text-2xl font-semibold leading-tight sm:text-3xl">
        <span className="mr-2">{timeEmoji(now.getHours())}</span>
        {personalGreeting(name, now)}
      </h1>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>{format(date, "EEEE, MMMM d")}</span>
        <span aria-hidden>·</span>
        <span>{format(now, "h:mm a")}</span>
        {snap && (
          <>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <CloudSun className="h-3.5 w-3.5" aria-hidden />
              {formatTemp(snap.tempC)} {snap.conditionLabel}
            </span>
          </>
        )}
      </p>
      <p className="mt-3 max-w-xl text-[13px] italic text-foreground/75">{quote}</p>
    </section>
  );
}