import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewPills } from "@/components/layout/ViewPills";
import { PhaseIcon } from "@/lib/phase-icons";
import {
  HORIZONS, HORIZON_LABEL, HORIZON_PHASES, PHASE_LABEL, horizonKey, horizonTitle, phaseFor, stepHorizon, type Horizon,
} from "@/lib/rhythm/horizons";
import { useHorizonNote } from "@/lib/rhythm/horizon-notes";
import { HorizonPhaseCards } from "./HorizonPhaseCards";
import { GuidedReview } from "./GuidedReview";

const LS = "careflow.rhythm.horizon";

export function RhythmHub({ date }: { date: Date }) {
  const [search, setSearch] = useSearchParams();
  const fromUrl = search.get("horizon") as Horizon | null;
  const [horizon, setHorizon] = useState<Horizon>(() =>
    fromUrl && HORIZONS.includes(fromUrl) ? fromUrl : ((localStorage.getItem(LS) as Horizon) || "week"));
  const [anchor, setAnchor] = useState(date);
  const [guided, setGuided] = useState(search.get("review") === "1");
  useEffect(() => setAnchor(date), [date]);
  useEffect(() => {
    localStorage.setItem(LS, horizon);
    if (search.get("horizon") || search.get("review")) {
      const n = new URLSearchParams(search); n.delete("horizon"); n.delete("review"); setSearch(n, { replace: true });
    }
  }, [horizon]); // eslint-disable-line react-hooks/exhaustive-deps

  const now = new Date();
  const isCurrent = horizonKey(horizon, anchor) === horizonKey(horizon, now);
  const current = isCurrent ? phaseFor(horizon, now) : null;
  const api = useHorizonNote(horizon, anchor);
  const canGuide = horizon === "week" || horizon === "season";
  const nowPhases = useMemo(() => HORIZONS.map(h => ({ h, p: phaseFor(h, now) })), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 pb-10">
      <div className="space-y-1">
        <h2 className="font-display text-2xl text-foreground">Rhythm</h2>
        <p className="text-sm text-muted-foreground">Plan · Grow · Care · Let go across every timeframe.</p>
      </div>
      <ViewPills
        items={HORIZONS.map(h => ({ value: h, label: HORIZON_LABEL[h] }))}
        value={horizon} onChange={v => { setHorizon(v as Horizon); setGuided(false); }} ariaLabel="Timeframe"
      />
      <div className="flex flex-wrap gap-2" aria-label="Where you are now">
        {nowPhases.map(({ h, p }) => (
          <button key={h} type="button" onClick={() => { setHorizon(h); setAnchor(now); }}
            className="flex min-h-[36px] items-center gap-1.5 rounded-full border bg-card px-2.5 text-xs">
            <PhaseIcon phase={p} size="sm" /> <span className="text-muted-foreground">{HORIZON_LABEL[h]}:</span>
            <span className="font-medium" style={{ color: `hsl(var(--rhythm-${p}-deep))` }}>{PHASE_LABEL[p]}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Previous" onClick={() => setAnchor(d => stepHorizon(horizon, d, -1))}><ChevronLeft /></Button>
        <div className="min-w-0 text-center">
          <p className="font-display text-lg leading-tight">{horizonTitle(horizon, anchor)}</p>
          {current && <p className="text-xs text-muted-foreground">Now: {PHASE_LABEL[current]} · {HORIZON_PHASES[horizon][current].name}</p>}
          {!isCurrent && <button className="text-xs underline" onClick={() => setAnchor(now)}>Back to now</button>}
        </div>
        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Next" onClick={() => setAnchor(d => stepHorizon(horizon, d, 1))}><ChevronRight /></Button>
      </div>
      {canGuide && (
        <div className="flex justify-center">
          <Button variant={guided ? "secondary" : "default"} className="min-h-[44px]" onClick={() => setGuided(g => !g)}>
            {guided ? "Show the four phases" : horizon === "week" ? "Start Sunday weekly reset" : "Start seasonal review"}
          </Button>
        </div>
      )}
      {canGuide && guided
        ? <GuidedReview kind={horizon as "week" | "season"} date={anchor} api={api} />
        : <HorizonPhaseCards horizon={horizon} currentPhase={current} api={api} />}
    </div>
  );
}
