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
}

export function SignDetailDialog({ chart, sign, open, onOpenChange }: Props) {
  if (!sign) return null;
  const placements = chart.planets.filter(p => p.sign === sign);
  const element = SIGN_ELEMENT[sign];
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
          <div>
            <p className="text-xs font-medium mb-1">Your placements in {sign}</p>
            {placements.length === 0 ? (
              <p className="text-xs text-muted-foreground">No planets here in your chart.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {placements.map(p => (
                  <Badge key={p.body} variant="secondary" className="font-normal">
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