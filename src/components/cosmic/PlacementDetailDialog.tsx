import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, Sparkles } from "lucide-react";
import { RetrogradeBadge } from "./RetrogradeBadge";
import { SIGN_GLYPH, PLANET_GLYPH, ASPECT_GLYPH, formatDms, planetDisplay, SIGN_ELEMENT, ELEMENT_VAR } from "@/lib/cosmic/glyphs";
import type { NatalChartV2, NatalPlanet } from "@/lib/cosmic/chart";
import type { Sign } from "@/lib/transits";

type AspectRow = NatalChartV2["aspects"][number];

interface Props {
  chart: NatalChartV2;
  planet: NatalPlanet | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelectPlanet?: (p: NatalPlanet) => void;
  onSelectAspect?: (a: AspectRow) => void;
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

const PLANET_CORE_GIFT: Record<string, string> = {
  Sun: "Your essential vitality — the light you're here to shine.",
  Moon: "Your inner emotional weather and how you soothe yourself.",
  Mercury: "How you think, learn, and translate the world into words.",
  Venus: "What you love, how you relate, and what you find beautiful.",
  Mars: "Your fuel, courage, and the way you go after what you want.",
  Jupiter: "Where life feels generous and where you naturally expand.",
  Saturn: "The place you mature slowly and build something lasting.",
  Uranus: "Where you break the mold and surprise yourself.",
  Neptune: "Your imagination, dreams, and longing for the sacred.",
  Pluto: "Your power to transform from the inside out.",
  Chiron: "A tender wound that becomes a quiet medicine for others.",
  NorthNode: "A direction your soul is being drawn to grow toward.",
  SouthNode: "Comfortable gifts from the past — easy to lean on, easy to outgrow.",
};

const PLANET_GROWTH_EDGE: Record<string, string> = {
  Sun: "Letting yourself be seen, even when it feels exposing.",
  Moon: "Tending feelings without numbing or rushing past them.",
  Mercury: "Listening as deeply as you speak.",
  Venus: "Choosing what you truly value over what looks lovely.",
  Mars: "Acting with clarity instead of reactivity.",
  Jupiter: "Knowing when generosity becomes overextension.",
  Saturn: "Trusting structure without armoring against softness.",
  Uranus: "Channeling change without burning what still matters.",
  Neptune: "Discernment — staying open without losing yourself.",
  Pluto: "Releasing control as a way of holding real power.",
  Chiron: "Treating yourself with the care you so easily give others.",
  NorthNode: "Stepping into the unfamiliar even when it's uncomfortable.",
  SouthNode: "Letting go of an old identity that worked once.",
};

const SIGN_FLAVOR: Record<Sign, string> = {
  Aries: "with directness and a love of starting fresh",
  Taurus: "slowly, sensually, in a way that wants to last",
  Gemini: "through curiosity, words, and many small conversations",
  Cancer: "through care, memory, and feeling your way",
  Leo: "warmly, expressively, with a need to be witnessed",
  Virgo: "carefully, usefully, with an eye for what could be better",
  Libra: "in dialogue with others, through beauty and balance",
  Scorpio: "intensely, privately, all-in or not at all",
  Sagittarius: "with optimism, scope, and a hunger for meaning",
  Capricorn: "patiently, strategically, building something real",
  Aquarius: "in your own original way, with the bigger picture in mind",
  Pisces: "softly, dreamily, by feel more than by plan",
};

function journalPrompts(planet: NatalPlanet): string[] {
  const name = planetDisplay(planet.body);
  const sign = planet.sign;
  const house = planet.house;
  const prompts = [
    `Where in my life does my ${name} in ${sign} feel most alive lately?`,
    `What does my ${name} need from me this season — more room, more rest, or more practice?`,
  ];
  if (house) {
    prompts.push(`How is the theme of House ${house} (${HOUSE_TOPICS[house]}) asking my ${name} to grow?`);
  } else {
    prompts.push(`If my ${name} in ${sign} wrote me a short note today, what would it say?`);
  }
  if (planet.retrograde) {
    prompts.push(`What is my retrograde ${name} inviting me to revisit, repair, or re-route?`);
  }
  return prompts;
}

export function PlacementDetailDialog({ chart, planet, open, onOpenChange, onSelectPlanet, onSelectAspect }: Props) {
  if (!planet) return null;
  const aspects = chart.aspects
    .filter(a => a.a === planet.body || a.b === planet.body)
    .sort((a, b) => a.aspect.orb - b.aspect.orb)
    .slice(0, 8);
  const element = SIGN_ELEMENT[planet.sign];
  const colorVar = ELEMENT_VAR[element];
  const name = planetDisplay(planet.body);
  const gift = PLANET_CORE_GIFT[planet.body] ?? "A part of your inner sky worth getting to know.";
  const edge = PLANET_GROWTH_EDGE[planet.body] ?? "A place to grow with patience.";
  const flavor = SIGN_FLAVOR[planet.sign];
  const inYourLife = `Your ${name} expresses ${flavor}${planet.house ? `, especially around ${HOUSE_TOPICS[planet.house].toLowerCase()} (House ${planet.house})` : ""}.`;
  const prompts = journalPrompts(planet);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <span className="text-2xl" style={{ color: `hsl(var(${colorVar}))` }}>{PLANET_GLYPH[planet.body] ?? ""}</span>
            {name} in {planet.sign}
            <span className="text-xl" style={{ color: `hsl(var(${colorVar}))` }}>{SIGN_GLYPH[planet.sign]}</span>
            {planet.retrograde && <RetrogradeBadge />}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {formatDms(planet.degreeInSign)} {planet.sign}
            {planet.house ? ` · House ${planet.house}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{element}</Badge>
            {planet.house && <Badge variant="outline">House {planet.house}</Badge>}
            {planet.retrograde && <Badge variant="outline" className="text-destructive border-destructive/40">Retrograde</Badge>}
          </div>

          <div className="rounded-lg border border-border/50 bg-card/50 p-3 space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Core gift</p>
            <p className="leading-snug">{gift}</p>
          </div>

          <div className="rounded-lg border border-border/50 bg-card/50 p-3 space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Growth edge</p>
            <p className="leading-snug">{edge}</p>
          </div>

          <div className="rounded-lg border border-border/50 bg-card/50 p-3 space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">In your life</p>
            <p className="leading-snug">{inYourLife}</p>
          </div>

          {aspects.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">Key aspects</p>
              <p className="text-[10.5px] text-muted-foreground mb-1.5">Tap an aspect for details, or jump to the other planet.</p>
              <ul className="space-y-1 text-xs">
                {aspects.map((a, i) => {
                  const other = a.a === planet.body ? a.b : a.a;
                  const otherPlanet = chart.planets.find(p => p.body === other);
                  return (
                    <li key={i} className="flex items-stretch rounded border border-border/40 overflow-hidden">
                      <button
                        onClick={() => onSelectAspect?.(a)}
                        className="flex-1 flex items-center justify-between px-2 py-1 hover:bg-muted/50 text-left transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="text-base leading-none">{ASPECT_GLYPH[a.aspect.name] ?? ""}</span>
                          <span className="capitalize">{a.aspect.name}</span>
                          <span className="text-muted-foreground">{PLANET_GLYPH[other] ?? ""} {planetDisplay(other)}</span>
                        </span>
                        <span className="text-muted-foreground">{a.aspect.orb.toFixed(1)}°</span>
                      </button>
                      {otherPlanet && (
                        <button
                          onClick={() => onSelectPlanet?.(otherPlanet)}
                          className="px-2 border-l border-border/40 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                          title={`Open ${planetDisplay(other)}`}
                          aria-label={`Open ${planetDisplay(other)}`}
                        >
                          →
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-primary flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Journal prompts
            </p>
            <ul className="space-y-1.5 leading-snug">
              {prompts.map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary/70">·</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="sm" variant="outline" className="w-full mt-1">
              <Link to="/journal-flow" onClick={() => onOpenChange(false)}>
                <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Open journal
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}