import { useMemo } from "react";
import { getActiveAspects } from "@/lib/cosmic/active-aspects";
import { houseOf } from "@/lib/cosmic/astro/houses";
import { houseTheme } from "@/lib/cosmic/house-themes";
import { planetLongitude } from "@/lib/transits";
import type { NatalChartV2 } from "@/lib/cosmic/chart";

/**
 * Shows the houses transit planets are currently sitting in — these are
 * the life areas being "lit up" today. Quiet fallback when natal houses
 * are unavailable.
 */
export function ActiveHousesCard({ chart, date }: { chart: NatalChartV2; date: Date }) {
  const activated = useMemo(() => {
    if (!chart.houses) return [];
    const aspects = getActiveAspects(date, 5);
    const seen = new Map<number, Set<string>>();
    for (const a of aspects) {
      for (const planet of [a.a, a.b]) {
        const lon = planetLongitude(planet, date);
        const h = houseOf(lon, chart.houses);
        if (!seen.has(h)) seen.set(h, new Set());
        seen.get(h)!.add(planet);
      }
    }
    return Array.from(seen.entries())
      .map(([num, planets]) => ({ num, planets: Array.from(planets) }))
      .sort((x, y) => y.planets.length - x.planets.length)
      .slice(0, 3);
  }, [chart, date]);

  return (
    <section className="cozy-card glass-panel p-5" aria-label="Active houses">
      <h3 className="font-display text-base">Active Houses</h3>
      <p className="mt-0.5 text-[11.5px] text-muted-foreground">Life areas being lit up today.</p>

      {!chart.houses ? (
        <p className="mt-3 text-[12.5px] italic text-muted-foreground">
          Add a birth time to see which life areas are being activated.
        </p>
      ) : activated.length === 0 ? (
        <p className="mt-3 text-[12.5px] italic text-muted-foreground">A quiet day in every room.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {activated.map((row) => {
            const t = houseTheme(row.num);
            return (
              <li key={row.num} className="rounded-xl border border-border/50 bg-card/60 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[13px] font-medium">House {row.num} · {t.title}</p>
                  <p className="text-[11px] text-muted-foreground">{row.planets.join(" · ")}</p>
                </div>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">{t.blurb}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}