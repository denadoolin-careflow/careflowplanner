import { useMemo } from "react";
import { addDays, format } from "date-fns";
import { Sparkles } from "lucide-react";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import {
  MOON_INFO,
  daysUntilFull,
  daysUntilNew,
  getIllumination,
  getMoonPhase,
  type MoonPhase,
} from "@/lib/moon";
import {
  KEY_PHASES,
  getKeyPhaseInfo,
  isKeyPhaseDay,
  toKeyPhase,
} from "@/lib/lunar-phases";
import { getMoonSign, SIGN_EMOJI, MOON_IN_SIGN_GUIDE } from "@/lib/zodiac";
import { getMoonDayMeaning } from "@/lib/moon-days";

interface Props {
  date?: Date;
  compact?: boolean;
}

/**
 * Hero widget for the Lunar Living tab — collapses the day's
 * moon phase, key-phase verb (Sow/Grow/Glow/Let go),
 * moon-in-sign vibe, and lunar-day meaning into one card.
 */
export function LunarPhaseWidget({ date = new Date(), compact = false }: Props) {
  const phase = getMoonPhase(date);
  const info = MOON_INFO[phase];
  const key = getKeyPhaseInfo(phase);
  const sign = getMoonSign(date);
  const signGuide = MOON_IN_SIGN_GUIDE[sign.name];
  const lunarDay = getMoonDayMeaning(date);

  const next4 = useMemo(() => {
    const out: { date: Date; phase: MoonPhase }[] = [];
    let last: MoonPhase | null = null;
    for (let i = 0; i < 32 && out.length < 4; i++) {
      const d = addDays(date, i);
      const p = getMoonPhase(d);
      if (isKeyPhaseDay(p) && p !== last) {
        out.push({ date: d, phase: p });
        last = p;
      }
    }
    return out;
  }, [date]);

  return (
    <div
      className="cozy-card relative overflow-hidden p-5 sm:p-7"
      style={{
        background:
          "linear-gradient(135deg, hsl(215 45% 16%) 0%, hsl(258 35% 22%) 50%, hsl(145 22% 18%) 100%)",
        color: "hsl(36 30% 92%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full opacity-40 blur-3xl"
        style={{ background: `hsl(${key.hsl} / 0.55)` }}
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <span
            aria-hidden
            className="absolute inset-[-10px] rounded-full blur-2xl"
            style={{ background: `radial-gradient(circle, hsl(${key.hsl} / 0.45), transparent 70%)` }}
          />
          <MoonGlyph date={date} size={88} className="relative" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] opacity-70">
            <Sparkles className="h-3 w-3" /> Tonight's rhythm
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="font-display text-2xl sm:text-3xl">{info.label}</h2>
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{
                background: `hsl(${key.hsl} / 0.22)`,
                color: `hsl(${key.hsl})`,
                border: `1px solid hsl(${key.hsl} / 0.4)`,
              }}
            >
              {key.glyph} {key.verb}
            </span>
          </div>
          <p className="mt-1 text-[12.5px] opacity-80">
            {getIllumination(date)}% lit · {daysUntilFull(date)}d to full · {daysUntilNew(date)}d to new
          </p>
          <p className="mt-3 max-w-xl text-[13.5px] italic opacity-90">"{key.invitation}"</p>
        </div>
      </div>

      {!compact && (
        <div className="relative mt-5 grid gap-2 sm:grid-cols-2">
          {/* Moon in sign */}
          <div className="rounded-xl bg-white/5 px-3 py-2.5 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-[0.18em] opacity-60">Moon in</p>
            <p className="mt-0.5 text-sm font-medium">
              <span className="mr-1">{SIGN_EMOJI[sign.name]}</span>
              {sign.name} · {sign.element}
            </p>
            <p className="mt-0.5 text-[11.5px] opacity-80">{signGuide.vibe}</p>
          </div>
          {/* Lunar day */}
          <div className="rounded-xl bg-white/5 px-3 py-2.5 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-[0.18em] opacity-60">
              Day {lunarDay.day} · {lunarDay.title}
            </p>
            <p className="mt-0.5 text-[11.5px] opacity-85">{lunarDay.meaning}</p>
          </div>
        </div>
      )}

      {!compact && (
        <div className="relative mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {next4.map((n) => {
            const k = KEY_PHASES[toKeyPhase(n.phase)];
            return (
              <div
                key={n.date.toISOString()}
                className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 backdrop-blur-sm"
                style={{ borderLeft: `2px solid hsl(${k.hsl} / 0.6)` }}
              >
                <MoonGlyph date={n.date} size={26} />
                <div className="text-[11px] leading-tight">
                  <p className="font-medium" style={{ color: `hsl(${k.hsl})` }}>
                    {k.verb}
                  </p>
                  <p className="opacity-70">{format(n.date, "MMM d")}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}