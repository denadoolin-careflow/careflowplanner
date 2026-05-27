import { useMemo } from "react";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo } from "@/lib/cycle";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { MoonGlyph } from "@/components/widgets/MoonGlyph";
import { Heart, Droplet, Moon as MoonIcon, Activity, Wind } from "lucide-react";

/**
 * Calm snapshot — Sage Sanctuary dashboard.
 * Soft widgets summarizing cycle, moon, energy, and a "what do you need today?" prompt.
 */
export function HealthDashboard() {
  const { settings, periods, dayLogs } = useCycle();
  const now = new Date();
  const phase = useMemo(
    () => (settings.enabled ? getPhaseInfo(now, periods, settings) : null),
    [settings, periods, now],
  );
  const moon = MOON_INFO[getMoonPhase()];
  const today = dayLogs[0];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Widget
        title="Cycle phase"
        accent="primary"
        icon={<Heart className="h-4 w-4" />}
      >
        {phase ? (
          <>
            <p
              className="font-display text-2xl"
              style={{ color: `hsl(var(${phase.tokenVar}))` }}
            >
              {phase.label}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Day {phase.cycleDay} · {phase.archetype}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Not yet tracking</p>
        )}
      </Widget>

      <Widget
        title="Moon phase"
        accent="moon"
        icon={<MoonIcon className="h-4 w-4" />}
      >
        <div className="flex items-center gap-3">
          <MoonGlyph size={44} />
          <div>
            <p className="font-display text-lg">{moon.label}</p>
            <p className="text-xs italic text-muted-foreground">
              {moon.affirmation}
            </p>
          </div>
        </div>
      </Widget>

      <Widget
        title="Energy today"
        accent="secondary"
        icon={<Activity className="h-4 w-4" />}
      >
        <p className="font-display text-2xl capitalize">
          {today?.energyLevel ?? "—"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {today?.mood ? `Feeling ${today.mood}` : "Tap Cyclical Living to log"}
        </p>
      </Widget>

      <Widget
        title="What do you need today?"
        accent="accent"
        icon={<Wind className="h-4 w-4" />}
        wide
      >
        <p className="text-sm italic text-foreground/80">
          "{phase?.invitation ?? moon.invitation}"
        </p>
      </Widget>

      <Widget
        title="Gentle reminder"
        accent="warm"
        icon={<Droplet className="h-4 w-4" />}
      >
        <p className="text-sm text-foreground/80">
          Sip water. Soften your shoulders. The day will hold you.
        </p>
      </Widget>
    </div>
  );
}

function Widget({
  title,
  children,
  icon,
  accent,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  accent: "primary" | "secondary" | "accent" | "warm" | "moon";
  wide?: boolean;
}) {
  const bg: Record<typeof accent, string> = {
    primary: "linear-gradient(160deg, hsl(258 60% 96%) 0%, hsl(var(--card)) 70%)",
    secondary: "linear-gradient(160deg, hsl(145 35% 94%) 0%, hsl(var(--card)) 70%)",
    accent: "linear-gradient(160deg, hsl(350 60% 96%) 0%, hsl(var(--card)) 70%)",
    warm: "linear-gradient(160deg, hsl(32 60% 95%) 0%, hsl(var(--card)) 70%)",
    moon: "linear-gradient(160deg, hsl(215 60% 94%) 0%, hsl(var(--card)) 70%)",
  };
  const fg: Record<typeof accent, string> = {
    primary: "hsl(var(--primary))",
    secondary: "hsl(var(--secondary-foreground))",
    accent: "hsl(var(--accent-foreground))",
    warm: "hsl(var(--warm-foreground))",
    moon: "hsl(var(--moon-foreground))",
  };
  return (
    <div
      className={`cozy-card p-4 ${wide ? "sm:col-span-2" : ""}`}
      style={{ background: bg[accent] }}
    >
      <div className="flex items-center gap-2">
        <div
          className="grid h-7 w-7 place-items-center rounded-full bg-card/70"
          style={{ color: fg[accent] }}
        >
          {icon}
        </div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}