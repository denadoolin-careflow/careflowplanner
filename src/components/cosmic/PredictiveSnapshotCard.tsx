import { useMemo } from "react";
import { Link } from "react-router-dom";
import { computeProgressions, progressedMoonNextIngress } from "@/lib/cosmic/astro/progressions";
import { computeProfection, houseTopics } from "@/lib/cosmic/astro/profections";
import { nextSolarReturn, nextSaturnReturn, nextJupiterReturn } from "@/lib/cosmic/astro/returns";
import { eclipseActivations } from "@/lib/cosmic/astro/eclipses";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, Sparkles, Circle } from "lucide-react";
import type { NatalChartV2 } from "@/lib/cosmic/chart";

export function PredictiveSnapshotCard({ chart }: { chart: NatalChartV2 | null }) {
  const today = useMemo(() => new Date(), []);
  if (!chart || !chart.houses) {
    return (
      <section className="cozy-card p-4 sm:p-5">
        <h3 className="font-display text-base">Predictive Snapshot</h3>
        <p className="mt-2 text-sm text-muted-foreground italic">Add your birth time + place to unlock progressed Moon, profections, and returns.</p>
      </section>
    );
  }
  const birthD = new Date(chart.birth.date);
  const prog = computeProgressions(birthD, today);
  const next = progressedMoonNextIngress(birthD, today);
  const prof = computeProfection(birthD, chart.houses.ascendantSign, today);
  const solar = nextSolarReturn(birthD, today);
  const saturn = nextSaturnReturn(birthD, today);
  const jupiter = nextJupiterReturn(birthD, today);
  const eclipses = eclipseActivations(chart.planets.map(p => p.longitude), today);

  return (
    <section className="cozy-card p-4 sm:p-5 space-y-3">
      <h3 className="font-display text-base flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-primary" /> Predictive Snapshot
      </h3>

      <Row icon={<Moon className="h-3.5 w-3.5" />} label="Progressed Moon" value={`${prog.progressedMoon.sign} · ${prog.progressedMoon.lunarPhase}`} sub={next.sign ? `Next ingress → ${next.sign} (~${next.date})` : undefined} />
      <Row icon={<Circle className="h-3.5 w-3.5" />} label={`Profected Year (age ${prof.age})`} value={`House ${prof.house} · ${prof.profectedSign} · ${prof.timeLord}`} sub={houseTopics(prof.house)} />
      <Row icon={<Sun className="h-3.5 w-3.5" />} label="Next Solar Return" value={solar ? solar.toISOString().slice(0, 10) : "—"} />
      <Row icon={<Circle className="h-3.5 w-3.5" />} label="Next Saturn Return" value={saturn ? saturn.toISOString().slice(0, 10) : "—"} />
      <Row icon={<Circle className="h-3.5 w-3.5" />} label="Next Jupiter Return" value={jupiter ? jupiter.toISOString().slice(0, 10) : "—"} />

      {eclipses.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <p className="text-xs font-medium">Eclipse activations near your chart</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {eclipses.map(e => <Badge key={e.date} variant="outline" className="text-[11px] font-normal">{e.date} {e.type} {e.sign}</Badge>)}
          </div>
        </div>
      )}

      <Link to="/cosmic-flow/predictive" className="text-xs text-primary hover:underline block">Open predictive view →</Link>
    </section>
  );
}

function Row({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="flex-1">
        <p className="text-[12px] text-muted-foreground">{label}</p>
        <p className="text-[13.5px]">{value}</p>
        {sub && <p className="text-[11.5px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}