import { useMemo } from "react";
import { format } from "date-fns";
import { Sparkles, Flower2, CloudSun } from "lucide-react";
import { useAtmosphere } from "@/lib/atmospheres";
import { getMoonPhase, MOON_INFO, getIllumination } from "@/lib/moon";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";
import { useWeatherSnapshot, cToF } from "@/lib/weather-store";

type FocusItem = { icon: string; label: string };

function focusFor(cyclePhase: string | null, moonPhase: string): FocusItem[] {
  if (cyclePhase === "follicular") {
    return [{ icon: "✨", label: "Planning" }, { icon: "🎨", label: "Creative work" }, { icon: "🌿", label: "Gentle movement" }];
  }
  if (cyclePhase === "ovulatory") {
    return [{ icon: "🤝", label: "Connection" }, { icon: "💬", label: "Conversations" }, { icon: "🔥", label: "High energy" }];
  }
  if (cyclePhase === "luteal") {
    return [{ icon: "🍵", label: "Slow tasks" }, { icon: "🧺", label: "Tidying" }, { icon: "🌙" , label: "Wind down" }];
  }
  if (cyclePhase === "menstrual") {
    return [{ icon: "🛋️", label: "Rest" }, { icon: "📔", label: "Reflection" }, { icon: "🤲", label: "Receive care" }];
  }
  // fallback by moon
  if (moonPhase === "new") return [{ icon: "🌱", label: "Set intention" }, { icon: "📔", label: "Journal" }, { icon: "🌿", label: "Begin small" }];
  if (moonPhase === "full") return [{ icon: "🎉", label: "Celebrate" }, { icon: "💛", label: "Connect" }, { icon: "🕯️", label: "Reflect" }];
  return [{ icon: "🌿", label: "Tend to today" }, { icon: "📋", label: "Light planning" }, { icon: "🌙", label: "Notice rhythm" }];
}

/** The emotional center of the calendar — atmosphere · moon · cycle · weather + suggested focus. */
export function TodaysRhythmCard({ date = new Date() }: { date?: Date }) {
  const { atmosphere } = useAtmosphere();
  const { settings: cycleSettings, periods, loaded: cycleLoaded } = useCycle();
  const weather = useWeatherSnapshot();

  const moonPhase = getMoonPhase(date);
  const moon = MOON_INFO[moonPhase];
  const illum = Math.round(getIllumination(date) * 100);

  const cycleInfo = useMemo(
    () => (cycleLoaded && cycleSettings.enabled ? getPhaseInfo(date, periods, cycleSettings) : null),
    [cycleLoaded, cycleSettings, periods, date],
  );

  const focus = focusFor(cycleInfo?.phase ?? null, moonPhase);
  const tempF = weather ? cToF(weather.tempC) : null;
  const cond = weather?.conditionLabel;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border/40 p-4"
      style={{ background: `linear-gradient(135deg, ${atmosphere.palette?.[0] ?? "transparent"}22, ${atmosphere.palette?.[2] ?? "transparent"}11 60%, transparent)` }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          Today’s rhythm
        </div>
        <span className="text-[10px] text-muted-foreground">{format(date, "EEE, MMM d")}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Atmosphere" value={atmosphere.name} hint={atmosphere.mood?.[0]} swatch={atmosphere.palette?.[0]} />
        <Stat label="Moon" value={moon.label} hint={`${illum}% lit`} icon={moon.glyph} />
        {cycleInfo ? (
          <Stat label="Cycle" value={capitalize(cycleInfo.phase)} hint={`Day ${cycleInfo.cycleDay}`} icon={cycleInfo.glyph} />
        ) : (
          <Stat label="Cycle" value="—" hint="Tap to enable" icon="🌸" />
        )}
        {tempF ? (
          <Stat label="Weather" value={`${Math.round(tempF)}°F`} hint={cond ?? "—"} icon="☀️" />
        ) : (
          <Stat label="Weather" value="—" hint="Set location" icon="🌤️" />
        )}
      </div>

      <div className="mt-3 rounded-xl border border-border/40 bg-card/60 p-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Flower2 className="h-3 w-3" />
          Suggested focus
        </div>
        <div className="flex flex-wrap gap-1.5">
          {focus.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-xs">
              <span>{f.icon}</span> {f.label}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs italic text-muted-foreground">"{moon.affirmation}"</p>
      </div>
    </section>
  );
}

function Stat({
  label, value, hint, icon, swatch,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: string;
  swatch?: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-center gap-1.5">
        {swatch && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: swatch }} />}
        {icon && !swatch && <span aria-hidden>{icon}</span>}
        <span className="truncate text-sm font-medium">{value}</span>
      </div>
      {hint && <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }