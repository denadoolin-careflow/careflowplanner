import { useMemo, useState } from "react";
import { useCycle } from "@/lib/cycle-store";
import { getPhaseInfo, getMoonAlignment, MOON_ALIGNMENT_LABEL, predictNextPeriod } from "@/lib/cycle";
import { getMoonPhase, MOON_INFO } from "@/lib/moon";
import { differenceInCalendarDays, parseISO, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Droplet, Sparkles, Plus } from "lucide-react";
import { CycleLogSheet } from "./CycleLogSheet";
import { Link } from "react-router-dom";

export function CycleWidget() {
  const { settings, periods } = useCycle();
  const [open, setOpen] = useState(false);
  const now = new Date();
  const info = useMemo(() => getPhaseInfo(now, periods, settings), [now, periods, settings]);
  const next = useMemo(() => predictNextPeriod(periods, settings, now), [periods, settings, now]);
  const moonPhase = getMoonPhase(now);
  const moon = MOON_INFO[moonPhase];
  const alignment = settings.pairWithMoon && periods[0]
    ? getMoonAlignment(getMoonPhase(parseISO(periods[0].periodStart)), settings)
    : null;

  if (!settings.enabled) {
    return (
      <section className="cozy-card overflow-hidden p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-primary-soft to-accent-soft text-2xl">🌸</div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Cyclical living</p>
            <p className="font-display text-base">Plan with your cycle</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Track your menstrual cycle, paired with the moon. Get phase-aware planning hints.</p>
            <Button asChild size="sm" variant="outline" className="mt-2 h-7 text-xs"><Link to="/settings">Enable in Settings</Link></Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cozy-card overflow-hidden p-4">
      <div className="flex items-start gap-3">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl"
          style={info ? { background: `hsl(var(${info.tokenVar}) / 0.18)`, color: `hsl(var(${info.tokenVar}))` } : { background: "hsl(var(--muted))" }}
        >
          <span aria-hidden>{info?.glyph ?? "🌸"}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Cyclical living</p>
          {info ? (
            <>
              <p className="font-display text-base">
                Day {info.cycleDay} · <span style={{ color: `hsl(var(${info.tokenVar}))` }}>{info.label}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {info.archetype} · {info.daysUntilNextPeriod === 0 ? "period expected today" : `~${info.daysUntilNextPeriod}d to next period`}
                {info.inFertileWindow && settings.showFertility && " · 🌱 fertile"}
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-base">No cycle data yet</p>
              <p className="text-[11px] text-muted-foreground">Log your first period to unlock phase tracking.</p>
            </>
          )}
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 rounded-full" onClick={() => setOpen(true)} aria-label="Log cycle">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 space-y-2 border-t border-border/50 pt-2.5 text-[11.5px]">
        {info && (
          <p className="italic text-foreground/80">{info.invitation}</p>
        )}
        {settings.pairWithMoon && (
          <p className="text-muted-foreground">
            <span aria-hidden className="mr-1">{moon.glyph}</span>
            {moon.label}
            {alignment && <> · <span>{MOON_ALIGNMENT_LABEL[alignment].split(" · ")[0]}</span></>}
          </p>
        )}
        {next && !info?.inFertileWindow && (
          <p className="text-muted-foreground">Next period around {format(next, "MMM d")} ({differenceInCalendarDays(next, now)}d)</p>
        )}
      </div>

      <div className="mt-3 flex gap-1.5">
        <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => setOpen(true)}>
          <Droplet className="h-3.5 w-3.5" /> {info ? "Log today" : "Log period"}
        </Button>
        <Button asChild size="sm" variant="ghost" className="gap-1.5 text-xs">
          <Link to="/settings"><Sparkles className="h-3.5 w-3.5" /></Link>
        </Button>
      </div>

      <CycleLogSheet open={open} onOpenChange={setOpen} />
    </section>
  );
}
