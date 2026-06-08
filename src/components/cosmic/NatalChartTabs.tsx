import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NatalWheel } from "./NatalWheel";
import { PlacementDetailDialog } from "./PlacementDetailDialog";
import { HOUSE_THEMES } from "@/lib/cosmic/house-themes";
import { SIGN_GLYPH, ELEMENT_VAR } from "@/lib/cosmic/glyphs";
import { shortAspectMeaning, aspectTone } from "@/lib/cosmic/interpretations";
import type { NatalChartV2, NatalPlanet } from "@/lib/cosmic/chart";
import type { AspectKind } from "@/lib/cosmic/active-aspects";

/**
 * Tabbed natal-chart module replacing the giant standalone wheel.
 * Wheel · Houses · Aspects · Dominants.
 */
export function NatalChartTabs({ chart }: { chart: NatalChartV2 }) {
  const [selected, setSelected] = useState<NatalPlanet | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <section className="cozy-card glass-panel p-4 sm:p-5">
      <Tabs defaultValue="wheel" className="w-full">
        <TabsList className="mb-3 grid w-full grid-cols-4 bg-muted/40">
          <TabsTrigger value="wheel">Wheel</TabsTrigger>
          <TabsTrigger value="houses">Houses</TabsTrigger>
          <TabsTrigger value="aspects">Aspects</TabsTrigger>
          <TabsTrigger value="dominants">Dominants</TabsTrigger>
        </TabsList>

        <TabsContent value="wheel" className="mt-0">
          <NatalWheel
            chart={chart}
            onSelectPlanet={(p) => { setSelected(p); setOpen(true); }}
          />
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Tap a planet to learn more.</p>
        </TabsContent>

        <TabsContent value="houses" className="mt-0">
          <div className="grid gap-2 sm:grid-cols-2">
            {HOUSE_THEMES.map((h) => {
              const sign = chart.houses?.cusps[h.num - 1] != null
                ? Math.floor(chart.houses!.cusps[h.num - 1] / 30)
                : null;
              const signName = sign != null
                ? (["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"] as const)[sign]
                : null;
              const planetsHere = chart.planets.filter((p) => p.house === h.num);
              return (
                <div key={h.num} className="rounded-xl border border-border/50 bg-card/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">House {h.num}</p>
                    {signName && (
                      <span className="text-[11.5px] text-muted-foreground">{SIGN_GLYPH[signName]} {signName}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[13.5px] font-medium leading-tight">{h.title}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">{h.blurb}</p>
                  {planetsHere.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {planetsHere.map((p) => (
                        <span key={p.body} className="text-[12px] text-foreground/80" title={`${p.body} in ${p.sign}`}>
                          {p.glyph}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="aspects" className="mt-0">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="py-1.5 font-normal">Aspect</th>
                  <th className="py-1.5 font-normal">Meaning</th>
                  <th className="py-1.5 text-right font-normal">Orb</th>
                </tr>
              </thead>
              <tbody>
                {chart.aspects.slice(0, 40).map((a, i) => {
                  const tone = aspectTone(a.aspect.name as AspectKind);
                  return (
                    <tr key={i} className="border-t border-border/40">
                      <td className="py-1.5">
                        <span
                          className={
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] " +
                            (tone === "harmonic"
                              ? "bg-[hsl(var(--aspect-harmonious)/0.15)] text-[hsl(var(--aspect-harmonious))]"
                              : tone === "tension"
                              ? "bg-[hsl(var(--aspect-dynamic)/0.15)] text-[hsl(var(--aspect-dynamic))]"
                              : "bg-muted text-foreground/70")
                          }
                        >
                          {a.a} {a.aspect.name} {a.b}
                        </span>
                      </td>
                      <td className="py-1.5 text-muted-foreground">{shortAspectMeaning(a.aspect.name as AspectKind)}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{a.aspect.orb.toFixed(1)}°</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="dominants" className="mt-0 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Elements</p>
            <div className="mt-1.5 space-y-1.5">
              {(["Fire","Earth","Air","Water"] as const).map((el) => {
                const count = chart.dominants.elements[el] ?? 0;
                const max = Math.max(1, ...Object.values(chart.dominants.elements));
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={el} className="flex items-center gap-2 text-[12px]">
                    <span className="w-12 text-muted-foreground">{el}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/50">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: `hsl(var(${ELEMENT_VAR[el]}))` }}
                      />
                    </div>
                    <span className="w-6 text-right text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Modalities</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11.5px]">
              {(["Cardinal","Fixed","Mutable"] as const).map((m) => (
                <span key={m} className="rounded-full border border-border/50 bg-card/70 px-2.5 py-1">
                  {m} · {chart.dominants.modalities[m] ?? 0}
                </span>
              ))}
            </div>
          </div>
          <p className="text-[11.5px] text-muted-foreground">Chart shape: {chart.dominants.chartShape}</p>
        </TabsContent>
      </Tabs>

      <PlacementDetailDialog chart={chart} planet={selected} open={open} onOpenChange={setOpen} />
    </section>
  );
}