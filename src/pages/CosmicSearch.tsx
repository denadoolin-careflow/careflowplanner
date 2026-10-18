import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AstroPageHeader, NeedsChart } from "@/components/cosmic/AstroPageHeader";
import { OrbPeakChart } from "@/components/cosmic/OrbPeakChart";
import { SkyRowActions } from "@/components/cosmic/SkyRowActions";
import { Button } from "@/components/ui/button";
import type { ExtPlanet } from "@/lib/cosmic/astro/bodies";
import { MAJOR_ASPECTS, TRANSIT_BODIES, searchTransit } from "@/lib/cosmic/sky";
import { useMyChart } from "@/lib/cosmic/use-my-chart";

export default function CosmicSearch() {
  const { chart } = useMyChart();
  const [body, setBody] = useState<ExtPlanet>("Saturn");
  const [aspect, setAspect] = useState("conjunction");
  const [target, setTarget] = useState("Sun");
  const [run, setRun] = useState(0);

  const targets = useMemo(() => chart ? [...chart.planets.map(p => ({ id: p.body as string, lon: p.longitude })),
    ...(chart.houses ? [{ id: "Ascendant", lon: chart.houses.ascendant }, { id: "Midheaven", lon: chart.houses.midheaven }] : [])] : [], [chart]);
  const angle = MAJOR_ASPECTS.find(a => a.name === aspect)!.angle;
  const lon = targets.find(t => t.id === target)?.lon;
  const now = useMemo(() => new Date(), [run]);
  const hits = useMemo(() => run && lon != null ? searchTransit(body, lon, angle, now, 730) : [], [run, body, lon, angle, now]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 pb-28">
      <AstroPageHeader title="Transit search" subtitle="Find exact dates for any transit to your chart over the next two years." />
      {!chart ? <NeedsChart /> : (
        <>
          <div className="cozy-card flex flex-wrap items-end gap-2 p-4 text-sm">
            <label className="flex flex-col gap-1">Transiting planet
              <select value={body} onChange={e => setBody(e.target.value as ExtPlanet)} className="rounded-md border border-border bg-background px-2 py-1.5">
                {TRANSIT_BODIES.map(b => <option key={b}>{b}</option>)}
              </select></label>
            <label className="flex flex-col gap-1">Aspect
              <select value={aspect} onChange={e => setAspect(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 capitalize">
                {MAJOR_ASPECTS.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
              </select></label>
            <label className="flex flex-col gap-1">Your natal point
              <select value={target} onChange={e => setTarget(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5">
                {targets.map(t => <option key={t.id}>{t.id}</option>)}
              </select></label>
            <Button onClick={() => setRun(r => r + 1)}>Search</Button>
          </div>
          {run > 0 && (
            <section className="cozy-card p-4 space-y-3">
              <p className="font-display text-base capitalize">{body} {aspect} your {target}</p>
              {hits.length === 0 ? <p className="text-sm text-muted-foreground">No exact passes in the next two years.</p> : (
                <ul className="divide-y divide-border">
                  {hits.map(h => (
                    <li key={h.toISOString()} className="flex items-center justify-between py-2 text-sm">
                      <span>{format(h, body === "Moon" ? "EEE, MMM d · h a" : "EEEE, MMM d, yyyy")}</span>
                      <SkyRowActions title={`${body} ${aspect} natal ${target}`} date={h} />
                    </li>
                  ))}
                </ul>
              )}
              {lon != null && <OrbPeakChart body={body} natalLon={lon} angle={angle} from={now} days={body === "Moon" ? 30 : 730} />}
            </section>
          )}
        </>
      )}
    </div>
  );
}
