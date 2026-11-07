import { useEffect, useRef, useState } from "react";
import { addDays } from "date-fns";
import { lunarRhythmAt } from "@/lib/cosmic/lunar-rhythm";
import { phaseSignGuide, SIGN_BRIEF } from "@/lib/cosmic/phase-sign-guide";
import type { RhythmPhase } from "@/lib/planner/rhythm-phase";
import { Link } from "react-router-dom";
import { format, isSameDay } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PHASE_ICONS } from "@/lib/phase-icons";
import { ChevronRight, CheckCircle2, ListChecks, Sparkles } from "lucide-react";
import { getMoonAgeDays } from "@/lib/moon";
import skyPlan from "@/assets/sky-plan.jpg";
import skyGrow from "@/assets/sky-grow.jpg";
import skyCare from "@/assets/sky-care.jpg";
import skyLetgo from "@/assets/sky-letgo.jpg";
const SKY = { plan: skyPlan, grow: skyGrow, care: skyCare, letgo: skyLetgo } as const;
import { useWeatherSnapshot, useTempUnit, cToF } from "@/lib/weather-store";
import { useEnsureWeather } from "@/lib/use-ensure-weather";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LUNAR_RHYTHM } from "@/lib/cosmic/lunar-rhythm";
import { RHYTHM_ORDER, phaseStyle, useDayContext, useNow } from "./day-context";

const ICONS = PHASE_ICONS;

/** Combine the selected day with the current clock time so moon/sign match that day now. */
function atSelected(date: Date, now: Date) {
  const d = new Date(date);
  d.setHours(now.getHours(), now.getMinutes(), 0, 0);
  return d;
}

/** Representative moon age (fraction of cycle) for each phase preview. */
const PREVIEW_AGE: Record<string, number> = { plan: 0.1, grow: 0.36, care: 0.6, letgo: 0.86 };

export function TodayMoonHeader({ date, onDate }: { date?: Date; onDate?: (d: Date) => void }) {
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

  const [preview, setPreview] = useState<RhythmPhase | null>(null);
  useEffect(() => { setPreview(null); }, [dayKey]);
  const shown = (preview ?? ctx.rhythm) as RhythmPhase;
  const sky = SKY[shown as keyof typeof SKY];
  const guide = phaseSignGuide(shown, ctx.sign);
  const activeStyle = phaseStyle(shown);
  const nextDayIn = (p: RhythmPhase) => { for (let i = 1; i < 40; i++) { const d = addDays(selected, i); d.setHours(12); if (lunarRhythmAt(d) === p) return d; } return null; };
  return (
    <div className="mb-4 space-y-3">
    <section aria-label="Day at a glance" className="relative overflow-hidden rounded-[2rem] border border-border/50 shadow-sm">
      <AnimatePresence initial={false}>
        <motion.img key={shown} src={sky} alt="" aria-hidden width={1536} height={640}
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
            <motion.div key={`${dayKey}-${preview ?? ""}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 40, rotate: dir * 25, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -dir * 40, rotate: -dir * 25, scale: 0.8 }}
              transition={{ duration: reduce ? 0.15 : 0.45, ease: "easeOut" }}
              className="absolute inset-0">
              <RealMoon date={selected} ageOverride={preview ? PREVIEW_AGE[preview] : undefined} />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground/70 sm:text-xs">{format(selected, "EEEE, MMMM d")}</p>
          <Clock now={now} />
          {!isToday && <p className="text-xs text-muted-foreground">Viewing {format(selected, "MMM d")} · now</p>}
          <p className="font-display text-lg leading-tight text-foreground sm:text-2xl">{preview ? `${LUNAR_RHYTHM[preview].label} phase · preview` : `${ctx.moonLabel}${ctx.sign ? ` in ${ctx.sign}` : ""}`}</p>
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
              return (
                <li key={p} aria-current={active ? "step" : undefined}>
                      <Button variant="ghost" type="button" onClick={() => setPreview(active || preview === p ? null : p)} aria-pressed={shown === p} className="flex h-auto min-h-11 w-full flex-col items-center gap-1 rounded-xl px-0 py-1 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Preview the ${LUNAR_RHYTHM[p].label} phase`}>
                        <motion.span
                          animate={shown === p && !reduce ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                          transition={{ duration: 0.5 }}
                          key={`${p}-${shown === p}-${dayKey}`}
                          className={cn("flex items-center justify-center rounded-full transition", shown === p ? "h-16 w-16 ring-4 ring-offset-2 ring-offset-card shadow-md sm:h-20 sm:w-20" : "h-12 w-12 sm:h-16 sm:w-16")}
                          style={{ background: shown === p ? c.light : c.tint, color: shown === p ? "hsl(var(--rhythm-on))" : c.deep, ["--tw-ring-color" as string]: c.light }}
                        >
                          <Icon className={shown === p ? "h-7 w-7" : "h-5 w-5"} />
                        </motion.span>
                        <span className={cn("text-sm", shown === p ? "font-semibold" : "opacity-85")} style={{ color: c.deep }}>
                          {LUNAR_RHYTHM[p].label}
                        </span>
                        {active && <span className="rounded-full px-2 py-0.5 text-xs font-bold tracking-wider" style={{ background: c.deep, color: "hsl(var(--card))" }}>{isToday ? "NOW" : "THIS DAY"}</span>}
                      </Button>
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
            <p className="text-xs uppercase tracking-[0.28em]" style={{ color: activeStyle.deep }}>{preview ? "Phase preview" : isToday ? "Today's guidance" : `Guidance · ${format(selected, "MMM d")}`}</p>
            <h3 className="mt-1 font-display text-2xl leading-tight text-foreground sm:text-3xl">{LUNAR_RHYTHM[shown].label}{ctx.sign ? ` in ${ctx.sign}` : ""}</h3>
            {ctx.sign && SIGN_BRIEF[ctx.sign] && <p className="text-xs text-muted-foreground">{SIGN_BRIEF[ctx.sign]}</p>}
            <p className="mt-2 text-sm leading-relaxed text-foreground/85">{guide.line}</p>
            {preview && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-9 rounded-full" onClick={() => setPreview(null)}>Back to this day</Button>
                {onDate && (() => { const d = nextDayIn(preview); return d ? <Button size="sm" className="h-9 rounded-full" onClick={() => onDate(d)}>Jump to next {LUNAR_RHYTHM[preview].label} day · {format(d, "MMM d")}</Button> : null; })()}
              </div>
            )}
          </div>
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {guide.actions.map((a, i) => {
            const I = [CheckCircle2, ListChecks, Sparkles][i];
            return (
              <li key={a} className="flex items-center gap-2 rounded-2xl bg-card/70 px-3 py-2.5 text-sm text-foreground">
                <I className="h-4 w-4 shrink-0" style={{ color: activeStyle.deep }} /> <span className="min-w-0 break-words">{a}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-center font-display text-base italic text-primary">{guide.affirmation}</p>
      </section>
    </div>
  );
}

function RealMoon({ date, ageOverride }: { date: Date; ageOverride?: number }) {
  const age = ageOverride ?? getMoonAgeDays(date) / 29.53058867;
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
      <span className="text-[44px] leading-none sm:text-[64px]">{h}</span>
      <span className="motion-safe:animate-pulse text-[44px] leading-none sm:text-[64px]" aria-hidden>:</span>
      <span className="text-[44px] leading-none sm:text-[64px]">{m}</span>
      <span className="ml-1.5 text-lg sm:text-2xl">{ampm}</span>
    </p>
  );
}


