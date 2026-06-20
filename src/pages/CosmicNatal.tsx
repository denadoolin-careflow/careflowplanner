import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sun, Moon, Sparkles, Flame, Droplets, Wind, Leaf, ArrowUpRight, Share2, Printer, Crown } from "lucide-react";
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
import { SIGN_GLYPH, ASPECT_GLYPH, SIGN_ELEMENT, ELEMENT_VAR, ASPECT_COLOR_VAR, type Element } from "@/lib/cosmic/glyphs";
import { toast } from "sonner";

type AspectRow = NatalChartV2["aspects"][number];

const SIGN_ORDER: Sign[] = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

const SIGN_TRAITS: Record<Sign, string> = {
  Aries: "Bold • Pioneering • Direct",
  Taurus: "Grounded • Sensual • Steady",
  Gemini: "Curious • Adaptable • Expressive",
  Cancer: "Tender • Intuitive • Protective",
  Leo: "Radiant • Generous • Creative",
  Virgo: "Discerning • Devoted • Precise",
  Libra: "Diplomatic • Harmonizing • Social",
  Scorpio: "Deep • Magnetic • Transformative",
  Sagittarius: "Adventurous • Visionary • Optimistic",
  Capricorn: "Disciplined • Strategic • Enduring",
  Aquarius: "Inventive • Independent • Visionary",
  Pisces: "Dreamy • Empathic • Imaginative",
};

const HOUSE_ICON: Record<number, string> = {
  1: "🏹", 2: "💰", 3: "💬", 4: "🏠", 5: "🎨", 6: "🌿",
  7: "❤️", 8: "🦋", 9: "🧭", 10: "🏛️", 11: "🌐", 12: "🌙",
};

const HOUSE_SHORT: Record<number, string> = {
  1: "Self & Identity", 2: "Resources", 3: "Communication", 4: "Home & Roots",
  5: "Creativity", 6: "Health", 7: "Partnerships", 8: "Transformation",
  9: "Beliefs", 10: "Career", 11: "Community", 12: "Spirituality",
};

const ELEMENT_ICON: Record<Element, typeof Flame> = {
  Fire: Flame, Earth: Leaf, Air: Wind, Water: Droplets,
};

const ASPECT_TONE: Record<string, string> = {
  conjunction: "Fusion — energies merge",
  opposition: "Polarity — seeks balance",
  square: "Friction — drives growth",
  trine: "Flow — natural harmony",
  sextile: "Opportunity — gentle support",
  quincunx: "Adjustment — invites adaptation",
};

// Essential dignities (classic 7 only)
const DIGNITY: Record<string, { domicile: Sign[]; exalt?: Sign; detriment: Sign[]; fall?: Sign }> = {
  Sun:     { domicile: ["Leo"], exalt: "Aries", detriment: ["Aquarius"], fall: "Libra" },
  Moon:    { domicile: ["Cancer"], exalt: "Taurus", detriment: ["Capricorn"], fall: "Scorpio" },
  Mercury: { domicile: ["Gemini","Virgo"], exalt: "Virgo", detriment: ["Sagittarius","Pisces"], fall: "Pisces" },
  Venus:   { domicile: ["Taurus","Libra"], exalt: "Pisces", detriment: ["Aries","Scorpio"], fall: "Virgo" },
  Mars:    { domicile: ["Aries","Scorpio"], exalt: "Capricorn", detriment: ["Taurus","Libra"], fall: "Cancer" },
  Jupiter: { domicile: ["Sagittarius","Pisces"], exalt: "Cancer", detriment: ["Gemini","Virgo"], fall: "Capricorn" },
  Saturn:  { domicile: ["Capricorn","Aquarius"], exalt: "Libra", detriment: ["Cancer","Leo"], fall: "Aries" },
};

function dignityOf(body: string, sign: Sign): "Domicile" | "Exalted" | "Detriment" | "Fall" | null {
  const d = DIGNITY[body];
  if (!d) return null;
  if (d.domicile.includes(sign)) return "Domicile";
  if (d.exalt === sign) return "Exalted";
  if (d.detriment.includes(sign)) return "Detriment";
  if (d.fall === sign) return "Fall";
  return null;
}

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
  const [tab, setTab] = useState<"chart" | "houses" | "planets" | "aspects" | "insights">("chart");

  const openPlanet = (p: NatalPlanet) => { setSelected(p); setOpen(true); };
  const openAspect = (a: AspectRow) => { setSelectedAspect(a); setAspectOpen(true); };

  const sun = chart?.planets.find(p => p.body === "Sun");
  const moon = chart?.planets.find(p => p.body === "Moon");
  const ascSign = chart?.houses?.ascendantSign as Sign | undefined;

  const mostExact = useMemo(() => {
    if (!chart) return null;
    const majors = chart.aspects.filter(a => ["conjunction","opposition","trine","square","sextile"].includes(a.aspect.name));
    return majors.slice().sort((a,b) => a.aspect.orb - b.aspect.orb)[0] ?? null;
  }, [chart]);

  const housePop = useMemo(() => {
    if (!chart) return [] as number[];
    const arr = Array(12).fill(0);
    chart.planets.forEach(p => { if (p.house) arr[p.house - 1]++; });
    return arr;
  }, [chart]);

  if (!row) {
    return (
      <div className="mx-auto max-w-md p-6 text-center space-y-3">
        <p className="text-muted-foreground">Add your birth info to see your natal chart.</p>
        <Button asChild><Link to="/cosmic-flow/birth-chart">Add Birth Chart</Link></Button>
      </div>
    );
  }
  if (!chart) return null;

  const elementsTotal = Object.values(chart.dominants.elements).reduce((a,b)=>a+b,0) || 1;
  const modalitiesTotal = Object.values(chart.dominants.modalities).reduce((a,b)=>a+b,0) || 1;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-3 pb-28 sm:p-6">
      <header className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="h-8 px-2"><Link to="/cosmic-flow"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
        <h1 className="font-display text-xl sm:text-2xl">Your Natal Chart</h1>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => {
            const text = `${ascSign} Rising · Sun in ${sun?.sign} · Moon in ${moon?.sign}`;
            if (navigator.share) navigator.share({ title: "My Natal Chart", text }).catch(()=>{});
            else { navigator.clipboard.writeText(text); toast.success("Copied"); }
          }}><Share2 className="h-3.5 w-3.5" />Share</Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" />Print</Button>
        </div>
      </header>

      {/* Mobile tabs */}
      <div className="md:hidden -mx-3 px-3 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {(["chart","houses","planets","aspects","insights"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full text-[12px] capitalize border ${tab===t ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border/50 text-muted-foreground"}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {/* Chart wheel: 3 cols on desktop */}
        <section className={`cozy-card p-4 sm:p-5 md:col-span-3 ${tab!=="chart" ? "hidden md:block" : ""}`}>
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <p className="font-display text-base">Whole Sign Houses</p>
              <p className="text-[11px] text-muted-foreground">{ascSign ?? "—"} Rising</p>
            </div>
            <p className="text-[11px] text-muted-foreground">Tap a planet, sign, or house</p>
          </div>
          <NatalWheel
            chart={chart}
            onSelectPlanet={openPlanet}
            onSelectSign={(s) => { setSelectedSign(s); setSignOpen(true); }}
            onSelectHouse={(h) => { setSelectedHouse(h); setHouseOpen(true); }}
          />
          {/* Aspect legend */}
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 justify-center text-[10.5px] text-muted-foreground">
            {(["conjunction","sextile","square","trine","opposition","quincunx"] as const).map(k => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: `hsl(var(${ASPECT_COLOR_VAR[k] ?? "--aspect-neutral"}))` }} />
                <span className="capitalize">{k}</span>
              </span>
            ))}
          </div>
        </section>

        {/* Right rail: Big three + dominants */}
        <section className={`space-y-3 md:col-span-2 ${tab!=="chart" ? "hidden md:block" : ""}`}>
          {/* Big Three */}
          <div className="cozy-card p-4">
            <p className="text-xs text-muted-foreground mb-3">Big Three</p>
            <div className="grid grid-cols-3 gap-2">
              <BigThreeTile icon={<Sun className="h-5 w-5" />} label="Sun" sign={sun?.sign} degree={sun?.degreeInSign} tint="--element-fire" onClick={() => sun && openPlanet(sun)} />
              <BigThreeTile icon={<Moon className="h-5 w-5" />} label="Moon" sign={moon?.sign} degree={moon?.degreeInSign} tint="--element-water" onClick={() => moon && openPlanet(moon)} />
              <BigThreeTile icon={<ArrowUpRight className="h-5 w-5" />} label="Ascendant" sign={ascSign} degree={chart.houses ? chart.houses.ascendant % 30 : undefined} tint="--primary" onClick={() => ascSign && (setSelectedSign(ascSign), setSignOpen(true))} />
            </div>
          </div>

          {/* Dominant Elements */}
          <div className="cozy-card p-4">
            <p className="text-xs text-muted-foreground mb-2">Dominant Elements</p>
            <div className="grid grid-cols-4 gap-2">
              {(["Air","Water","Fire","Earth"] as Element[]).map(el => {
                const Icon = ELEMENT_ICON[el];
                const n = chart.dominants.elements[el];
                const pct = Math.round((n / elementsTotal) * 100);
                return (
                  <div key={el} className="rounded-xl border border-border/40 bg-card/60 p-2.5 text-center">
                    <Icon className="h-4 w-4 mx-auto" style={{ color: `hsl(var(${ELEMENT_VAR[el]}))` }} />
                    <p className="text-[12px] mt-1 font-medium">{el}</p>
                    <p className="text-[10.5px] text-muted-foreground">{n} · {pct}%</p>
                    <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `hsl(var(${ELEMENT_VAR[el]}))` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dominant Modalities */}
          <div className="cozy-card p-4">
            <p className="text-xs text-muted-foreground mb-2">Dominant Modalities</p>
            <div className="grid grid-cols-3 gap-2">
              {(["Cardinal","Mutable","Fixed"] as const).map(m => {
                const n = chart.dominants.modalities[m];
                const pct = Math.round((n / modalitiesTotal) * 100);
                return (
                  <div key={m} className="rounded-xl border border-border/40 bg-card/60 p-2.5 text-center">
                    <DonutMini pct={pct} />
                    <p className="text-[12px] mt-1 font-medium">{m}</p>
                    <p className="text-[10.5px] text-muted-foreground">{n} · {pct}%</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cosmic Blueprint summary */}
          {sun && moon && ascSign && (
            <div className="cozy-card p-4 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" />Your Cosmic Blueprint</div>
              <p className="font-display text-sm mt-1.5">
                {ascSign} Rising · Sun in {sun.sign} · Moon in {moon.sign}
              </p>
              <p className="text-[12.5px] text-muted-foreground mt-1.5 leading-relaxed">
                You meet the world with {ascSign} energy ({SIGN_TRAITS[ascSign].toLowerCase()}), shine through {SIGN_TRAITS[sun.sign].split("•")[0].trim().toLowerCase()} {sun.sign} qualities, and feel safest in the {SIGN_TRAITS[moon.sign].split("•")[0].trim().toLowerCase()} rhythm of Moon in {moon.sign}.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Big Three trait cards */}
      <section className={`grid gap-3 sm:grid-cols-3 ${tab!=="chart" && tab!=="insights" ? "hidden md:grid" : ""}`}>
        {ascSign && <TraitCard title={`${ascSign} Rising`} traits={SIGN_TRAITS[ascSign]} blurb="The mask you wear and how you greet the world." glyph={SIGN_GLYPH[ascSign]} sign={ascSign} onClick={() => { setSelectedSign(ascSign); setSignOpen(true); }} />}
        {sun && <TraitCard title={`Sun in ${sun.sign}`} traits={SIGN_TRAITS[sun.sign]} blurb="Your core identity and what makes you shine." glyph={SIGN_GLYPH[sun.sign]} sign={sun.sign} onClick={() => openPlanet(sun)} />}
        {moon && <TraitCard title={`Moon in ${moon.sign}`} traits={SIGN_TRAITS[moon.sign]} blurb="Your inner world and emotional needs." glyph={SIGN_GLYPH[moon.sign]} sign={moon.sign} onClick={() => openPlanet(moon)} />}
      </section>

      {/* Planetary Placements */}
      <section className={`cozy-card p-4 sm:p-5 ${tab!=="planets" ? "hidden md:block" : ""}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-display text-base">Planetary Placements</p>
            <p className="text-[11px] text-muted-foreground">Tap any placement to explore.</p>
          </div>
          <span className="text-[10.5px] text-muted-foreground">House</span>
        </div>
        <div className="grid gap-1.5 md:grid-cols-2">
          {chart.planets.map(p => {
            const dig = dignityOf(p.body, p.sign);
            const elColor = `hsl(var(${ELEMENT_VAR[SIGN_ELEMENT[p.sign]]}))`;
            return (
              <button
                key={p.body}
                onClick={() => openPlanet(p)}
                className="group flex items-center gap-3 rounded-xl border border-border/40 bg-card/60 px-3 py-2 text-left hover:border-primary/40 hover:bg-card transition-colors"
              >
                <span className="text-lg w-6 text-center" style={{ color: elColor }}>{p.glyph}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-tight flex items-center gap-1.5">
                    {p.body}
                    {p.retrograde && <RetrogradeBadge />}
                    {dig && <DignityBadge kind={dig} />}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground">
                    <span style={{ color: elColor }}>{SIGN_GLYPH[p.sign]} {p.sign}</span> · {Math.floor(p.degreeInSign)}°{String(Math.floor((p.degreeInSign % 1) * 60)).padStart(2,"0")}'
                  </p>
                </div>
                {p.house && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10.5px] text-muted-foreground">H{p.house}</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Balance donuts */}
      <section className={`grid gap-3 md:grid-cols-2 ${tab!=="insights" ? "hidden md:grid" : ""}`}>
        <div className="cozy-card p-4">
          <p className="font-display text-sm mb-3">Element Balance</p>
          <div className="flex items-center gap-4">
            <ElementDonut data={chart.dominants.elements} />
            <ul className="text-[12px] space-y-1 flex-1">
              {(["Fire","Earth","Air","Water"] as Element[]).map(el => {
                const pct = Math.round((chart.dominants.elements[el] / elementsTotal) * 100);
                return (
                  <li key={el} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: `hsl(var(${ELEMENT_VAR[el]}))` }} />
                      {el}
                    </span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <div className="cozy-card p-4">
          <p className="font-display text-sm mb-3">Modality Balance</p>
          <div className="flex items-center gap-4">
            <ModalityDonut data={chart.dominants.modalities} />
            <ul className="text-[12px] space-y-1 flex-1">
              {(["Cardinal","Fixed","Mutable"] as const).map((m, i) => {
                const pct = Math.round((chart.dominants.modalities[m] / modalitiesTotal) * 100);
                const colors = ["--aspect-dynamic","--aspect-neutral","--aspect-harmonious"];
                return (
                  <li key={m} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: `hsl(var(${colors[i]}))` }} />
                      {m}
                    </span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* House Explorer */}
      <section className={`cozy-card p-4 sm:p-5 ${tab!=="houses" ? "hidden md:block" : ""}`}>
        <div className="mb-3">
          <p className="font-display text-base">Your 12 Houses</p>
          <p className="text-[11px] text-muted-foreground">Whole-sign houses, anchored to your {ascSign ?? "—"} Ascendant. Tap to open.</p>
        </div>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => {
            const cusp = chart.houses?.cusps[h - 1];
            const sign = cusp != null ? SIGN_ORDER[Math.floor(cusp / 30) % 12] : null;
            const planetsHere = chart.planets.filter(p => p.house === h);
            const elColor = sign ? `hsl(var(${ELEMENT_VAR[SIGN_ELEMENT[sign]]}))` : undefined;
            const isAngle = h === 1 || h === 4 || h === 7 || h === 10;
            return (
              <button
                key={h}
                onClick={() => { setSelectedHouse(h); setHouseOpen(true); }}
                className={`text-left rounded-2xl border bg-card/60 p-3 hover:bg-card hover:border-primary/40 transition-colors ${isAngle ? "border-primary/30" : "border-border/40"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] text-muted-foreground">House {h}</span>
                  {isAngle && <span className="text-[9px] uppercase tracking-wide text-primary">{h===1?"ASC":h===4?"IC":h===7?"DSC":"MC"}</span>}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-base">{HOUSE_ICON[h]}</span>
                  {sign && <span className="text-base" style={{ color: elColor }}>{SIGN_GLYPH[sign]}</span>}
                </div>
                {sign && <p className="text-[12px] font-medium leading-tight mt-1" style={{ color: elColor }}>{sign}</p>}
                <p className="text-[10.5px] text-muted-foreground leading-tight mt-0.5">{HOUSE_SHORT[h]}</p>
                {planetsHere.length > 0 && (
                  <p className="text-[13px] mt-1.5">{planetsHere.map(p => p.glyph).join(" ")}</p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Aspect matrix */}
      <section className={`cozy-card p-4 sm:p-5 ${tab!=="aspects" ? "hidden md:block" : ""}`}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-base">Aspects</p>
          <span className="text-[11px] text-muted-foreground">{chart.aspects.length} total</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {chart.aspects.slice(0, 36).map((a, i) => {
            const colorVar = ASPECT_COLOR_VAR[a.aspect.name] ?? "--aspect-neutral";
            const color = `hsl(var(${colorVar}))`;
            return (
              <button
                key={i}
                onClick={() => openAspect(a)}
                className="text-left rounded-xl border bg-card/60 p-2.5 hover:bg-card transition-colors"
                style={{ borderColor: `hsl(var(${colorVar}) / 0.5)` }}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
                    <span className="text-base" style={{ color }}>{ASPECT_GLYPH[a.aspect.name] ?? ""}</span>
                    {a.a} <span className="text-muted-foreground capitalize">{a.aspect.name}</span> {a.b}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground">{a.aspect.orb.toFixed(1)}°</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{ASPECT_TONE[a.aspect.name]}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Astrology Intelligence Hub */}
      <section className={`grid gap-3 md:grid-cols-2 lg:grid-cols-3 ${tab!=="insights" ? "hidden md:grid" : ""}`}>
        <InsightCard label="Chart Ruler" value={chart.chartRuler || "—"} hint={ascSign ? `Ruling planet of ${ascSign}` : ""} icon={<Crown className="h-4 w-4 text-primary" />} />
        <InsightCard label="Dominant Element" value={chart.dominants.dominantElement} hint={`${chart.dominants.elements[chart.dominants.dominantElement]} placements`} icon={(() => { const I = ELEMENT_ICON[chart.dominants.dominantElement]; return <I className="h-4 w-4" style={{ color: `hsl(var(${ELEMENT_VAR[chart.dominants.dominantElement]}))` }} />; })()} />
        <InsightCard label="Dominant Modality" value={chart.dominants.dominantModality} hint="Your operating rhythm" icon={<Sparkles className="h-4 w-4 text-primary" />} />
        <InsightCard
          label="Most Populated House"
          value={(() => { const max = Math.max(...housePop); const h = housePop.indexOf(max) + 1; return `House ${h}`; })()}
          hint={(() => { const max = Math.max(...housePop); const h = housePop.indexOf(max) + 1; return HOUSE_TITLE[h]; })()}
          icon={<span className="text-base">{HOUSE_ICON[housePop.indexOf(Math.max(...housePop)) + 1]}</span>}
        />
        {mostExact && (
          <InsightCard
            label="Tightest Aspect"
            value={`${mostExact.a} ${mostExact.aspect.name} ${mostExact.b}`}
            hint={`${mostExact.aspect.orb.toFixed(2)}° orb · ${ASPECT_TONE[mostExact.aspect.name] ?? ""}`}
            icon={<span style={{ color: `hsl(var(${ASPECT_COLOR_VAR[mostExact.aspect.name] ?? "--aspect-neutral"}))` }} className="text-base">{ASPECT_GLYPH[mostExact.aspect.name]}</span>}
            onClick={() => openAspect(mostExact)}
          />
        )}
        <InsightCard label="Chart Shape" value={chart.dominants.chartShape} hint="Overall planetary distribution" icon={<Sparkles className="h-4 w-4 text-primary" />} />
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

function BigThreeTile({ icon, label, sign, degree, tint, onClick }: { icon: React.ReactNode; label: string; sign?: Sign; degree?: number; tint: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl border border-border/40 bg-card/60 p-3 text-center hover:border-primary/40 hover:bg-card transition-colors">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full" style={{ background: `hsl(var(${tint}) / 0.14)`, color: `hsl(var(${tint}))` }}>{icon}</span>
      <p className="text-[10.5px] text-muted-foreground mt-1.5">{label}</p>
      <p className="text-[12.5px] font-medium leading-tight mt-0.5">{sign ?? "—"}</p>
      {degree != null && <p className="text-[10.5px] text-muted-foreground">{Math.floor(degree)}°</p>}
    </button>
  );
}

function TraitCard({ title, traits, blurb, glyph, sign, onClick }: { title: string; traits: string; blurb: string; glyph: string; sign: Sign; onClick?: () => void }) {
  const color = `hsl(var(${ELEMENT_VAR[SIGN_ELEMENT[sign]]}))`;
  return (
    <button onClick={onClick} className="text-left cozy-card p-4 hover:border-primary/40 transition-colors">
      <div className="flex items-start gap-2.5">
        <span className="text-2xl leading-none mt-0.5" style={{ color }}>{glyph}</span>
        <div className="min-w-0">
          <p className="font-display text-sm">{title}</p>
          <p className="text-[11.5px] mt-0.5" style={{ color }}>{traits}</p>
          <p className="text-[12px] text-muted-foreground mt-1.5 leading-snug">{blurb}</p>
        </div>
      </div>
    </button>
  );
}

function DignityBadge({ kind }: { kind: "Domicile" | "Exalted" | "Detriment" | "Fall" }) {
  const map: Record<typeof kind, { bg: string; fg: string; label: string }> = {
    Domicile:  { bg: "hsl(var(--aspect-harmonious) / 0.15)", fg: "hsl(var(--aspect-harmonious))", label: "Domicile" },
    Exalted:   { bg: "hsl(var(--primary) / 0.14)", fg: "hsl(var(--primary))", label: "Exalted" },
    Detriment: { bg: "hsl(var(--aspect-dynamic) / 0.14)", fg: "hsl(var(--aspect-dynamic))", label: "Detriment" },
    Fall:      { bg: "hsl(var(--muted-foreground) / 0.14)", fg: "hsl(var(--muted-foreground))", label: "Fall" },
  } as const;
  const s = map[kind];
  return (
    <span className="rounded-full px-1.5 text-[9.5px] font-medium leading-[14px]" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
  );
}

function DonutMini({ pct }: { pct: number }) {
  const r = 16, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10 mx-auto -rotate-90">
      <circle cx="20" cy="20" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
      <circle cx="20" cy="20" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeDasharray={`${(pct/100)*c} ${c}`} strokeLinecap="round" />
    </svg>
  );
}

function ElementDonut({ data }: { data: Record<Element, number> }) {
  const order: Element[] = ["Fire","Earth","Air","Water"];
  const total = order.reduce((s,k) => s + data[k], 0) || 1;
  const r = 28, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
      <circle cx="40" cy="40" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
      {order.map(el => {
        const len = (data[el] / total) * c;
        const dash = `${len} ${c - len}`;
        const node = (
          <circle key={el} cx="40" cy="40" r={r} fill="none" stroke={`hsl(var(${ELEMENT_VAR[el]}))`} strokeWidth="10" strokeDasharray={dash} strokeDashoffset={-offset} />
        );
        offset += len;
        return node;
      })}
    </svg>
  );
}

function ModalityDonut({ data }: { data: Record<"Cardinal"|"Fixed"|"Mutable", number> }) {
  const order = ["Cardinal","Fixed","Mutable"] as const;
  const colors = ["--aspect-dynamic","--aspect-neutral","--aspect-harmonious"];
  const total = order.reduce((s,k) => s + data[k], 0) || 1;
  const r = 28, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
      <circle cx="40" cy="40" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
      {order.map((m, i) => {
        const len = (data[m] / total) * c;
        const dash = `${len} ${c - len}`;
        const node = (
          <circle key={m} cx="40" cy="40" r={r} fill="none" stroke={`hsl(var(${colors[i]}))`} strokeWidth="10" strokeDasharray={dash} strokeDashoffset={-offset} />
        );
        offset += len;
        return node;
      })}
    </svg>
  );
}

function InsightCard({ label, value, hint, icon, onClick }: { label: string; value: string; hint?: string; icon?: React.ReactNode; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className="cozy-card p-4 text-left hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
      <p className="font-display text-base mt-1.5">{value}</p>
      {hint && <p className="text-[11.5px] text-muted-foreground mt-1 leading-snug">{hint}</p>}
    </Tag>
  );
}

