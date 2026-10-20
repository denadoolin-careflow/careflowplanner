import { format } from "date-fns";
import { Sprout, Leaf, Heart, Wind } from "lucide-react";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import { cn } from "@/lib/utils";
import { LUNAR_RHYTHM } from "@/lib/cosmic/lunar-rhythm";
import { RHYTHM_ORDER, phaseStyle, useDayContext, useNow } from "./day-context";

const ICONS = { plan: Sprout, grow: Leaf, care: Heart, letgo: Wind } as const;

export function TodayMoonHeader() {
  useEnsureWeather();
  const now = useNow();
  const ctx = useDayContext(now);
  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const temp = snap ? `${unit === "F" ? cToF(snap.tempC) : Math.round(snap.tempC)}°` : null;

  return (
    <section aria-label="Today at a glance" className="mb-4 rounded-3xl border border-border/60 bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-4 sm:block">
          <div aria-hidden className="text-6xl leading-none sm:text-8xl">{ctx.glyph}</div>
          <div className="min-w-0 sm:hidden">
            <DateBlock now={now} ctx={ctx} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="hidden min-w-0 sm:block"><DateBlock now={now} ctx={ctx} /></div>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {temp && <span className="tabular-nums">{temp}{snap?.conditionLabel ? ` ${snap.conditionLabel}` : ""}</span>}
            <span>{ctx.season.emoji} {ctx.season.label}</span>
            {ctx.cycleLabel && <span>{ctx.cycleGlyph} {ctx.cycleLabel}</span>}
          </p>
          <ol className="mt-4 grid grid-cols-4 gap-1" aria-label="Moon rhythm">
            {RHYTHM_ORDER.map((p) => {
              const Icon = ICONS[p];
              const c = phaseStyle(p);
              const active = ctx.rhythm === p;
              return (
                <li key={p} className="flex flex-col items-center gap-1" aria-current={active ? "step" : undefined}>
                  <span
                    className={cn("flex h-10 w-10 items-center justify-center rounded-full transition sm:h-12 sm:w-12", active && "ring-2 ring-offset-2 ring-offset-card")}
                    style={{ background: active ? c.deep : c.tint, color: active ? "hsl(var(--card))" : c.deep, ...(active ? { ["--tw-ring-color" as string]: c.deep } : {}) }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={cn("text-xs sm:text-sm", active ? "font-semibold" : "opacity-80")} style={{ color: c.deep }}>
                    {LUNAR_RHYTHM[p].label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <p className="mt-4 border-t border-border/50 pt-3 text-center font-display text-base italic text-primary sm:text-lg">
        {ctx.affirmation}
      </p>
    </section>
  );
}

function DateBlock({ now, ctx }: { now: Date; ctx: ReturnType<typeof useDayContext> }) {
  return (
    <>
      <h2 className="font-display text-xl leading-tight text-foreground sm:text-4xl">{format(now, "EEEE, MMMM d")}</h2>
      <p className="text-sm text-muted-foreground">
        <span className="tabular-nums">{format(now, "h:mm a")}</span> · {ctx.moonLabel}{ctx.sign ? ` in ${ctx.sign}` : ""}
      </p>
    </>
  );
}
