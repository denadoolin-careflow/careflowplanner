import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RetrogradeBadge } from "./RetrogradeBadge";
import { SIGN_GLYPH, PLANET_GLYPH, ASPECT_GLYPH, formatDms, planetDisplay, SIGN_ELEMENT } from "@/lib/cosmic/glyphs";
import type { NatalChartV2, NatalPlanet } from "@/lib/cosmic/chart";

interface Props {
  chart: NatalChartV2;
  planet: NatalPlanet | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const HOUSE_TOPICS: Record<number, string> = {
  1: "Identity, body, beginnings",
  2: "Resources, values, money",
  3: "Mind, siblings, daily errands",
  4: "Home, roots, family",
  5: "Creativity, romance, play",
  6: "Health, work, routines",
  7: "Partnerships, others",
  8: "Intimacy, transformation, shared resources",
  9: "Beliefs, travel, higher learning",
  10: "Career, public role, legacy",
  11: "Community, hopes, friends",
  12: "Solitude, dreams, the hidden",
};

export function PlacementDetailDialog({ chart, planet, open, onOpenChange }: Props) {
  if (!planet) return null;
  const aspects = chart.aspects.filter(a => a.a === planet.body || a.b === planet.body).slice(0, 8);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <span className="text-2xl">{PLANET_GLYPH[planet.body] ?? ""}</span>
            {planetDisplay(planet.body)} in {planet.sign}
            <span className="text-xl">{SIGN_GLYPH[planet.sign]}</span>
            {planet.retrograde && <RetrogradeBadge />}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {formatDms(planet.degreeInSign)} {planet.sign}
            {planet.house ? ` · House ${planet.house}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{SIGN_ELEMENT[planet.sign]}</Badge>
            {planet.house && <Badge variant="outline">House {planet.house}</Badge>}
          </div>
          {planet.house && (
            <p className="text-muted-foreground">{HOUSE_TOPICS[planet.house]}</p>
          )}
          {aspects.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1">Aspects</p>
              <ul className="space-y-1 text-xs">
                {aspects.map((a, i) => {
                  const other = a.a === planet.body ? a.b : a.a;
                  return (
                    <li key={i} className="flex items-center justify-between rounded border border-border/40 px-2 py-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-base leading-none">{ASPECT_GLYPH[a.aspect.name] ?? ""}</span>
                        <span className="capitalize">{a.aspect.name}</span>
                        <span>{PLANET_GLYPH[other] ?? ""} {planetDisplay(other)}</span>
                      </span>
                      <span className="text-muted-foreground">{a.aspect.orb.toFixed(1)}°</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}