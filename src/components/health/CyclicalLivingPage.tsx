import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, format, parseISO } from "date-fns";
import {
  type CyclePhase,
  PHASE_META,
  getPhaseInfo,
  predictNextPeriod,
  currentFertileWindow,
  SYMPTOM_CHIPS,
  MOOD_OPTIONS,
} from "@/lib/cycle";
import { useCycle } from "@/lib/cycle-store";
import { SectionCard } from "@/components/cards/SectionCard";
import { Button } from "@/components/ui/button";
import { CycleLogSheet } from "@/components/cycle/CycleLogSheet";
import { PhaseWheel } from "./PhaseWheel";
import { Droplet, Sparkles, Heart, Brain, Activity, Moon } from "lucide-react";
import { toast } from "sonner";

const PHASE_GUIDANCE: Record<
  CyclePhase,
  {
    nourishment: string[];
    movement: string[];
    plan: string[];
    care: string[];
    prompts: string[];
  }
> = {
  menstrual: {
    nourishment: ["warm broths & stews", "iron-rich greens", "cacao", "ginger tea"],
    movement: ["restorative yoga", "slow walks", "stretching", "rest days"],
    plan: ["clear your calendar", "reflect on last cycle", "say no to the new"],
    care: ["heating pad", "early bedtime", "soft fabrics", "less screens"],
    prompts: [
      "What is asking to be released this cycle?",
      "What did the last month teach me?",
      "Where can I be softer with myself?",
    ],
  },
  follicular: {
    nourishment: ["fresh greens", "fermented foods", "light proteins", "citrus"],
    movement: ["dance", "hiking", "new classes", "creative play"],
    plan: ["start a small project", "brainstorm freely", "schedule learning"],
    care: ["fresh air", "creative outlets", "morning light", "novelty"],
    prompts: [
      "What is stirring in me?",
      "What would I love to try if I couldn't fail?",
      "Where do I feel curious?",
    ],
  },
  ovulatory: {
    nourishment: ["colorful salads", "antioxidant-rich berries", "lighter meals"],
    movement: ["spin", "strength", "group classes", "long walks with a friend"],
    plan: ["host the meeting", "have the hard conversation", "be visible"],
    care: ["social time", "speak your needs", "celebrate yourself"],
    prompts: [
      "What do I want to say aloud?",
      "Who do I want to reach for?",
      "Where is my radiance asking to be shared?",
    ],
  },
  luteal: {
    nourishment: ["complex carbs", "magnesium-rich foods", "warming spices"],
    movement: ["pilates", "yin yoga", "long walks", "gentle strength"],
    plan: ["wrap loose ends", "organize, edit, refine", "decline new asks"],
    care: ["nesting", "boundaries", "earlier nights", "calming routines"],
    prompts: [
      "What needs finishing before the next moon?",
      "Which 'yes' is actually a 'no'?",
      "How can I prepare a nest for my next bleed?",
    ],
  },
};

export default function CyclicalLivingPage() {
  const { settings, periods, dayLogs, upsertDayLog } = useCycle();
  const [sheetOpen, setSheetOpen] = useState(false);

  const now = new Date();
  const info = useMemo(
    () => getPhaseInfo(now, periods, settings),
    [now, periods, settings],
  );
  const next = useMemo(
    () => predictNextPeriod(periods, settings, now),
    [periods, settings, now],
  );
  const fertile = useMemo(
    () => currentFertileWindow(periods, settings, now),
    [periods, settings, now],
  );

  const todayIso = format(now, "yyyy-MM-dd");
  const todayLog = dayLogs.find((d) => d.date === todayIso);

  // Forecast next 14 days for the strip below the wheel
  const forecast = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(now, i);
      const p = getPhaseInfo(d, periods, settings);
      return { date: d, phase: p?.phase ?? null };
    });
  }, [periods, settings, now]);

  if (!settings.enabled) {
    return (
      <SectionCard title="Cyclical Living" accent="warm">
        <p className="text-sm text-muted-foreground">
          Enable cyclical tracking in settings to unlock phase-aware planning,
          gentle guidance, and personalized rituals woven through every part of
          CareFlow.
        </p>
        <Button asChild className="mt-3" size="sm">
          <Link to="/settings">Enable in Settings</Link>
        </Button>
      </SectionCard>
    );
  }

  const guidance = info ? PHASE_GUIDANCE[info.phase] : null;

  return (
    <div className="space-y-6">
      {/* TOP: Wheel + invitation */}
      <div className="grid gap-5 lg:grid-cols-[280px,1fr]">
        <div
          className="cozy-card flex items-center justify-center p-6"
          style={{
            background:
              "linear-gradient(160deg, hsl(36 50% 97%) 0%, hsl(145 28% 93%) 100%)",
          }}
        >
          <PhaseWheel info={info} size={220} />
        </div>

        <div className="cozy-card flex flex-col justify-between gap-4 p-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {info ? `${info.archetype} archetype` : "Awaiting first period"}
            </p>
            <h2 className="mt-1 font-display text-2xl">
              {info ? info.label : "Log your first period to begin"}
            </h2>
            {info && (
              <p className="mt-3 text-base italic text-foreground/80">
                "{info.invitation}"
              </p>
            )}
            {info && (
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <Pill>
                  {info.daysUntilNextPeriod === 0
                    ? "Period expected today"
                    : `${info.daysUntilNextPeriod}d to next period`}
                </Pill>
                {info.inFertileWindow && settings.showFertility && (
                  <Pill tone="accent">🌱 fertile window</Pill>
                )}
                {next && (
                  <Pill tone="muted">
                    next: {format(next, "MMM d")}
                  </Pill>
                )}
              </div>
            )}
          </div>

          {/* Forecast strip */}
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Next 14 days
            </p>
            <div className="flex gap-1">
              {forecast.map((d, i) => {
                const meta = d.phase ? PHASE_META[d.phase] : null;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-md text-center"
                    style={{
                      background: meta
                        ? `hsl(var(${meta.tokenVar}) / 0.22)`
                        : "hsl(var(--muted))",
                    }}
                    title={meta?.label ?? "—"}
                  >
                    <div className="px-1 py-1 text-[9px] text-muted-foreground">
                      {format(d.date, "EEEEE")}
                    </div>
                    <div
                      className="pb-1 text-[10px] font-medium"
                      style={{
                        color: meta ? `hsl(var(${meta.tokenVar}))` : undefined,
                      }}
                    >
                      {format(d.date, "d")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setSheetOpen(true)} className="gap-1.5">
              <Droplet className="h-4 w-4" /> Log today
            </Button>
            <Button variant="outline" onClick={() => setSheetOpen(true)}>
              Log period start
            </Button>
          </div>
        </div>
      </div>

      {/* GUIDANCE GRID */}
      {info && guidance && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <GuidanceCard
            icon={<Heart className="h-4 w-4" />}
            title="Nourishment"
            items={guidance.nourishment}
            tokenVar={info.tokenVar}
          />
          <GuidanceCard
            icon={<Activity className="h-4 w-4" />}
            title="Movement"
            items={guidance.movement}
            tokenVar={info.tokenVar}
          />
          <GuidanceCard
            icon={<Brain className="h-4 w-4" />}
            title="Planning"
            items={guidance.plan}
            tokenVar={info.tokenVar}
          />
          <GuidanceCard
            icon={<Sparkles className="h-4 w-4" />}
            title="Self-care"
            items={guidance.care}
            tokenVar={info.tokenVar}
          />
        </div>
      )}

      {/* QUICK CHECK-IN + JOURNAL PROMPTS */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="How are you today?" accent="sage">
          <p className="text-xs text-muted-foreground">
            One tap to capture how you're feeling. No pressure to fill it all.
          </p>

          <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Mood
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {MOOD_OPTIONS.map((m) => (
              <Chip
                key={m}
                active={todayLog?.mood === m}
                onClick={async () => {
                  await upsertDayLog(todayIso, { mood: m });
                  toast.success("Saved");
                }}
              >
                {m}
              </Chip>
            ))}
          </div>

          <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Energy
          </p>
          <div className="mt-1.5 flex gap-1.5">
            {(["low", "medium", "high"] as const).map((e) => (
              <Chip
                key={e}
                active={todayLog?.energyLevel === e}
                onClick={async () => {
                  await upsertDayLog(todayIso, { energyLevel: e });
                  toast.success("Saved");
                }}
              >
                {e}
              </Chip>
            ))}
          </div>

          <p className="mt-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Symptoms
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {SYMPTOM_CHIPS.map((s) => {
              const active = todayLog?.symptoms?.includes(s);
              return (
                <Chip
                  key={s}
                  active={active}
                  onClick={async () => {
                    const cur = todayLog?.symptoms ?? [];
                    const next = active
                      ? cur.filter((x) => x !== s)
                      : [...cur, s];
                    await upsertDayLog(todayIso, { symptoms: next });
                  }}
                >
                  {s}
                </Chip>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Reflective prompts"
          subtitle="From the wisdom of this phase"
          accent="warm"
        >
          {guidance ? (
            <ul className="space-y-3">
              {guidance.prompts.map((p) => (
                <li
                  key={p}
                  className="rounded-xl border border-border/60 bg-card/50 p-3 text-sm italic text-foreground/85"
                >
                  "{p}"
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Log a period to surface phase-aware prompts.
            </p>
          )}
          <Button asChild size="sm" variant="outline" className="mt-3 gap-1.5">
            <Link to="/journal">
              <Moon className="h-3.5 w-3.5" /> Open journal
            </Link>
          </Button>
        </SectionCard>
      </div>

      {/* PERIOD HISTORY */}
      <SectionCard title="Recent cycles" accent="calm">
        {periods.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No periods logged yet. Tap "Log period start" above to begin.
          </p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {periods.slice(0, 6).map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2"
              >
                <span className="font-medium">
                  {format(parseISO(p.periodStart), "MMM d, yyyy")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {p.periodEnd
                    ? `→ ${format(parseISO(p.periodEnd), "MMM d")}`
                    : "ongoing"}
                </span>
                {p.notes && (
                  <span className="ml-1 truncate text-xs text-muted-foreground">
                    · {p.notes}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <CycleLogSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "muted" | "accent";
}) {
  const bg =
    tone === "muted"
      ? "bg-muted text-muted-foreground"
      : tone === "accent"
        ? "bg-accent-soft text-accent-foreground"
        : "bg-secondary-soft text-secondary-foreground";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs ${bg}`}>
      {children}
    </span>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function GuidanceCard({
  icon,
  title,
  items,
  tokenVar,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  tokenVar: string;
}) {
  return (
    <div
      className="cozy-card p-4"
      style={{
        background: `linear-gradient(160deg, hsl(var(${tokenVar}) / 0.08) 0%, hsl(var(--card)) 70%)`,
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="grid h-7 w-7 place-items-center rounded-full"
          style={{
            background: `hsl(var(${tokenVar}) / 0.18)`,
            color: `hsl(var(${tokenVar}))`,
          }}
        >
          {icon}
        </div>
        <h3 className="font-display text-sm">{title}</h3>
      </div>
      <ul className="mt-3 space-y-1 text-xs text-foreground/80">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span
              className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
              style={{ background: `hsl(var(${tokenVar}))` }}
            />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}