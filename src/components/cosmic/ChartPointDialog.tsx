import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { SIGN_GLYPH, PLANET_GLYPH, planetDisplay } from "@/lib/cosmic/glyphs";
import type { NatalChartV2, NatalPlanet } from "@/lib/cosmic/chart";
import type { Sign } from "@/lib/transits";
import type { TransitPoint } from "./NatalWheel";
import { describeTransit, describeSkyPlacement, aspectTone, SIGN_MOOD } from "@/lib/cosmic/plain-language";

const SIGNS: Sign[] = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const ASPECTS = [
  { name: "conjunction", angle: 0, orb: 6 }, { name: "sextile", angle: 60, orb: 4 },
  { name: "square", angle: 90, orb: 5 }, { name: "trine", angle: 120, orb: 5 }, { name: "opposition", angle: 180, orb: 6 },
];
const norm = (l: number) => ((l % 360) + 360) % 360;
const signOf = (l: number) => SIGNS[Math.floor(norm(l) / 30)];

function aspectsTo(lon: number, targets: { body: string; longitude: number }[]) {
  const out: { body: string; aspect: string; orb: number }[] = [];
  targets.forEach(t => {
    const sep = Math.abs(((norm(lon - t.longitude) + 180) % 360) - 180);
    ASPECTS.forEach(a => { const o = Math.abs(sep - a.angle); if (o <= a.orb) out.push({ body: t.body, aspect: a.name, orb: o }); });
  });
  return out.sort((a, b) => a.orb - b.orb);
}

export type ChartPoint = { kind: "angle"; angle: "As" | "Mc" } | { kind: "transit"; point: TransitPoint };

interface Props {
  chart: NatalChartV2;
  point: ChartPoint | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transits?: TransitPoint[];
  approximateTime?: boolean;
  onSelectPlanet?: (p: NatalPlanet) => void;
  onSelectSign?: (s: Sign) => void;
  onSelectHouse?: (h: number) => void;
}

export function ChartPointDialog({ chart, point, open, onOpenChange, transits = [], approximateTime, onSelectPlanet, onSelectSign, onSelectHouse }: Props) {
  if (!point) return null;
  const h = chart.houses;
  const ascIdx = h ? Math.floor(norm(h.ascendant) / 30) : Math.floor(norm(chart.planets.find(p => p.body === "Sun")?.longitude ?? 0) / 30);
  const houseOfLon = (l: number) => ((Math.floor(norm(l) / 30) - ascIdx + 12) % 12) + 1;
  const Chip = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick} className="rounded-full border border-border/50 bg-card px-2.5 py-1 text-xs hover:border-primary/50 hover:bg-muted/50">{children}</button>
  );

  if (point.kind === "angle") {
    const isAsc = point.angle === "As";
    if (!h) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-display">Rising sign</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Your rising sign needs a birth time and place. <Link to="/cosmic-flow/birth-chart" className="text-primary hover:underline" onClick={() => onOpenChange(false)}>Add your birth time</Link> to see it.</p>
          </DialogContent>
        </Dialog>
      );
    }
    const lon = isAsc ? h.ascendant : h.midheaven;
    const sign = signOf(lon);
    const house = isAsc ? 1 : houseOfLon(lon);
    const ruler = chart.planets.find(p => p.body === chart.chartRuler);
    const inHouse = chart.planets.filter(p => p.house === house);
    const touching = aspectsTo(lon, transits.map(t => ({ body: t.body, longitude: t.longitude })));
    const natalTouch = aspectsTo(lon, chart.planets.map(p => ({ body: p.body as string, longitude: p.longitude })));
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">{isAsc ? "Rising" : "Midheaven"} in {sign} <span className="text-xl">{SIGN_GLYPH[sign]}</span></DialogTitle>
            <DialogDescription className="text-xs">{Math.floor(lon % 30)}° {sign} · {isAsc ? "Ascendant · start of House 1" : `Midheaven · in House ${house}`}{approximateTime ? " · approximate birth time" : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="leading-snug">{isAsc
              ? `Your rising sign is how you show up and how others first meet you. With ${sign} rising, you come across as ${SIGN_MOOD[sign]}.`
              : `Your Midheaven points to your public path and work. In ${sign}, it grows best when it's ${SIGN_MOOD[sign]}.`}</p>
            {approximateTime && <p className="rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">Your birth time is approximate, so the rising sign may shift if the time changes.</p>}
            <div className="flex flex-wrap gap-1.5">
              <Chip onClick={() => onSelectSign?.(sign)}>{SIGN_GLYPH[sign]} About {sign}</Chip>
              <Chip onClick={() => onSelectHouse?.(house)}>House {house}</Chip>
              {isAsc && ruler && <Chip onClick={() => onSelectPlanet?.(ruler)}>Chart ruler: {PLANET_GLYPH[ruler.body]} {planetDisplay(ruler.body)} in {ruler.sign}{ruler.house ? ` · H${ruler.house}` : ""}</Chip>}
            </div>
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Planets in House {house}</p>
              {inHouse.length ? <div className="flex flex-wrap gap-1.5">{inHouse.map(p => <Chip key={p.body} onClick={() => onSelectPlanet?.(p)}>{PLANET_GLYPH[p.body]} {planetDisplay(p.body)}</Chip>)}</div> : <p className="text-xs text-muted-foreground">None — this house is quiet in your chart.</p>}
            </div>
            {natalTouch.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Natal planets touching it</p>
                <ul className="space-y-1 text-xs">{natalTouch.slice(0, 5).map((a, i) => <li key={i}>{planetDisplay(a.body)} · <span className="capitalize">{a.aspect}</span> ({aspectTone(a.aspect)}, {a.orb.toFixed(1)}°)</li>)}</ul>
              </div>
            )}
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Transits touching it now</p>
              {touching.length ? <ul className="space-y-1.5 text-xs">{touching.slice(0, 5).map((a, i) => { const d = describeTransit(a.body, a.aspect, isAsc ? "Ascendant" : "Midheaven"); return <li key={i}><span className="font-medium">{d.title}</span> <span className="text-muted-foreground">· {d.tone} · {a.orb.toFixed(1)}°</span><br />{d.meaning}</li>; })}</ul> : <p className="text-xs text-muted-foreground">No major transits right now.</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const t = point.point;
  const sign = signOf(t.longitude);
  const house = houseOfLon(t.longitude);
  const hits = aspectsTo(t.longitude, chart.planets.map(p => ({ body: p.body as string, longitude: p.longitude })));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">{t.glyph} {planetDisplay(t.body)} today in {sign}</DialogTitle>
          <DialogDescription className="text-xs">Transit · {Math.floor(t.longitude % 30)}° {sign} · passing through your House {house}{t.retrograde ? " · retrograde" : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="leading-snug">{describeSkyPlacement(t.body, sign, t.retrograde)}</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip onClick={() => onSelectSign?.(sign)}>{SIGN_GLYPH[sign]} About {sign}</Chip>
            <Chip onClick={() => onSelectHouse?.(house)}>Your House {house}</Chip>
          </div>
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Touching your chart</p>
            {hits.length ? (
              <ul className="space-y-2 text-xs">{hits.slice(0, 6).map((a, i) => {
                const d = describeTransit(t.body, a.aspect, a.body);
                const natal = chart.planets.find(p => p.body === a.body);
                return (
                  <li key={i} className="rounded-lg border border-border/40 p-2">
                    <button className="text-left" onClick={() => natal && onSelectPlanet?.(natal)}>
                      <span className="font-medium">{d.title}</span> <Badge variant="outline" className="ml-1 text-[10px]">{d.tone}</Badge>
                      <span className="block text-muted-foreground">{d.meaning} ({a.orb.toFixed(1)}° from exact)</span>
                    </button>
                  </li>
                );
              })}</ul>
            ) : <p className="text-xs text-muted-foreground">Not touching any of your planets closely right now.</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
