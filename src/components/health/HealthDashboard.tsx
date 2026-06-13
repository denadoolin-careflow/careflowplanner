import { useMemo } from "react";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, PHASE_META, type CyclePhase } from "@/lib/cycle";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { getMoonSign } from "@/lib/zodiac";
import { getDailyEnergyGuidance, getMoonDay, MOON_DAY_THEMES } from "@/lib/daily-energy-guidance";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import {
  Heart, Moon as MoonIcon, Calendar as CalendarIcon, Activity, Sparkles,
  Sprout, Coffee, Droplet, CheckCircle2, Circle, Leaf,
} from "lucide-react";

type Element = "Fire" | "Earth" | "Air" | "Water";

/** Element → soft HSL tint applied across the page (sage / amber / blue-green / silver-lavender). */
const ELEMENT_TINT: Record<Element, { hsl: string; label: string }> = {
  Earth: { hsl: "140 35% 55%", label: "Earth" },
  Fire:  { hsl: "28 75% 58%",  label: "Fire"  },
  Water: { hsl: "190 55% 55%", label: "Water" },
  Air:   { hsl: "260 35% 70%", label: "Air"   },
};

const CYCLE_HINT: Record<CyclePhase, { icon: string; line1: string; line2: string }> = {
  menstrual:  { icon: "🩸", line1: "Slow down.",       line2: "Rest is the work today." },
  follicular: { icon: "🌷", line1: "Curiosity rises.", line2: "Begin something small." },
  ovulatory:  { icon: "🌻", line1: "Connect & express.", line2: "Use your voice gently." },
  luteal:     { icon: "🍂", line1: "Protect your energy.", line2: "Prioritize essentials." },
};

const MOON_HINT: Partial<Record<ReturnType<typeof getMoonPhase>, { line1: string; line2: string }>> = {
  "new":              { line1: "Soft reset.",        line2: "Plant one quiet seed." },
  "waxing-crescent":  { line1: "Something stirring.", line2: "One small step today." },
  "first-quarter":    { line1: "Choose & commit.",   line2: "Friction is the path." },
  "waxing-gibbous":   { line1: "Tend what's growing.", line2: "Don't start more." },
  "full":             { line1: "Everything is lit.", line2: "Feel without fixing." },
  "waning-gibbous":   { line1: "Share & exhale.",    line2: "Release with gratitude." },
  "last-quarter":     { line1: "Let one thing go.",  line2: "Without guilt." },
  "waning-crescent":  { line1: "Release pressure.",  line2: "Prepare for renewal." },
};

const ENERGY_COPY: Record<"low" | "medium" | "high", { title: string; body: string; bars: number }> = {
  low:    { title: "Low & Restorative", body: "Your body may benefit from slower pacing and fewer transitions today.", bars: 2 },
  medium: { title: "Steady & Spacious", body: "A measured pace suits today — alternate focus with gentle breaks.",    bars: 4 },
  high:   { title: "Bright & Available", body: "You have energy to spend — pour it into what matters most.",          bars: 6 },
};

const RITUALS = [
  { icon: Coffee, title: "Tea & Reflection", body: "Take 10 minutes to review what's complete before planning tomorrow." },
  { icon: Leaf,   title: "Closing Loops",    body: "Choose one unfinished task and gently bring it to completion." },
  { icon: Sprout, title: "Soft Reset",       body: "Tidy one small space — a drawer, your desk, your inbox." },
];

/**
 * Health Dashboard — three-layer flow:
 *   🌙 Understand → 🌿 Support → ✨ Act
 * Anchored by a single "Your Rhythm Today" hero, tinted by the day's zodiac element.
 */
export function HealthDashboard() {
  const { settings, periods, dayLogs } = useCycle();
  const now = useMemo(() => new Date(), []);
  const phase = useMemo(
    () => (settings.enabled ? getPhaseInfo(now, periods, settings) : null),
    [settings, periods, now],
  );
  const guidance = useMemo(
    () => getDailyEnergyGuidance(now, periods, settings.enabled ? settings : undefined),
    [now, periods, settings],
  );
  const moon = MOON_INFO[getMoonPhase(now)];
  const moonDay = getMoonDay(now);
  const dayArchetype = MOON_DAY_THEMES[moonDay];
  const sign = getMoonSign(now);
  const element = (sign?.element ?? "Earth") as Element;
  const tint = ELEMENT_TINT[element];

  const todayLog = dayLogs[0];
  const energyKey = (todayLog?.energyLevel as "low" | "medium" | "high" | undefined) ?? "low";
  const energy = ENERGY_COPY[energyKey];

  const moonHint = MOON_HINT[moon.phase]!;
  const cycleHint = phase ? CYCLE_HINT[phase.phase] : null;
  const ritual = RITUALS[moonDay % RITUALS.length];

  // Page-level CSS var so children can sip a unified accent (the day's element).
  const styleVars = { ["--rhythm-tint" as string]: tint.hsl } as React.CSSProperties;

  return (
    <div style={styleVars} className="space-y-5">
      {/* === HERO: Your Rhythm Today ============================================ */}
      <HeroRhythmCard
        cycleLabel={phase?.label}
        moonLabel={moon.label}
        moonDay={moonDay}
        headline={dayArchetype?.headline ?? guidance.headline}
        focus={guidance.focus}
        reflection={guidance.reflection}
      />

      {/* === LAYER 1 · UNDERSTAND =============================================== */}
      <SectionLabel>🌙 Understand</SectionLabel>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TintedCard accent="phase">
          <CardHead icon={<Heart className="h-3.5 w-3.5" />} title="Cycle phase" />
          {phase && cycleHint ? (
            <>
              <h3 className="mt-2 font-display text-2xl" style={{ color: `hsl(var(${phase.tokenVar}))` }}>
                {phase.label}
              </h3>
              <p className="mt-1 text-sm text-foreground/80">{cycleHint.line1}</p>
              <p className="text-sm text-foreground/65">{cycleHint.line2}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Not yet tracking. Open Cyclical Living to begin.</p>
          )}
        </TintedCard>

        <TintedCard accent="moon">
          <CardHead icon={<MoonIcon className="h-3.5 w-3.5" />} title="Moon phase" />
          <div className="mt-2 flex items-start gap-3">
            <MoonGlyph size={38} />
            <div>
              <h3 className="font-display text-2xl text-foreground">{moon.label}</h3>
              <p className="mt-1 text-sm text-foreground/80">{moonHint.line1}</p>
              <p className="text-sm text-foreground/65">{moonHint.line2}</p>
            </div>
          </div>
        </TintedCard>

        <TintedCard accent="tint">
          <CardHead icon={<CalendarIcon className="h-3.5 w-3.5" />} title="Moon day" />
          <h3 className="mt-2 font-display text-2xl text-foreground">Day {moonDay}</h3>
          {dayArchetype && (
            <>
              <p className="mt-0.5 text-sm italic" style={{ color: `hsl(var(--rhythm-tint))` }}>
                {dayArchetype.headline.split("—")[0]?.trim()}
              </p>
              <p className="mt-1 text-sm text-foreground/70">{dayArchetype.reflection}</p>
            </>
          )}
        </TintedCard>
      </div>

      {/* === LAYER 2 · SUPPORT ================================================== */}
      <SectionLabel>🌿 Support</SectionLabel>
      <div className="grid gap-4 lg:grid-cols-2">
        <TintedCard accent="tint">
          <CardHead icon={<Activity className="h-3.5 w-3.5" />} title="Energy today" />
          <h3 className="mt-2 font-display text-2xl text-foreground">{energy.title}</h3>
          <p className="mt-1 text-sm text-foreground/75">{energy.body}</p>
          <EnergyMeter filled={energy.bars} />
        </TintedCard>

        <TintedCard accent="tint">
          <CardHead icon={<Leaf className="h-3.5 w-3.5" />} title="Today's invitation" />
          <p className="mt-2 text-[15px] leading-relaxed text-foreground/85">
            A good use of your energy today may be{" "}
            <em className="text-foreground">{guidance.focus.join(", ").toLowerCase()}</em>{" "}
            — {phase?.invitation?.toLowerCase() ?? "honor what your body is asking for."}
          </p>
        </TintedCard>
      </div>

      {/* === LAYER 3 · ACT ====================================================== */}
      <SectionLabel>✨ Act</SectionLabel>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TintedCard accent="tint">
          <CardHead icon={<Sparkles className="h-3.5 w-3.5" />} title="Best use of energy today" />
          <BestUseList phaseHints={phase?.planningHints ?? guidance.focus.map(f => f.toLowerCase())} />
        </TintedCard>

        <TintedCard accent="tint">
          <CardHead icon={<ritual.icon className="h-3.5 w-3.5" />} title="Today's ritual" />
          <h3 className="mt-2 font-display text-xl text-foreground">{ritual.title}</h3>
          <p className="mt-1 text-sm text-foreground/75">{ritual.body}</p>
        </TintedCard>

        <TintedCard accent="tint">
          <CardHead icon={<Droplet className="h-3.5 w-3.5" />} title="Gentle reminder" />
          <p className="mt-2 text-sm text-foreground/85">
            Sip water. Soften your shoulders. The day will hold you.
          </p>
        </TintedCard>
      </div>

      {/* === Footer affirmation ribbon ========================================== */}
      <div
        className="cozy-card flex items-center justify-center gap-3 px-4 py-3 text-center text-sm italic text-foreground/85"
        style={{ background: `linear-gradient(90deg, hsl(var(--rhythm-tint) / 0.10), hsl(var(--card)) 50%, hsl(var(--rhythm-tint) / 0.10))` }}
      >
        <span aria-hidden>🌿</span>
        <span>You are the safe place. Today, be it for yourself.</span>
        <span aria-hidden>🌿</span>
      </div>
    </div>
  );
}

/* ─────────── building blocks ─────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="pl-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
      {children}
    </p>
  );
}

function CardHead({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-foreground/70">
      <span
        className="grid h-6 w-6 place-items-center rounded-full bg-background/70"
        style={{ color: `hsl(var(--rhythm-tint))` }}
      >
        {icon}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">{title}</span>
    </div>
  );
}

function TintedCard({
  children,
  accent,
  className = "",
}: {
  children: React.ReactNode;
  accent: "tint" | "moon" | "phase";
  className?: string;
}) {
  const bg =
    accent === "moon"
      ? `linear-gradient(160deg, hsl(215 50% 55% / 0.14) 0%, hsl(var(--card)) 75%)`
      : accent === "phase"
        ? `linear-gradient(160deg, hsl(350 50% 55% / 0.12) 0%, hsl(var(--card)) 75%)`
        : `linear-gradient(160deg, hsl(var(--rhythm-tint) / 0.14) 0%, hsl(var(--card)) 75%)`;
  return (
    <div className={`cozy-card p-4 ${className}`} style={{ background: bg }}>
      {children}
    </div>
  );
}

function HeroRhythmCard({
  cycleLabel, moonLabel, moonDay, headline, focus, reflection,
}: {
  cycleLabel?: string; moonLabel: string; moonDay: number;
  headline: string; focus: string[]; reflection: string;
}) {
  // Trim the headline at the em-dash if present (archetype short line).
  const short = headline.split(/[—.]/)[0]?.trim() || headline;
  return (
    <div
      className="cozy-card relative overflow-hidden p-6 sm:p-8"
      style={{
        background: `
          radial-gradient(120% 80% at 90% 10%, hsl(var(--rhythm-tint) / 0.22) 0%, transparent 55%),
          linear-gradient(160deg, hsl(var(--rhythm-tint) / 0.10) 0%, hsl(var(--card)) 70%)
        `,
        boxShadow: `inset 0 0 0 1px hsl(var(--rhythm-tint) / 0.18)`,
      }}
    >
      <p className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/70">
        <Sparkles className="h-3 w-3" style={{ color: `hsl(var(--rhythm-tint))` }} />
        Your rhythm today
      </p>
      <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-foreground/75">
        <span className="inline-flex items-center gap-1.5"><MoonIcon className="h-3.5 w-3.5" /> {moonLabel}</span>
        {cycleLabel && <span aria-hidden className="text-foreground/40">·</span>}
        {cycleLabel && <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" /> {cycleLabel}</span>}
        <span aria-hidden className="text-foreground/40">·</span>
        <span className="inline-flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5" /> Day {moonDay}</span>
      </p>

      <h2 className="mt-5 text-balance text-center font-display text-3xl leading-tight text-foreground sm:text-4xl">
        {short}.
      </h2>

      <div className="mx-auto mt-6 grid max-w-2xl gap-5 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/55">Focus</p>
          <ul className="mt-2 space-y-1.5">
            {focus.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-foreground/85">
                <CheckCircle2 className="h-3.5 w-3.5" style={{ color: `hsl(var(--rhythm-tint))` }} />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/55">Reflection</p>
          <p className="mt-2 font-display text-[15px] italic leading-snug text-foreground/85">
            “{reflection}”
          </p>
        </div>
      </div>
    </div>
  );
}

function EnergyMeter({ filled, total = 6 }: { filled: number; total?: number }) {
  return (
    <div className="mt-3">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{
              background:
                i < filled
                  ? `hsl(var(--rhythm-tint))`
                  : `hsl(var(--muted-foreground) / 0.18)`,
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-[0.18em] text-foreground/55">
        <span>Low</span><span>High</span>
      </div>
    </div>
  );
}

function BestUseList({ phaseHints }: { phaseHints: string[] }) {
  const supportive = phaseHints.slice(0, 4);
  const drains = ["Starting major projects", "Overcommitting"];
  return (
    <div className="mt-2 grid gap-3 text-sm">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/55">Supportive</p>
        <ul className="mt-1 space-y-1">
          {supportive.map(s => (
            <li key={s} className="flex items-center gap-2 capitalize text-foreground/85">
              <CheckCircle2 className="h-3.5 w-3.5" style={{ color: `hsl(var(--rhythm-tint))` }} />
              {s}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/55">May drain you</p>
        <ul className="mt-1 space-y-1">
          {drains.map(s => (
            <li key={s} className="flex items-center gap-2 text-foreground/65">
              <Circle className="h-3.5 w-3.5 text-muted-foreground/60" />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}