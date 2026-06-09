import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBirthChart } from "@/lib/cosmic/hooks";
import { useNatalChart } from "@/lib/cosmic/v2-hooks";
import { NatalWheel } from "@/components/cosmic/NatalWheel";
import { PlacementDetailDialog } from "@/components/cosmic/PlacementDetailDialog";
import { SignDetailDialog } from "@/components/cosmic/SignDetailDialog";
import { HouseDetailDialog, HOUSE_TITLE } from "@/components/cosmic/HouseDetailDialog";
import { AspectDetailDialog } from "@/components/cosmic/AspectDetailDialog";
import { RetrogradeBadge } from "@/components/cosmic/RetrogradeBadge";
import type { NatalPlanet, NatalChartV2 } from "@/lib/cosmic/chart";
import type { Sign } from "@/lib/transits";
import { SIGN_GLYPH, ASPECT_GLYPH } from "@/lib/cosmic/glyphs";

type AspectRow = NatalChartV2["aspects"][number];

export default function CosmicNatal() {
  const { row } = useBirthChart();
  const chart = useNatalChart(row ? { date: row.birth_date, time: row.birth_time, tz: row.birth_tz, lat: row.birth_lat, lng: row.birth_lng, place: row.birth_place, house_system: "whole-sign" } : null);
  const [selected, setSelected] = useState<NatalPlanet | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedSign, setSelectedSign] = useState<Sign | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [houseOpen, setHouseOpen] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState<AspectRow | null>(null);
  const [aspectOpen, setAspectOpen] = useState(false);

  const openPlanet = (p: NatalPlanet) => { setSelected(p); setOpen(true); };
  const openAspect = (a: AspectRow) => { setSelectedAspect(a); setAspectOpen(true); };

  if (!row) {
    return (
      <div className="mx-auto max-w-md p-6 text-center space-y-3">
        <p className="text-muted-foreground">Add your birth info to see your natal chart.</p>
        <Button asChild><Link to="/cosmic-flow/birth-chart">Add Birth Chart</Link></Button>
      </div>
    );
  }
  if (!chart) return null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-3 pb-28 sm:p-6">
      <header className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="h-8 px-2"><Link to="/cosmic-flow"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
        <h1 className="font-display text-xl">Your Natal Chart</h1>
        <div className="w-12" />
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="cozy-card p-4">
          <NatalWheel
            chart={chart}
            onSelectPlanet={openPlanet}
            onSelectSign={(s) => { setSelectedSign(s); setSignOpen(true); }}
            onSelectHouse={(h) => { setSelectedHouse(h); setHouseOpen(true); }}
          />
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Tap a planet, sign, or house to explore.</p>
        </section>

        <section className="space-y-3">
          <div className="cozy-card p-4">
            <p className="text-xs text-muted-foreground">Big three</p>
            <p className="font-display text-base mt-1">
              Sun in {chart.planets.find(p => p.body === "Sun")?.sign} ·
              Moon in {chart.planets.find(p => p.body === "Moon")?.sign}
              {chart.houses ? ` · ${chart.houses.ascendantSign} rising` : ""}
            </p>
            {chart.chartRuler && <p className="text-[12.5px] text-muted-foreground mt-1">Chart ruler: {chart.chartRuler}</p>}
          </div>

          <div className="cozy-card p-4">
            <p className="text-xs text-muted-foreground">Dominants</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge variant="secondary">{chart.dominants.dominantElement} dominant</Badge>
              <Badge variant="secondary">{chart.dominants.dominantModality} dominant</Badge>
              <Badge variant="outline">{chart.dominants.chartShape}</Badge>
            </div>
            <p className="text-[11.5px] text-muted-foreground mt-2">
              Fire {chart.dominants.elements.Fire} · Earth {chart.dominants.elements.Earth} · Air {chart.dominants.elements.Air} · Water {chart.dominants.elements.Water}
            </p>
          </div>

          <div className="cozy-card p-4 max-h-72 overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-2">Planets</p>
            <table className="w-full text-[12.5px]">
              <tbody>
                {chart.planets.map(p => (
                  <tr key={p.body} className="border-b border-border/40 last:border-0">
                    <td className="py-1 w-6">{p.glyph}</td>
                    <td className="py-1 flex items-center gap-1.5">{p.body}{p.retrograde && <RetrogradeBadge />}</td>
                    <td className="py-1 text-right">{Math.floor(p.degreeInSign)}° {p.sign}</td>
                    <td className="py-1 text-right text-muted-foreground">{p.house ? `H${p.house}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {chart.starContacts.length > 0 && (
            <div className="cozy-card p-4">
              <p className="text-xs text-muted-foreground">Fixed-star contacts</p>
              <ul className="mt-1 text-[12.5px] space-y-0.5">
                {chart.starContacts.map((sc, i) => (
                  <li key={i}>{sc.body} ⟶ {sc.star.name} — <span className="text-muted-foreground italic">{sc.star.nature}</span></li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <section className="cozy-card p-4">
        <p className="text-xs text-muted-foreground mb-2">Major aspects ({chart.aspects.length})</p>
        <div className="grid gap-1.5 sm:grid-cols-2 text-[12.5px] max-h-72 overflow-y-auto">
          {chart.aspects.slice(0, 60).map((a, i) => (
            <button
              key={i}
              onClick={() => openAspect(a)}
              className="flex items-center justify-between rounded border border-border/40 px-2 py-1 text-left hover:border-primary/40 hover:bg-card transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <span className="text-sm">{ASPECT_GLYPH[a.aspect.name] ?? ""}</span>
                {a.a} <span className="text-muted-foreground">{a.aspect.name}</span> {a.b}
              </span>
              <span className="text-muted-foreground">{a.aspect.orb.toFixed(1)}°</span>
            </button>
          ))}
        </div>
      </section>

      <section className="cozy-card p-4">
        <p className="font-display text-base mb-2">House Explorer</p>
        <p className="text-xs text-muted-foreground mb-3">The twelve rooms of your life. Tap one to open it.</p>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => {
            const cusp = chart.houses?.cusps[h - 1];
            const SIGN_ORDER: Sign[] = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
            const sign = cusp != null ? SIGN_ORDER[Math.floor(cusp / 30) % 12] : null;
            const planetsHere = chart.planets.filter(p => p.house === h);
            return (
              <button
                key={h}
                onClick={() => { setSelectedHouse(h); setHouseOpen(true); }}
                className="text-left rounded-lg border border-border/40 bg-card/40 p-2.5 hover:bg-card hover:border-primary/40 transition-colors"
              >
                <p className="text-[10px] text-muted-foreground">House {h}</p>
                <p className="text-[12.5px] font-medium leading-tight">{HOUSE_TITLE[h]}</p>
                {sign && <p className="text-[11px] text-muted-foreground mt-0.5">{SIGN_GLYPH[sign]} {sign}</p>}
                {planetsHere.length > 0 && (
                  <p className="text-[12px] mt-1">
                    {planetsHere.map(p => p.glyph).join(" ")}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <PlacementDetailDialog
        chart={chart}
        planet={selected}
        open={open}
        onOpenChange={setOpen}
        onSelectPlanet={(p) => { setOpen(false); setTimeout(() => openPlanet(p), 120); }}
        onSelectAspect={(a) => { setOpen(false); setTimeout(() => openAspect(a), 120); }}
      />
      <SignDetailDialog chart={chart} sign={selectedSign} open={signOpen} onOpenChange={setSignOpen} />
      <HouseDetailDialog
        chart={chart}
        house={selectedHouse}
        open={houseOpen}
        onOpenChange={setHouseOpen}
        onSelectPlanet={(p) => { setHouseOpen(false); setTimeout(() => openPlanet(p), 120); }}
      />
      <AspectDetailDialog
        chart={chart}
        aspect={selectedAspect}
        open={aspectOpen}
        onOpenChange={setAspectOpen}
        onSelectPlanet={(p) => setTimeout(() => openPlanet(p), 120)}
      />
    </div>
  );
}