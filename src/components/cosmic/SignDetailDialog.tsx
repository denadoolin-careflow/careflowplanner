import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SIGN_GLYPH, SIGN_ELEMENT, ELEMENT_VAR, planetDisplay, PLANET_GLYPH } from "@/lib/cosmic/glyphs";
import type { Sign } from "@/lib/transits";
import type { NatalChartV2 } from "@/lib/cosmic/chart";

const SIGN_MODALITY: Record<Sign, "Cardinal" | "Fixed" | "Mutable"> = {
  Aries: "Cardinal", Cancer: "Cardinal", Libra: "Cardinal", Capricorn: "Cardinal",
  Taurus: "Fixed", Leo: "Fixed", Scorpio: "Fixed", Aquarius: "Fixed",
  Gemini: "Mutable", Virgo: "Mutable", Sagittarius: "Mutable", Pisces: "Mutable",
};

const SIGN_RULER: Record<Sign, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars / Pluto",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn / Uranus", Pisces: "Jupiter / Neptune",
};

const SIGN_VIBE: Record<Sign, string> = {
  Aries: "Initiating fire — bold, direct, hungry for new beginnings.",
  Taurus: "Grounded earth — steady, sensual, devoted to what lasts.",
  Gemini: "Curious air — playful, communicative, infinitely interested.",
  Cancer: "Tender water — nurturing, intuitive, deeply protective of home.",
  Leo: "Radiant fire — generous, expressive, heart-led leadership.",
  Virgo: "Refining earth — discerning, helpful, devoted to craft.",
  Libra: "Relational air — harmonizing, aesthetic, partnership-minded.",
  Scorpio: "Penetrating water — intense, transformative, all or nothing.",
  Sagittarius: "Expansive fire — adventurous, philosophical, truth-seeking.",
  Capricorn: "Building earth — disciplined, strategic, legacy-minded.",
  Aquarius: "Visionary air — original, communal, future-oriented.",
  Pisces: "Dissolving water — compassionate, mystical, deeply imaginative.",
};

interface Props {
  chart: NatalChartV2;
  sign: Sign | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelectPlanet?: (p: NatalChartV2["planets"][number]) => void;
  onSelectHouse?: (h: number) => void;
}

export function SignDetailDialog({ chart, sign, open, onOpenChange, onSelectPlanet, onSelectHouse }: Props) {
  if (!sign) return null;
  const placements = chart.planets.filter(p => p.sign === sign);
  const element = SIGN_ELEMENT[sign];
  const ORDER = Object.keys(SIGN_RULER) as Sign[];
  const anchor = chart.houses?.ascendantSign ?? chart.planets.find(p => p.body === "Sun")?.sign;
  const house = anchor ? ((ORDER.indexOf(sign) - ORDER.indexOf(anchor as Sign) + 12) % 12) + 1 : null;
  const rulerName = SIGN_RULER[sign].split(" / ")[0];
  const ruler = chart.planets.find(p => p.body === rulerName);
  const colorVar = ELEMENT_VAR[element];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <span className="text-2xl" style={{ color: `hsl(var(${colorVar}))` }}>{SIGN_GLYPH[sign]}</span>
            {sign}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {element} · {SIGN_MODALITY[sign]} · Ruled by {SIGN_RULER[sign]}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">{SIGN_VIBE[sign]}</p>
          <div className="flex flex-wrap gap-1.5">
            {house && <button onClick={() => onSelectHouse?.(house)} className="rounded-full border border-border/50 px-2.5 py-1 text-xs hover:border-primary/50">{sign} is your House {house}{house === 1 ? " (rising)" : ""}</button>}
            {ruler && <button onClick={() => onSelectPlanet?.(ruler)} className="rounded-full border border-border/50 px-2.5 py-1 text-xs hover:border-primary/50">Ruler: {PLANET_GLYPH[ruler.body]} {planetDisplay(ruler.body)} in {ruler.sign}{ruler.house ? ` · H${ruler.house}` : ""}</button>}
          </div>
          <div>
            <p className="text-xs font-medium mb-1">Your placements in {sign}</p>
            {placements.length === 0 ? (
              <p className="text-xs text-muted-foreground">No planets here in your chart.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {placements.map(p => (
                  <Badge key={p.body} variant="secondary" className="cursor-pointer font-normal" onClick={() => onSelectPlanet?.(p)}>
                    {PLANET_GLYPH[p.body] ?? ""} {planetDisplay(p.body)} {Math.floor(p.degreeInSign)}°
                    {p.house ? ` · H${p.house}` : ""}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}