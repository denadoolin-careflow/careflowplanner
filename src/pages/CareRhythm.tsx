import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RhythmForecastCard } from "@/components/rhythm/RhythmForecastCard";
import { AnchorFlowCard } from "@/components/care/AnchorFlowCard";
import { CareLoopIndicator } from "@/components/care/CareLoopIndicator";
import { useCareGuide } from "@/lib/care-guide";
import { format } from "date-fns";

export default function CareRhythm() {
  const { brief, loading, refresh } = useCareGuide();
  const today = new Date();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back to CARE Hub">
          <Link to="/care"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">CARE · Rhythm</p>
          <h1 className="font-display text-2xl font-semibold leading-tight">Today's rhythm</h1>
          <p className="text-xs text-muted-foreground">{format(today, "EEEE, MMMM d")}</p>
        </div>
        <div className="ml-auto">
          <Button size="sm" variant="outline" onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <CareLoopIndicator active="rhythm" />

      <section className="grid gap-4 md:grid-cols-2">
        <RhythmForecastCard variant="today" />
        <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base">Care Guide insight</h2>
          </div>
          <p className="text-sm italic text-foreground/85">{brief.rhythm_insight}</p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Anchor reminder</p>
          <p className="text-sm text-foreground/90">{brief.anchor_reminder}</p>
        </div>
      </section>

      <AnchorFlowCard />

      <section className="rounded-2xl border border-border/50 bg-card/60 p-4">
        <h2 className="font-display text-base">Today's focus</h2>
        <ul className="mt-2 space-y-2">
          {brief.focus.map((f, i) => (
            <li key={i} className="rounded-lg bg-primary-soft/30 p-2.5">
              <p className="text-sm font-medium">{f.title}</p>
              {f.why && <p className="text-[11px] text-muted-foreground">{f.why}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}