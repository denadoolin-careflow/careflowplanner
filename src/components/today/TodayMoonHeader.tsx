import { useRef } from "react";
import { Link } from "react-router-dom";
import { format, isSameDay } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sprout, Leaf, Heart, Wind, ArrowRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { phaseSignAdvice } from "@/lib/cosmic/moon-energy";
import { LUNAR_RHYTHM, PHASE_GUIDE } from "@/lib/cosmic/lunar-rhythm";
import { RHYTHM_ORDER, phaseStyle, useDayContext, useNow } from "./day-context";

const ICONS = { plan: Sprout, grow: Leaf, care: Heart, letgo: Wind } as const;

/** Combine the selected day with the current clock time so moon/sign match that day now. */
function atSelected(date: Date, now: Date) {
  const d = new Date(date);
  d.setHours(now.getHours(), now.getMinutes(), 0, 0);
  return d;
}

export function TodayMoonHeader({ date }: { date?: Date }) {
  useEnsureWeather();
  const now = useNow(15_000);
  const selected = date ? atSelected(date, now) : now;
  const isToday = isSameDay(selected, now);
  const ctx = useDayContext(selected);
  const snap = useWeatherSnapshot();
  const [unit] = useTempUnit();
  const temp = isToday && snap ? `${unit === "F" ? cToF(snap.tempC) : Math.round(snap.tempC)}°` : null;
  const reduce = useReducedMotion();
  const prev = useRef(selected.getTime());
  const dir = selected.getTime() >= prev.current ? 1 : -1;
  const dayKey = selected.toDateString();
  if (Math.abs(selected.getTime() - prev.current) > 3_600_000) prev.current = selected.getTime();

  const moon = (
    <div aria-hidden className="relative h-20 w-20 shrink-0 sm:h-28 sm:w-28">
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.div
          key={dayKey}
          custom={dir}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 40, rotate: dir * 25, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -dir * 40, rotate: -dir * 25, scale: 0.8 }}
          transition={{ duration: reduce ? 0.15 : 0.45, ease: "easeOut" }}
          className="absolute inset-0 grid place-items-center text-6xl leading-none sm:text-8xl"
        >
          {ctx.glyph}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return (
    <section aria-label="Day at a glance" className="mb-4 rounded-3xl border border-border/60 p-4 shadow-sm sm:p-6" style={{ backgroundColor: phaseStyle(ctx.rhythm).tint }}>
      <div className="mb-4 flex justify-center"><Clock now={now} /></div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-4 sm:block">
          {moon}
          <div className="min-w-0 sm:hidden"><DateBlock selected={selected} now={now} isToday={isToday} ctx={ctx} /></div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="hidden min-w-0 sm:block"><DateBlock selected={selected} now={now} isToday={isToday} ctx={ctx} /></div>
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
              const g = PHASE_GUIDE[p];
              return (
                <li key={p} aria-current={active ? "step" : undefined}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" type="button" className="flex h-auto min-h-11 w-full flex-col items-center gap-1 rounded-xl px-0 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`How to plan in the ${LUNAR_RHYTHM[p].label} phase`}>
                        <motion.span
                          animate={active && !reduce ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                          transition={{ duration: 0.5 }}
                          key={`${p}-${active}-${dayKey}`}
                          className={cn("flex h-10 w-10 items-center justify-center rounded-full transition sm:h-12 sm:w-12", active && "ring-2 ring-offset-2 ring-offset-card")}
                          style={{ background: active ? c.deep : c.tint, color: active ? "hsl(var(--card))" : c.deep, ...(active ? { ["--tw-ring-color" as string]: c.deep } : {}) }}
                        >
                          <Icon className="h-5 w-5" />
                        </motion.span>
                        <span className={cn("text-xs underline-offset-2 hover:underline sm:text-sm", active ? "font-semibold" : "opacity-80")} style={{ color: c.deep }}>
                          {LUNAR_RHYTHM[p].label}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[min(20rem,calc(100vw-2rem))]" align="center">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: c.deep }}>{LUNAR_RHYTHM[p].glyph} {LUNAR_RHYTHM[p].label} · {LUNAR_RHYTHM[p].moon}</p>
                      <p className="mt-1 text-sm text-foreground">{g.focus}</p>
                      {ctx.sign && <p className="mt-2 text-sm text-foreground">{phaseSignAdvice(p, ctx.sign)}</p>}
                      <p className="mt-3 text-xs font-semibold text-foreground">Try</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">{g.actions.map(a => <li key={a}>{a}</li>)}</ul>
                      <p className="mt-3 text-xs font-semibold text-foreground">Go easy on</p>
                      <p className="text-sm text-muted-foreground">{g.avoid}</p>
                      <Link to="/cosmic-flow/moon" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline">Moon & Rituals <ArrowRight className="h-3.5 w-3.5" /></Link>
                    </PopoverContent>
                  </Popover>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <div className="mt-4 border-t border-border/50 pt-3 text-sm leading-relaxed text-foreground">
        <p className="font-medium">{ctx.moonLabel}{ctx.sign ? ` in ${ctx.sign}` : ""} · {ctx.rhythmLabel}</p>
        <p className="mt-1">{ctx.sign ? phaseSignAdvice(ctx.rhythm, ctx.sign) : PHASE_GUIDE[ctx.rhythm].focus}</p>
        <p className="mt-1">{LUNAR_RHYTHM[ctx.rhythm].invitation}</p>
      </div>
      <p className="mt-3 text-center font-display text-base italic text-primary sm:text-lg">
        {ctx.affirmation}
      </p>
    </section>
  );
}

function Clock({ now }: { now: Date }) {
  const [hm, ampm] = [format(now, "h:mm"), format(now, "a")];
  const [h, m] = hm.split(":");
  return (
    <span className="inline-flex shrink-0 items-baseline gap-0.5 whitespace-nowrap rounded-full bg-primary/10 px-4 py-1 font-semibold tabular-nums text-primary" aria-label={`Current time ${hm} ${ampm}`}>
      <span className="text-lg sm:text-2xl">{h}</span>
      <span className="animate-pulse text-lg sm:text-2xl" aria-hidden>:</span>
      <span className="text-lg sm:text-2xl">{m}</span>
      <span className="ml-1 text-xs">{ampm}</span>
    </span>
  );
}

function DateBlock({ selected, now, isToday, ctx }: { selected: Date; now: Date; isToday: boolean; ctx: ReturnType<typeof useDayContext> }) {
  return (
    <>
      <h2 className="font-display text-xl leading-tight text-foreground sm:text-4xl">{format(selected, "EEEE, MMMM d")}</h2>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        {!isToday && <span>Viewing {format(selected, "MMM d")} · now</span>}
        <span>{ctx.moonLabel}{ctx.sign ? ` in ${ctx.sign}` : ""}</span>
      </div>
    </>
  );
}
