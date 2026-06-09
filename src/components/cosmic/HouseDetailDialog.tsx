import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { SIGN_GLYPH, PLANET_GLYPH, planetDisplay, SIGN_ELEMENT, ELEMENT_VAR } from "@/lib/cosmic/glyphs";
import type { NatalChartV2, NatalPlanet } from "@/lib/cosmic/chart";
import type { Sign } from "@/lib/transits";

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

const HOUSE_PROMPT: Record<number, string> = {
  1: "How do I want to walk into a room this season?",
  2: "What feels worth investing my energy and resources in?",
  3: "What conversation has been waiting for me?",
  4: "What does my home need to feel like a sanctuary?",
  5: "Where am I allowed to play without making it useful?",
  6: "Which tiny daily ritual would change the most?",
  7: "Who in my life is mirroring something I'm ready to see?",
  8: "What am I being asked to release or transform?",
  9: "What truth or place is calling me?",
  10: "What do I want to be known for — and why?",
  11: "Which community or vision am I being drawn toward?",
  12: "What needs solitude, rest, or quiet to become clear?",
};

const SIGN_ORDER: Sign[] = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

const SIGN_RULER: Record<Sign, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury",
  Libra: "Venus", Scorpio: "Mars / Pluto", Sagittarius: "Jupiter", Capricorn: "Saturn",
  Aquarius: "Saturn / Uranus", Pisces: "Jupiter / Neptune",
};

const SIGN_FLAVOR: Record<Sign, string> = {
  Aries: "directly, with a willingness to start fresh",
  Taurus: "slowly and sensually, building something that lasts",
  Gemini: "with curiosity and many small conversations",
  Cancer: "through care, memory, and feeling",
  Leo: "warmly, expressively, wanting to be witnessed",
  Virgo: "carefully and usefully, refining what's there",
  Libra: "in dialogue and through beauty",
  Scorpio: "intensely and privately — all or nothing",
  Sagittarius: "with optimism and a hunger for meaning",
  Capricorn: "patiently and strategically",
  Aquarius: "in your own original way, with the future in mind",
  Pisces: "softly and intuitively, by feel",
};

interface Props {
  chart: NatalChartV2;
  house: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelectPlanet?: (p: NatalPlanet) => void;
}

export function HouseDetailDialog({ chart, house, open, onOpenChange, onSelectPlanet }: Props) {
  if (!house) return null;
  const cusp = chart.houses?.cusps[house - 1];
  const cuspSignIdx = cusp != null ? Math.floor(cusp / 30) % 12 : null;
  const cuspSign = cuspSignIdx != null ? SIGN_ORDER[cuspSignIdx] : null;
  const planets = chart.planets.filter(p => p.house === house);
  const rulerName = cuspSign ? SIGN_RULER[cuspSign] : null;
  const colorVar = cuspSign ? ELEMENT_VAR[SIGN_ELEMENT[cuspSign]] : "--primary";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <span className="text-xl" style={{ color: `hsl(var(${colorVar}))` }}>{cuspSign ? SIGN_GLYPH[cuspSign] : ""}</span>
            House {house} · {HOUSE_TITLE[house]}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {cuspSign ? <>Cusp in {cuspSign} · ruled by {rulerName}</> : "Whole sign house"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="rounded-lg border border-border/50 bg-card/50 p-3 space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">This room of your life</p>
            <p className="leading-snug">{HOUSE_LONG[house]}</p>
          </div>

          {cuspSign && (
            <div className="rounded-lg border border-border/50 bg-card/50 p-3 space-y-1.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sign on the cusp</p>
              <p className="leading-snug">
                With <span className="font-medium">{cuspSign}</span> on this house, you tend to approach these themes {SIGN_FLAVOR[cuspSign]}.
              </p>
              <p className="text-[11.5px] text-muted-foreground">
                The ruler of this house is <span className="text-foreground">{rulerName}</span> — wherever {rulerName} sits in your chart says a lot about how this house plays out.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-border/50 bg-card/50 p-3 space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Planets in this house</p>
            {planets.length === 0 ? (
              <p className="text-xs text-muted-foreground">No planets here — this house mostly plays out through its ruler ({rulerName ?? "the chart ruler"}).</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {planets.map(p => (
                  <button
                    key={p.body}
                    onClick={() => onSelectPlanet?.(p)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background px-2.5 py-1 text-xs hover:border-primary/50 hover:bg-card transition-colors"
                  >
                    {PLANET_GLYPH[p.body] ?? ""} {planetDisplay(p.body)} in {p.sign} {SIGN_GLYPH[p.sign]}
                  </button>
                ))}
              </div>
            )}
            {planets.length > 0 && (
              <p className="text-[10.5px] text-muted-foreground">Tap a planet for its full reading.</p>
            )}
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide text-primary flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Journal prompt
            </p>
            <p className="leading-snug">{HOUSE_PROMPT[house]}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}