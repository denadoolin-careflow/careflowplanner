import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SIGN_GLYPH, PLANET_GLYPH, planetDisplay } from "@/lib/cosmic/glyphs";
import type { NatalChartV2 } from "@/lib/cosmic/chart";

export const HOUSE_TITLE: Record<number, string> = {
  1: "Self & Vitality", 2: "Resources & Values", 3: "Mind & Communication",
  4: "Home & Roots", 5: "Creativity & Joy", 6: "Health & Routine",
  7: "Partnership & Mirror", 8: "Depth & Transformation", 9: "Belief & Expansion",
  10: "Career & Public Path", 11: "Community & Vision", 12: "Soul & Solitude",
};

export const HOUSE_LONG: Record<number, string> = {
  1: "How you arrive — your body, your first impression, the lens you see life through.",
  2: "What you value, how you earn, the felt sense of security and self-worth.",
  3: "Your everyday mind, siblings, short trips, learning, and how you put words to things.",
  4: "Home, ancestry, emotional foundation — the inner room you return to.",
  5: "Play, romance, creativity, children — what you make for the joy of making.",
  6: "Daily work, health rituals, service, the small loops that keep life running.",
  7: "One-on-one relationships — partners, collaborators, the people who mirror you.",
  8: "Intimacy, shared resources, grief, rebirth — what you face only in the dark.",
  9: "Meaning, travel, higher learning, the philosophy you live by.",
  10: "Career, public role, the legacy you build in the world's eyes.",
  11: "Friendships, networks, future-vision — the tribe you belong to.",
  12: "Solitude, dreams, the unseen — what dissolves so something new can begin.",
};

interface Props {
  chart: NatalChartV2;
  house: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function HouseDetailDialog({ chart, house, open, onOpenChange }: Props) {
  if (!house) return null;
  const cusp = chart.houses?.cusps[house - 1];
  const cuspSignIdx = cusp != null ? Math.floor(cusp / 30) % 12 : null;
  const SIGN_ORDER = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"] as const;
  const cuspSign = cuspSignIdx != null ? SIGN_ORDER[cuspSignIdx] : null;
  const planets = chart.planets.filter(p => p.house === house);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">House {house} · {HOUSE_TITLE[house]}</DialogTitle>
          <DialogDescription className="text-xs">
            {cuspSign ? <>Cusp in {cuspSign} {SIGN_GLYPH[cuspSign]}</> : "Whole sign house"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">{HOUSE_LONG[house]}</p>
          <div>
            <p className="text-xs font-medium mb-1">Planets here</p>
            {planets.length === 0 ? (
              <p className="text-xs text-muted-foreground">No planets — this house plays out through its ruler.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {planets.map(p => (
                  <Badge key={p.body} variant="secondary" className="font-normal">
                    {PLANET_GLYPH[p.body] ?? ""} {planetDisplay(p.body)} in {p.sign} {SIGN_GLYPH[p.sign]}
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