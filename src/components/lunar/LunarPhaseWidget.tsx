import { useMemo, useState } from "react";
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
  type KeyPhase,
} from "@/lib/lunar-phases";
import { getMoonSign, SIGN_EMOJI, MOON_IN_SIGN_GUIDE } from "@/lib/zodiac";
import { getMoonDayMeaning } from "@/lib/moon-days";
import { DayLunarSheet } from "@/components/lunar/DayLunarSheet";

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
  const [sheetDate, setSheetDate] = useState<Date | null>(null);

  // Canonical cycle order: Sow → Grow → Glow → Let go.
  const next4 = useMemo(() => {
    const order: KeyPhase[] = ["sow", "grow", "glow", "let-go"];
    const found: Partial<Record<KeyPhase, { date: Date; phase: MoonPhase }>> = {};
    for (let i = 0; i < 35; i++) {
      const d = addDays(date, i);
      const p = getMoonPhase(d);
      if (!isKeyPhaseDay(p)) continue;
      const k = toKeyPhase(p);
      if (!found[k]) found[k] = { date: d, phase: p };
      if (order.every((o) => found[o])) break;
    }
    return order
      .filter((k) => found[k])
      .map((k) => ({ key: k, ...(found[k] as { date: Date; phase: MoonPhase }) }));
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
            const k = KEY_PHASES[n.key];
            const s = getMoonSign(n.date);
            return (
              <button
                type="button"
                key={n.date.toISOString()}
                onClick={() => setSheetDate(n.date)}
                className="group flex items-center gap-2 rounded-xl bg-white/5 px-2.5 py-2 text-left backdrop-blur-sm transition-all hover:bg-white/10 hover:scale-[1.02] focus:outline-none focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:ring-[hsl(36_60%_92%)]"
                style={{ borderLeft: `2px solid hsl(${k.hsl} / 0.6)` }}
                aria-label={`${k.verb} — ${k.label} on ${format(n.date, "MMM d")} — Moon in ${s.name}`}
              >
                <MoonGlyph date={n.date} size={24} className="shrink-0" />
                <div className="min-w-0 flex-1 space-y-0.5 text-[11px] leading-tight">
                  <p
                    className="truncate font-medium"
                    style={{ color: `hsl(${k.hsl})` }}
                    title={`${k.verb}`}
                  >
                    <span className="mr-1">{k.glyph}</span>
                    {k.verb}
                  </p>
                  <p className="truncate opacity-80" title={k.label.split(" · ")[1]}>
                    {k.label.split(" · ")[1]}
                  </p>
                  <p
                    className="truncate opacity-80"
                    title={`Moon in ${s.name} · ${s.element}`}
                  >
                    <span className="mr-0.5">{SIGN_EMOJI[s.name]}</span>
                    {s.name}
                  </p>
                  <p className="truncate opacity-60">{format(n.date, "MMM d")}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <DayLunarSheet
        date={sheetDate}
        open={sheetDate !== null}
        onOpenChange={(o) => !o && setSheetDate(null)}
      />
    </div>
  );
}