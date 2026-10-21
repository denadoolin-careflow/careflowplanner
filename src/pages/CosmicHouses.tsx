import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { HousesWheel } from "@/components/cosmic/HousesWheel";
import { AstroPageHeader, NeedsChart } from "@/components/cosmic/AstroPageHeader";
import { HOUSE_TITLE } from "@/components/cosmic/HouseDetailDialog";
import { SIGN_GLYPH } from "@/lib/cosmic/glyphs";
import { computeProfection, houseTopics } from "@/lib/cosmic/astro/profections";
import { houseOf } from "@/lib/cosmic/astro/houses";
import { bodyLongitude } from "@/lib/cosmic/astro/bodies";
import { DIGNITY_MEANING, SIGNS, TRADITIONAL_RULER, TRANSIT_BODIES, dignityOf } from "@/lib/cosmic/sky";
import { useMyChart } from "@/lib/cosmic/use-my-chart";
import { useStore } from "@/lib/store";
import { LIFE_AREAS } from "@/lib/goals/life-areas";
import { LifeAreaGoalList } from "@/components/goals/LifeAreaGoals";
import { cn } from "@/lib/utils";
import { useChartColorMode, signTintVar } from "@/lib/cosmic/chart-colors";
import { ChartColorToggle } from "@/components/cosmic/ChartColorToggle";
import { useChartBackground } from "@/lib/cosmic/chart-backgrounds";

export default function CosmicHouses() {
  const { state } = useStore();
  const [selected, setSelected] = useState(1);
  const goalCount = (h: number) => state.goals.filter(g => g.lifeHouse === h && g.status !== "done").length;
  const { chart } = useMyChart();
  const [colorMode] = useChartColorMode();
  const { resolved, dark } = useChartBackground();
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
          <p className="text-sm"><strong>{chart.houses?.ascendantSign} Rising</strong> ({Math.floor((chart.houses?.ascendant ?? 0) % 30)}°) · Whole Sign houses: each house is one full sign, starting with {chart.houses?.ascendantSign} as house 1 · Chart ruler <strong>{chart.chartRuler}</strong>.</p>
          <p className="text-sm">This year ({data[0].prof.yearStarts} → {data[0].prof.yearEnds}) your profection lights up <strong>house {data[0].prof.house}</strong>, with <strong>{data[0].prof.timeLord}</strong> as the year's guide.</p>
          <ChartColorToggle />
          <div className="chart-appearance" data-chart-background={resolved} data-chart-dark={dark}>
            <HousesWheel houses={data} selected={selected} colorMode={colorMode} onSelect={house => {
              setSelected(house);
              document.getElementById(`house-detail-${house}`)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
            }} />
          </div>
          <div className="chart-appearance grid grid-cols-2 gap-3 text-foreground" data-chart-background={resolved} data-chart-dark={dark}>
            {data.map(d => (
              <section key={d.house} id={`house-detail-${d.house}`} data-house={d.house} className={cn("min-w-0 scroll-mt-24 rounded-lg border border-border p-3 sm:p-4 space-y-1.5 border-l-4 break-words", selected === d.house && "col-span-2 ring-2 ring-primary", d.profected && "border-primary")}
                style={{ borderLeftColor: `hsl(var(${signTintVar(d.sign, colorMode, d.house)}))`, background: `hsl(var(${signTintVar(d.sign, colorMode, d.house)}) / 0.14)` }}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Button variant="ghost" className="h-auto min-h-11 max-w-full justify-start whitespace-normal px-0 text-left font-display text-base hover:bg-transparent" aria-pressed={selected === d.house} onClick={() => setSelected(d.house)}>House {d.house} · {HOUSE_TITLE[d.house]}</Button>
                  <span className="rounded-full px-2 py-0.5 text-sm text-foreground" style={{ background: `hsl(var(${signTintVar(d.sign, colorMode, d.house)}) / 0.25)` }}>{SIGN_GLYPH[d.sign]}︎ {d.sign}</span>
                </div>
                <p className="text-xs text-muted-foreground">{houseTopics(d.house)}</p>
                <p className="text-sm">Ruled by <strong>{d.ruler}</strong>{d.rulerSign && <> in {d.rulerSign}{d.rulerHouse ? ` (house ${d.rulerHouse})` : ""}</>}
                  {d.rulerDignity && <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize" title={DIGNITY_MEANING[d.rulerDignity]}>{d.rulerDignity}</span>}
                </p>
                {d.rulerDignity && <p className="text-xs text-muted-foreground">{DIGNITY_MEANING[d.rulerDignity]}</p>}
                <p className="text-xs"><span className="text-muted-foreground">Natal planets:</span> {d.occupants.join(", ") || "none — read through its ruler"}</p>
                {d.transits.length > 0 && <p className="text-xs"><span className="text-muted-foreground">Passing through now:</span> {d.transits.join(", ")}</p>}
                {d.profected && <p className="text-xs font-medium text-primary">Activated by this year's profection</p>}
                {(d.profected || d.transits.some(t => t === "Jupiter" || t === "Saturn")) && <p className="text-xs text-foreground">Good timing for goals here{d.transits.includes("Jupiter") ? " · Jupiter is moving through this area" : ""}{d.transits.includes("Saturn") ? " · Saturn asks for steady effort here" : ""}{d.profected ? " · your year's focus area" : ""}.</p>}
                <details className="pt-1">
                  <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary">{LIFE_AREAS[d.house].label} goals ({goalCount(d.house)})</summary>
                  <LifeAreaGoalList house={d.house} compact />
                </details>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
