import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import {
  getMoonPhase,
  MOON_INFO,
  getIllumination,
  daysUntilFull,
  daysUntilNew,
} from "@/lib/moon";
import { getMoonSign, SIGN_EMOJI, ELEMENT_EMOJI } from "@/lib/zodiac";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META } from "@/lib/cycle";
import { cn } from "@/lib/utils";

const ELEMENT_TONE: Record<"fire" | "earth" | "air" | "water", { ring: string; text: string; soft: string }> = {
  fire:  { ring: "hsl(20 80% 55% / 0.40)",  text: "hsl(20 70% 60%)",  soft: "hsl(20 70% 60% / 0.65)" },
  earth: { ring: "hsl(140 45% 45% / 0.40)", text: "hsl(140 45% 60%)", soft: "hsl(140 45% 60% / 0.65)" },
  air:   { ring: "hsl(48 90% 60% / 0.45)",  text: "hsl(45 85% 65%)",  soft: "hsl(45 85% 65% / 0.7)" },
  water: { ring: "hsl(210 75% 60% / 0.40)", text: "hsl(210 75% 68%)", soft: "hsl(210 75% 68% / 0.7)" },
};

const MOON_REMINDER: Record<string, string> = {
  new: "Begin softly. Set one quiet intention.",
  "waxing-crescent": "Tend the spark. Small steps count.",
  "first-quarter": "Decide. Move one thing forward.",
  "waxing-gibbous": "Refine. Adjust before the peak.",
  full: "Pause. Rest, reflect, hydrate.",
  "waning-gibbous": "Share what you've gathered.",
  "last-quarter": "Release what no longer fits.",
  "waning-crescent": "Soften. Reflect. Hydrate.",
};

interface Props { date: Date }

export function MoonCycleModule({ date }: Props) {
  const moonPhase = getMoonPhase(date);
  const moon = MOON_INFO[moonPhase];
  const illum = getIllumination(date);
  const toFull = daysUntilFull(date);
  const toNew = daysUntilNew(date);
  const proximity =
    toFull === 0 ? "Full tonight"
    : toNew === 0 ? "New tonight"
    : toFull < toNew ? `${toFull}d to full`
    : `${toNew}d to new`;

  const sign = useMemo(() => getMoonSign(date), [date]);
  const tone = ELEMENT_TONE[sign.element];

  const { periods, settings } = useCycle();
  const cycle = useMemo(() => {
    try { return getPhaseInfo(date, periods, settings); } catch { return null; }
  }, [date, periods, settings]);

  const reminder = cycle
    ? PHASE_META[cycle.phase].invitation
    : MOON_REMINDER[moonPhase] ?? "Move with the rhythm of today.";

  return (
    <div
      className="w-full max-w-md rounded-2xl border border-border/50 bg-card/60 p-3.5 shadow-soft backdrop-blur sm:p-4"
    >
      <div className="grid grid-cols-3 gap-2">
        {/* Moon */}
        <Link
          to="/rhythm"
          title={`${moon.label} · ${illum}% lit · ${proximity}`}
          className="group flex flex-col items-center gap-1.5 rounded-xl px-1.5 py-2 text-center transition hover:bg-background/40"
        >
          <MoonGlyph date={date} size={28} />
          <p className="font-display text-[11px] italic text-muted-foreground">Moon</p>
          <p className="text-[13px] font-medium leading-tight text-foreground">{moon.label}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
            {illum}% lit
          </p>
        </Link>

        {/* Zodiac + element */}
        <Link
          to="/rhythm"
          title={`Moon in ${sign.name} · ${sign.element} sign`}
          className="group flex flex-col items-center gap-1.5 rounded-xl border-x border-border/40 px-1.5 py-2 text-center transition hover:bg-background/40"
        >
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-full text-base"
            style={{ boxShadow: `inset 0 0 0 1px ${tone.ring}`, color: tone.text }}
          >
            {SIGN_EMOJI[sign.name]}
          </span>
          <p className="font-display text-[11px] italic text-muted-foreground">Zodiac</p>
          <p className="text-[13px] font-medium leading-tight text-foreground">{sign.name}</p>
          <p
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em]"
            style={{ color: tone.soft }}
          >
            <span aria-hidden>{ELEMENT_EMOJI[sign.element]}</span>
            {sign.element}
          </p>
        </Link>

        {/* Cycle */}
        {cycle ? (
          <Link
            to="/health"
            title={`Day ${cycle.cycleDay} · ${PHASE_META[cycle.phase].label}`}
            className="group flex flex-col items-center gap-1.5 rounded-xl px-1.5 py-2 text-center transition hover:bg-background/40"
          >
            <span
              aria-hidden
              className="text-xl leading-none"
              style={{ color: `hsl(var(${PHASE_META[cycle.phase].tokenVar}))` }}
            >
              {PHASE_META[cycle.phase].glyph}
            </span>
            <p className="font-display text-[11px] italic text-muted-foreground">Cycle</p>
            <p className="text-[13px] font-medium leading-tight text-foreground">Day {cycle.cycleDay}</p>
            <p
              className="text-[10px] uppercase tracking-[0.14em]"
              style={{ color: `hsl(var(${PHASE_META[cycle.phase].tokenVar}) / 0.85)` }}
            >
              {PHASE_META[cycle.phase].label}
            </p>
          </Link>
        ) : (
          <Link
            to="/health"
            className="group flex flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-center transition hover:bg-background/40"
          >
            <span aria-hidden className="text-xl leading-none opacity-60">🌸</span>
            <p className="font-display text-[11px] italic text-muted-foreground">Cycle</p>
            <p className="text-[11px] leading-tight text-muted-foreground">Log to track</p>
          </Link>
        )}
      </div>

      {/* Gentle reminder */}
      <div className="mt-3 flex items-center justify-center gap-3 border-t border-border/40 pt-3">
        <span className={cn("block h-1.5 w-1.5 rounded-full")} style={{ background: tone.soft }} />
        <p className="font-display text-[13px] italic leading-snug text-foreground/85">
          {reminder}
        </p>
        <span className={cn("block h-1.5 w-1.5 rounded-full")} style={{ background: tone.soft }} />
      </div>
    </div>
  );
}