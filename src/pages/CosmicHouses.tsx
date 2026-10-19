import { useMemo } from "react";
import { AstroPageHeader, NeedsChart } from "@/components/cosmic/AstroPageHeader";
import { HOUSE_TITLE } from "@/components/cosmic/HouseDetailDialog";
import { SIGN_GLYPH } from "@/lib/cosmic/glyphs";
import { computeProfection, houseTopics } from "@/lib/cosmic/astro/profections";
import { houseOf } from "@/lib/cosmic/astro/houses";
import { bodyLongitude } from "@/lib/cosmic/astro/bodies";
import { DIGNITY_MEANING, SIGNS, TRADITIONAL_RULER, TRANSIT_BODIES, dignityOf } from "@/lib/cosmic/sky";
import { useMyChart } from "@/lib/cosmic/use-my-chart";
import { cn } from "@/lib/utils";

export default function CosmicHouses() {
  const { chart } = useMyChart();
  const data = useMemo(() => {
    if (!chart?.houses) return null;
    const h = chart.houses;
    const ascIdx = SIGNS.indexOf(h.ascendantSign);
    const prof = computeProfection(new Date(chart.birth.date + "T12:00:00"), h.ascendantSign);
    const now = new Date();
    const transitsByHouse = new Map<number, string[]>();
    TRANSIT_BODIES.forEach(b => { const n = houseOf(bodyLongitude(b, now), h); transitsByHouse.set(n, [...(transitsByHouse.get(n) ?? []), b]); });
    return Array.from({ length: 12 }, (_, i) => {
      const house = i + 1;
      const sign = SIGNS[(ascIdx + i) % 12];
      const ruler = TRADITIONAL_RULER[sign];
      const rulerP = chart.planets.find(p => p.body === ruler);
      return {
        house, sign, ruler,
        rulerSign: rulerP?.sign, rulerHouse: rulerP?.house,
        rulerDignity: rulerP ? dignityOf(ruler, rulerP.sign) : null,
        occupants: chart.planets.filter(p => p.house === house).map(p => p.body as string),
        transits: transitsByHouse.get(house) ?? [],
        profected: prof.house === house,
        prof,
      };
    });
  }, [chart]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 pb-28">
      <AstroPageHeader title="Houses" subtitle="Your chart, one area of life at a time." />
      {!chart ? <NeedsChart /> : !data ? <p className="text-sm text-muted-foreground">Add a birth time and place to see houses.</p> : (
        <>
          <p className="text-sm"><strong>{chart.houses!.ascendantSign} Rising</strong> ({Math.floor(chart.houses!.ascendant % 30)}°) · Whole Sign houses: each house is one full sign, starting with {chart.houses!.ascendantSign} as house 1 · Chart ruler <strong>{chart.chartRuler}</strong>.</p>
          <p className="text-sm">This year ({data[0].prof.yearStarts} → {data[0].prof.yearEnds}) your profection lights up <strong>house {data[0].prof.house}</strong>, with <strong>{data[0].prof.timeLord}</strong> as the year's guide.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.map(d => (
              <section key={d.house} className={cn("cozy-card p-4 space-y-1.5 border-l-4", d.profected && "ring-2 ring-primary")}
                style={{ borderLeftColor: `hsl(var(${signTintVar(d.sign, colorMode)}))`, background: `linear-gradient(135deg, hsl(var(${signTintVar(d.sign, colorMode)}) / 0.14), hsl(var(--card)) 60%)` }}>
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-base">House {d.house} · {HOUSE_TITLE[d.house]}</p>
                  <span className="rounded-full px-2 py-0.5 text-sm text-foreground" style={{ background: `hsl(var(${signTintVar(d.sign, colorMode)}) / 0.25)` }}>{SIGN_GLYPH[d.sign]} {d.sign}</span>
                </div>
                <p className="text-xs text-muted-foreground">{houseTopics(d.house)}</p>
                <p className="text-sm">Ruled by <strong>{d.ruler}</strong>{d.rulerSign && <> in {d.rulerSign}{d.rulerHouse ? ` (house ${d.rulerHouse})` : ""}</>}
                  {d.rulerDignity && <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize" title={DIGNITY_MEANING[d.rulerDignity]}>{d.rulerDignity}</span>}
                </p>
                {d.rulerDignity && <p className="text-xs text-muted-foreground">{DIGNITY_MEANING[d.rulerDignity]}</p>}
                <p className="text-xs"><span className="text-muted-foreground">Natal planets:</span> {d.occupants.join(", ") || "none — read through its ruler"}</p>
                {d.transits.length > 0 && <p className="text-xs"><span className="text-muted-foreground">Passing through now:</span> {d.transits.join(", ")}</p>}
                {d.profected && <p className="text-xs font-medium text-primary">Activated by this year's profection</p>}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
