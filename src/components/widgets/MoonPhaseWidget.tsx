import { MOON_INFO, daysUntilFull, daysUntilNew, getIllumination, getMoonPhase } from "@/lib/moon";

export function MoonPhaseWidget({ compact = false }: { compact?: boolean }) {
  const now = new Date();
  const phase = getMoonPhase(now);
  const info = MOON_INFO[phase];
  const illum = getIllumination(now);
  const toFull = daysUntilFull(now);
  const toNew = daysUntilNew(now);

  return (
    <section aria-label="Tonight's moon" className="cozy-card overflow-hidden p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-primary-soft to-accent-soft text-2xl">
          <span aria-hidden>{info.glyph}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tonight's moon</p>
          <p className="font-display text-base">{info.label}</p>
          <p className="text-[11px] text-muted-foreground">{illum}% lit · {toFull === 0 ? "full tonight" : toFull < toNew ? `${toFull} days to full` : `${toNew} days to new`}</p>
        </div>
      </div>
      {!compact && (
        <p className="mt-3 border-t border-border/50 pt-2.5 text-[12.5px] italic text-foreground/80">{info.invitation}</p>
      )}
    </section>
  );
}