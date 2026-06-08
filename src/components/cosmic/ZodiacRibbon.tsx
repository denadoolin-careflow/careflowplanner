import { Badge } from "@/components/ui/badge";
import type { NatalChartV2 } from "@/lib/cosmic/chart";
import { SIGN_GLYPH } from "@/lib/cosmic/glyphs";

/** Floating chips above the chart: Big-three + dominants + chart ruler. */
export function ZodiacRibbon({ chart }: { chart: NatalChartV2 }) {
  const sun = chart.planets.find((p) => p.body === "Sun");
  const moon = chart.planets.find((p) => p.body === "Moon");
  const asc = chart.houses?.ascendantSign;
  const dom = chart.dominants;

  const chips: { label: string; glyph?: string }[] = [];
  if (sun)  chips.push({ label: `Sun in ${sun.sign}`,   glyph: `☉ ${SIGN_GLYPH[sun.sign]}` });
  if (moon) chips.push({ label: `Moon in ${moon.sign}`, glyph: `☽ ${SIGN_GLYPH[moon.sign]}` });
  if (asc)  chips.push({ label: `${asc} rising`,        glyph: `↑ ${SIGN_GLYPH[asc]}` });
  chips.push({ label: `${dom.dominantElement} dominant` });
  chips.push({ label: `${dom.dominantModality} emphasis` });
  if (chart.chartRuler) chips.push({ label: `${chart.chartRuler}-ruled` });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <Badge
          key={c.label}
          variant="secondary"
          className="zodiac-chip rounded-full border-border/40 bg-card/70 px-3 py-1 text-[11.5px] font-normal text-foreground/85 backdrop-blur"
        >
          {c.glyph && <span aria-hidden className="mr-1.5 text-[13px] leading-none">{c.glyph}</span>}
          {c.label}
        </Badge>
      ))}
    </div>
  );
}