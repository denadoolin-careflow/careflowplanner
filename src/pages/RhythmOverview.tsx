import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Moon, Sparkles } from "lucide-react";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/cards/SectionCard";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, getMoonAlignment, MOON_ALIGNMENT_LABEL, predictNextPeriod } from "@/lib/cycle";
import { getMoonPhase, MOON_INFO, getIllumination, daysUntilFull, daysUntilNew } from "@/lib/moon";

export default function RhythmOverview() {
  const navigate = useNavigate();
  const { settings, periods, loaded } = useCycle();
  const today = new Date();

  const moonPhase = getMoonPhase(today);
  const moon = MOON_INFO[moonPhase];
  const illum = getIllumination(today);
  const toFull = daysUntilFull(today);
  const toNew = daysUntilNew(today);
  const nextMajor = toFull <= toNew
    ? { label: "Full moon", iso: format(addDays(today, toFull), "MMM d") }
    : { label: "New moon", iso: format(addDays(today, toNew), "MMM d") };

  const phaseInfo = settings.enabled ? getPhaseInfo(today, periods, settings) : null;
  const nextPeriod = settings.enabled ? predictNextPeriod(periods, settings, today) : null;

  const periodStartMoon = periods[periods.length - 1]
    ? getMoonPhase(new Date(periods[periods.length - 1].periodStart))
    : null;
  const alignment = periodStartMoon ? getMoonAlignment(periodStartMoon, settings) : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold leading-tight">Your rhythm today</h1>
          <p className="text-xs text-muted-foreground">{format(today, "EEEE, MMMM d")}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Moon card */}
        <SectionCard title="Moon today" accent="calm">
          <div className="flex items-start gap-4">
            <div className="text-6xl leading-none">{moon.glyph}</div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="font-display text-xl font-semibold">{moon.label}</div>
              <div className="text-xs text-muted-foreground">{illum}% illuminated</div>
              <div className="text-xs text-muted-foreground">Next {nextMajor.label} · {nextMajor.iso}</div>
              <p className="pt-2 text-sm leading-relaxed text-foreground/90">{moon.invitation}</p>
              <p className="text-xs italic text-muted-foreground">{moon.affirmation}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button asChild size="sm" variant="secondary">
              <Link to="/health?tab=lunar">
                Open Lunar Living <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </SectionCard>

        {/* Cycle card */}
        <SectionCard title="Cycle today" accent="warm">
          {!settings.enabled ? (
            <EmptyCycle title="Cycle tracking is off" body="Enable cyclical living in Settings to see your phase, archetype, and planning hints here.">
              <Button asChild size="sm" variant="secondary"><Link to="/settings">Open Settings</Link></Button>
            </EmptyCycle>
          ) : periods.length === 0 ? (
            <EmptyCycle title="Log your last period" body="Once we know your last period date, we can show your phase, day, and gentle planning invitations.">
              <Button asChild size="sm" variant="secondary"><Link to="/health?tab=cycle">Log period</Link></Button>
            </EmptyCycle>
          ) : !phaseInfo || !loaded ? (
            <EmptyCycle title="Loading…" body="" />
          ) : (
            <>
              <div className="flex items-start gap-4">
                <div className="text-6xl leading-none">{phaseInfo.glyph}</div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="font-display text-xl font-semibold">{phaseInfo.label} <span className="text-sm font-normal capitalize text-muted-foreground">· {phaseInfo.archetype}</span></div>
                  <div className="text-xs text-muted-foreground">
                    Cycle day {phaseInfo.cycleDay} of {phaseInfo.cycleLength}
                    {nextPeriod && ` · next period ${format(nextPeriod, "MMM d")}`}
                  </div>
                  <p className="pt-2 text-sm leading-relaxed text-foreground/90">{phaseInfo.invitation}</p>
                  <p className="text-xs italic text-muted-foreground">{phaseInfo.affirmation}</p>
                  {phaseInfo.planningHints.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {phaseInfo.planningHints.slice(0, 4).map((h) => (
                        <span key={h} className="rounded-full border border-border/60 bg-card/60 px-2 py-0.5 text-[10px] text-muted-foreground">{h}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button asChild size="sm" variant="secondary">
                  <Link to="/health?tab=cycle">
                    Open Cyclical Living <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </SectionCard>
      </div>

      {alignment && (
        <SectionCard title="How they align today">
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm text-foreground/90">{MOON_ALIGNMENT_LABEL[alignment]}</p>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function EmptyCycle({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 py-4">
      <Moon className="h-6 w-6 text-muted-foreground" />
      <div className="font-display text-base font-semibold">{title}</div>
      {body && <p className="text-sm text-muted-foreground">{body}</p>}
      {children}
    </div>
  );
}