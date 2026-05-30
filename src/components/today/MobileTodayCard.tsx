import { useMemo, useState, useEffect } from "react";
import { format, isSameDay } from "date-fns";
import { ChevronRight, Sun, Cloud, CloudRain, CloudSnow, CloudFog, CloudDrizzle, CloudSun, Zap } from "lucide-react";
import { useStore } from "@/lib/store";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";
import { getRhythmForecast } from "@/lib/rhythm-forecast";
import { useWeekForecast } from "@/lib/use-week-forecast";
import { useTempUnit, cToF } from "@/lib/weather-store";
import { personalGreeting } from "@/lib/greeting";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { WeatherCondition } from "@/lib/weather";

function WxIcon({ c, className }: { c: WeatherCondition; className?: string }) {
  const cls = cn("h-4 w-4", className);
  if (c === "clear") return <Sun className={cls} />;
  if (c === "partly-cloudy") return <CloudSun className={cls} />;
  if (c === "cloudy") return <Cloud className={cls} />;
  if (c === "fog") return <CloudFog className={cls} />;
  if (c === "drizzle") return <CloudDrizzle className={cls} />;
  if (c === "rain") return <CloudRain className={cls} />;
  if (c === "snow") return <CloudSnow className={cls} />;
  if (c === "thunderstorm") return <Zap className={cls} />;
  return <Cloud className={cls} />;
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function MobileTodayCard({ date, onTaskClick }: { date: Date; onTaskClick?: (id: string) => void }) {
  const { state } = useStore();
  const { settings: cycleSettings, periods } = useCycle();
  const { days } = useWeekForecast();
  const [unit] = useTempUnit();
  const navigate = useNavigate();
  const now = useNow();

  const iso = format(date, "yyyy-MM-dd");
  const forecast = useMemo(() => getRhythmForecast(date), [date]);
  const phaseInfo = useMemo(
    () => (cycleSettings.enabled ? getPhaseInfo(date, periods, cycleSettings) : null),
    [date, periods, cycleSettings],
  );
  const wx = days?.find(d => d.date === iso);
  const fmtT = (c: number) => `${unit === "F" ? cToF(c) : Math.round(c)}°`;

  const todays = useMemo(
    () => state.tasks
      .filter(t => t.dueDate === iso && !t.parentTaskId && t.status !== "parked" && !t.done)
      .slice(0, 12),
    [state.tasks, iso],
  );
  const focus = todays.slice(0, 4);
  const focusExtra = Math.max(0, todays.length - focus.length);

  const upcoming = useMemo(
    () => state.appointments
      .filter(a => a.date === iso && a.time)
      .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
      .filter(a => {
        if (!isSameDay(date, now)) return true;
        const [h, m] = (a.time ?? "00:00").split(":").map(Number);
        const t = new Date(date); t.setHours(h, m, 0, 0);
        return t.getTime() >= now.getTime() - 15 * 60_000;
      })
      .slice(0, 3),
    [state.appointments, iso, date, now],
  );

  const greeting = personalGreeting(state.settings.name, now).replace(/\.$/, "").toUpperCase();

  const Divider = () => (
    <div aria-hidden className="my-3 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent opacity-70" />
  );

  return (
    <section
      aria-label="Today summary"
      className="cozy-card relative overflow-hidden p-5"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(70% 60% at 80% 10%, hsl(var(--primary)/0.18), transparent 70%), radial-gradient(60% 70% at 10% 95%, hsl(var(--moon, var(--primary))/0.16), transparent 70%)",
        }}
      />

      <div className="relative">
        {/* Greeting */}
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
          {greeting}
        </p>

        {/* Date + time */}
        <div className="mt-2 text-center">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground/80">Today is</p>
          <h2 className="text-gradient-glow font-display text-2xl font-semibold leading-tight">
            {format(date, "EEEE, MMMM d")}
          </h2>
          <p className="mt-0.5 font-display text-lg tabular-nums text-foreground/80">
            {format(now, "h:mm a")}
          </p>
        </div>

        {/* Moon */}
        <div className="mt-4 flex flex-col items-center text-center">
          <span aria-hidden className="text-5xl leading-none drop-shadow-sm">{forecast.glyph}</span>
          <p className="mt-2 font-display text-base font-medium">{forecast.phaseLabel}</p>
          <p className="text-[11px] tabular-nums text-muted-foreground">{forecast.illumination}% Lit</p>
        </div>

        {/* Energy + cycle */}
        <p className="mt-3 text-center text-[12px] text-foreground/85">
            <span className="capitalize">{forecast.element} energy</span>
          {phaseInfo && (
            <>
              <span className="mx-1.5 text-muted-foreground/70">•</span>
              Day {phaseInfo.cycleDay} <span className="capitalize">{phaseInfo.phase}</span>
            </>
          )}
        </p>

        {/* Weather */}
        {wx && (
          <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[12px] text-foreground/80">
            <WxIcon c={wx.condition} />
            <span className="tabular-nums">{fmtT(wx.highC)}</span>
            <span className="text-muted-foreground">{wx.label}</span>
          </p>
        )}

        <Divider />

        {/* Guidance quote */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            🌙 Moon + Cycle Guidance
          </p>
          <p className="mt-2 font-display text-[15px] italic leading-snug text-foreground/90">
            “{forecast.guidance.suggestion}”
          </p>
          <button
            type="button"
            onClick={() => navigate("/rhythm")}
            className="mt-1.5 inline-flex items-center gap-0.5 text-[12px] font-medium text-primary hover:underline"
          >
            Read more <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <Divider />

        {/* Today's focus */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            ✨ Today's Focus
          </p>
          {focus.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted-foreground">No tasks queued — breathe easy.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {focus.map(t => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onTaskClick?.(t.id)}
                    className="flex w-full items-start gap-2 rounded-lg px-1 py-0.5 text-left text-[13.5px] text-foreground/90 transition hover:bg-muted/40"
                  >
                    <span aria-hidden className="mt-1 inline-block h-3.5 w-3.5 shrink-0 rounded border border-foreground/40" />
                    <span className="min-w-0 truncate">{t.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {focusExtra > 0 && (
            <p className="mt-1.5 pl-6 text-[12px] text-muted-foreground">+{focusExtra} more</p>
          )}
        </div>

        <Divider />

        {/* Next up */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            📅 Next Up
          </p>
          {upcoming.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted-foreground">Nothing scheduled.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {upcoming.map(a => {
                const [h, m] = (a.time ?? "00:00").split(":").map(Number);
                const d = new Date(); d.setHours(h, m, 0, 0);
                return (
                  <li key={a.id} className="flex items-baseline gap-2 text-[13.5px] text-foreground/90">
                    <span className="w-16 shrink-0 font-medium tabular-nums text-foreground">
                      {format(d, "h:mm a")}
                    </span>
                    <span className="min-w-0 truncate">{a.title}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Divider />

        {/* Quick links */}
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => navigate("/rhythm")}
            className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[12px] text-foreground/85 transition hover:bg-card"
          >
            🌕 Lunar Insights
          </button>
          <button
            type="button"
            onClick={() => navigate("/today?view=weather")}
            className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[12px] text-foreground/85 transition hover:bg-card"
          >
            🌤 Weather
          </button>
          <button
            type="button"
            onClick={() => navigate("/health")}
            className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[12px] text-foreground/85 transition hover:bg-card"
          >
            🌱 Cycle Tracking
          </button>
        </div>
      </div>
    </section>
  );
}