import { useRef } from "react";
import { Link } from "react-router-dom";
import { format, isSameDay } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PHASE_ICONS } from "@/lib/phase-icons";
import { ArrowRight, ChevronRight, CheckCircle2, ListChecks, Sparkles } from "lucide-react";
import { getMoonAgeDays } from "@/lib/moon";
import skyPlan from "@/assets/sky-plan.jpg";
import skyGrow from "@/assets/sky-grow.jpg";
import skyCare from "@/assets/sky-care.jpg";
import skyLetgo from "@/assets/sky-letgo.jpg";
const SKY = { plan: skyPlan, grow: skyGrow, care: skyCare, letgo: skyLetgo } as const;
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { phaseSignAdvice } from "@/lib/cosmic/moon-energy";
import { LUNAR_RHYTHM, PHASE_GUIDE } from "@/lib/cosmic/lunar-rhythm";
import { RHYTHM_ORDER, phaseStyle, useDayContext, useNow } from "./day-context";

const ICONS = PHASE_ICONS;

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

  const sky = SKY[ctx.rhythm as keyof typeof SKY];
  const g0 = PHASE_GUIDE[ctx.rhythm];
  const activeStyle = phaseStyle(ctx.rhythm);
  return (
    <div className="mb-4 space-y-3">
    <section aria-label="Day at a glance" className="relative overflow-hidden rounded-[2rem] border border-border/50 shadow-sm">
      <AnimatePresence initial={false}>
        <motion.img key={ctx.rhythm} src={sky} alt="" aria-hidden width={1536} height={640}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
          className="absolute inset-0 h-full w-full object-cover" />
      </AnimatePresence>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-card/80 via-card/55 to-card/10 dark:from-card/95 dark:via-card/80 dark:to-card/30" />
      {temp && (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-card/80 px-3 py-1 text-xs tabular-nums text-foreground shadow-sm backdrop-blur">
          {temp}{snap?.conditionLabel ? ` ${snap.conditionLabel}` : ""}
        </span>
      )}
      <div className="relative flex items-center gap-4 p-5 pt-10 sm:gap-8 sm:p-8">
        <div className="relative h-20 w-20 shrink-0 sm:h-36 sm:w-36">
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div key={dayKey}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 40, rotate: dir * 25, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -dir * 40, rotate: -dir * 25, scale: 0.8 }}
              transition={{ duration: reduce ? 0.15 : 0.45, ease: "easeOut" }}
              className="absolute inset-0">
              <RealMoon date={selected} />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/70 sm:text-xs">{format(selected, "EEEE, MMMM d")}</p>
          <Clock now={now} />
          {!isToday && <p className="text-xs text-muted-foreground">Viewing {format(selected, "MMM d")} · now</p>}
          <p className="font-display text-lg leading-tight text-foreground sm:text-2xl">{ctx.moonLabel}{ctx.sign ? ` in ${ctx.sign}` : ""}</p>
          <div className="mx-auto mt-2 flex w-fit flex-wrap justify-center gap-x-3 border-t border-foreground/15 pt-2 text-sm text-foreground/80">
            <span>{ctx.season.emoji} {ctx.season.label}</span>
            {ctx.cycleLabel && <><span aria-hidden className="opacity-40">|</span><span>{ctx.cycleGlyph} {ctx.cycleLabel}</span></>}
          </div>
        </div>
      </div>
    </section>
          <ol className="grid grid-cols-4 gap-1 px-1" aria-label="Moon rhythm">
            {RHYTHM_ORDER.map((p) => {
              const Icon = ICONS[p];
              const c = phaseStyle(p);
              const active = ctx.rhythm === p;
              const g = PHASE_GUIDE[p];
              return (
                <li key={p} aria-current={active ? "step" : undefined}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" type="button" className="flex h-auto min-h-11 w-full flex-col items-center gap-1 rounded-xl px-0 py-1 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring" aria-label={`How to plan in the ${LUNAR_RHYTHM[p].label} phase`}>
                        <motion.span
                          animate={active && !reduce ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                          transition={{ duration: 0.5 }}
                          key={`${p}-${active}-${dayKey}`}
                          className={cn("flex items-center justify-center rounded-full transition", active ? "h-16 w-16 border-4 border-card shadow-md sm:h-20 sm:w-20" : "h-12 w-12 sm:h-16 sm:w-16")}
                          style={{ background: active ? c.light : c.tint, color: active ? "hsl(var(--rhythm-on))" : c.deep }}
                        >
                          <Icon className={active ? "h-7 w-7" : "h-5 w-5"} />
                        </motion.span>
                        <span className={cn("text-sm", active ? "font-semibold" : "opacity-85")} style={{ color: c.deep }}>
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
      <section aria-label="Today's guidance" className="relative overflow-hidden rounded-[2rem] border border-border/50 p-5 shadow-sm sm:p-6" style={{ background: activeStyle.tint }}>
        <Link to="/cosmic-flow/moon" aria-label="Open Moon & Rituals" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-card/70 text-foreground hover:bg-card">
          <ChevronRight className="h-5 w-5" />
        </Link>
        <div className="flex gap-4">
          <img src={sky} alt="" aria-hidden loading="lazy" className="hidden h-28 w-28 shrink-0 rounded-full object-cover object-right-bottom sm:block" />
          <div className="min-w-0 flex-1 pr-10">
            <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: activeStyle.deep }}>Today's guidance</p>
            <h3 className="mt-1 font-display text-2xl leading-tight text-foreground sm:text-3xl">{ctx.rhythmLabel}{ctx.sign ? ` in ${ctx.sign}` : ""}</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/85">{ctx.sign ? phaseSignAdvice(ctx.rhythm, ctx.sign) : g0.focus} {LUNAR_RHYTHM[ctx.rhythm].invitation}</p>
          </div>
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {g0.actions.slice(0, 3).map((a, i) => {
            const I = [CheckCircle2, ListChecks, Sparkles][i];
            return (
              <li key={a} className="flex items-center gap-2 rounded-2xl bg-card/70 px-3 py-2.5 text-sm text-foreground">
                <I className="h-4 w-4 shrink-0" style={{ color: activeStyle.deep }} /> <span className="min-w-0 break-words">{a}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-center font-display text-base italic text-primary">{ctx.affirmation}</p>
      </section>
    </div>
  );
}

function RealMoon({ date }: { date: Date }) {
  const age = getMoonAgeDays(date) / 29.53058867;
  const illum = (1 - Math.cos(age * 2 * Math.PI)) / 2;
  const waxing = age < 0.5;
  const rx = Math.abs(1 - 2 * illum) * 50;
  const half = waxing ? "M50 0 A50 50 0 0 1 50 100 Z" : "M50 0 A50 50 0 0 0 50 100 Z";
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-lg" aria-hidden>
      <defs>
        <radialGradient id="rm-lit" cx="40%" cy="38%" r="70%">
          <stop offset="0%" stopColor="hsl(48 90% 88%)" />
          <stop offset="70%" stopColor="hsl(44 70% 68%)" />
          <stop offset="100%" stopColor="hsl(38 50% 50%)" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="hsl(220 45% 16%)" />
      <path d={half} fill="url(#rm-lit)" />
      <ellipse cx="50" cy="50" rx={rx} ry="50" fill={illum > 0.5 ? "url(#rm-lit)" : "hsl(220 45% 16%)"} />
      <g fill="hsl(38 35% 40% / 0.25)">
        <circle cx="38" cy="35" r="7" /><circle cx="60" cy="58" r="9" /><circle cx="45" cy="70" r="5" /><circle cx="68" cy="30" r="4" /><circle cx="28" cy="55" r="5" />
      </g>
    </svg>
  );
}

function Clock({ now }: { now: Date }) {
  const [hm, ampm] = [format(now, "h:mm"), format(now, "a")];
  const [h, m] = hm.split(":");
  return (
    <p className="my-1 inline-flex items-baseline gap-0.5 whitespace-nowrap font-display tabular-nums text-foreground" aria-label={`Current time ${hm} ${ampm}`}>
      <span className="text-5xl leading-none sm:text-7xl">{h}</span>
      <span className="animate-pulse text-5xl leading-none sm:text-7xl" aria-hidden>:</span>
      <span className="text-5xl leading-none sm:text-7xl">{m}</span>
      <span className="ml-1.5 text-lg sm:text-2xl">{ampm}</span>
    </p>
  );
}


