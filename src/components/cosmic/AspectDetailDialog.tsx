import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { PLANET_GLYPH, ASPECT_GLYPH, ASPECT_COLOR_VAR, planetDisplay } from "@/lib/cosmic/glyphs";
import type { NatalChartV2, NatalPlanet } from "@/lib/cosmic/chart";

type AspectRow = NatalChartV2["aspects"][number];

interface Props {
  chart: NatalChartV2;
  aspect: AspectRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelectPlanet?: (p: NatalPlanet) => void;
}

const ASPECT_MEANING: Record<string, { title: string; vibe: string; gift: string; growth: string; angle: string }> = {
  conjunction: {
    title: "Conjunction",
    angle: "0°",
    vibe: "Two energies fused at the same point — they think, move, and want as one.",
    gift: "Concentrated power; whatever these planets touch, they touch together with force.",
    growth: "Untangling which voice is which, so neither one gets drowned out.",
  },
  opposition: {
    title: "Opposition",
    angle: "180°",
    vibe: "Two energies pulling on opposite ends of a rope — often projected onto other people.",
    gift: "Awareness through relationship; the world keeps showing you the other side.",
    growth: "Holding both truths instead of swinging between them.",
  },
  trine: {
    title: "Trine",
    angle: "120°",
    vibe: "An easy, flowing channel between two planets in the same element.",
    gift: "A natural talent that arrives without much effort — almost too easy to notice.",
    growth: "Using the gift on purpose, not just when it's convenient.",
  },
  square: {
    title: "Square",
    angle: "90°",
    vibe: "Productive friction — two planets that pinch each other until you take action.",
    gift: "The grit that turns potential into a built thing.",
    growth: "Letting the tension teach you instead of trying to make it disappear.",
  },
  sextile: {
    title: "Sextile",
    angle: "60°",
    vibe: "A door that opens when you walk toward it — opportunity with a little effort.",
    gift: "Curious, friendly cooperation between two parts of yourself.",
    growth: "Saying yes to the small invitations; they compound.",
  },
  quincunx: {
    title: "Quincunx",
    angle: "150°",
    vibe: "Two energies that don't quite speak the same language — constant small adjustments.",
    gift: "Flexibility, and a knack for translating between worlds.",
    growth: "Accepting that some integrations are ongoing rather than solved.",
  },
  semisextile: { title: "Semisextile", angle: "30°", vibe: "A quiet nudge between neighboring signs.", gift: "Subtle resourcefulness.", growth: "Noticing the whisper before it becomes a shout." },
  semisquare: { title: "Semisquare", angle: "45°", vibe: "Low-grade irritation that asks for a small course-correction.", gift: "An honest signal that something is slightly off.", growth: "Adjusting early instead of ignoring the friction." },
  sesquiquadrate: { title: "Sesquiquadrate", angle: "135°", vibe: "An off-beat tension that wants release through expression.", gift: "Creative restlessness.", growth: "Channeling the energy into work rather than worry." },
  quintile: { title: "Quintile", angle: "72°", vibe: "A creative spark with a touch of magic.", gift: "An original way of combining these planets.", growth: "Trusting the unusual answer." },
  biquintile: { title: "Biquintile", angle: "144°", vibe: "Subtle creative resonance.", gift: "Quiet artistry.", growth: "Giving the gift somewhere it can be seen." },
};

function pairFlavor(a: string, b: string, aspect: string): string {
  const pair = [a, b].sort().join("-");
  const flavors: Record<string, string> = {
    "Mars-Sun": "vitality and drive working together — you act from your core.",
    "Mars-Venus": "love and desire — relating and wanting blend or compete.",
    "Mars-Moon": "feelings and action — your moods move you quickly.",
    "Mars-Mercury": "thinking and doing — words can sharpen or cut.",
    "Mars-Saturn": "drive and discipline — pacing yourself is the art.",
    "Moon-Sun": "inner self and outer self — heart and identity in conversation.",
    "Moon-Venus": "feelings and values — what you love comforts you.",
    "Moon-Mercury": "feelings and words — articulating what you feel.",
    "Moon-Saturn": "feelings and structure — learning to mother yourself.",
    "Mercury-Venus": "mind and heart — beautiful, diplomatic communication.",
    "Mercury-Saturn": "thinking and discipline — careful, considered words.",
    "Mercury-Jupiter": "thinking and meaning — big-picture conversations.",
    "Sun-Venus": "identity and love — being seen through what you cherish.",
    "Sun-Jupiter": "identity and expansion — generosity that grows you.",
    "Sun-Saturn": "identity and structure — earning who you are.",
    "Jupiter-Saturn": "expansion and structure — growth that lasts.",
    "Saturn-Venus": "love and commitment — slow, real bonds.",
  };
  void aspect;
  return flavors[pair] ?? `the conversation between ${a} and ${b} energies in your chart.`;
}

export function AspectDetailDialog({ chart, aspect, open, onOpenChange, onSelectPlanet }: Props) {
  if (!aspect) return null;
  const meaning = ASPECT_MEANING[aspect.aspect.name] ?? {
    title: aspect.aspect.name, angle: "", vibe: "A connection between two planets.", gift: "", growth: "",
  };
  const pA = chart.planets.find(p => p.body === aspect.a);
  const pB = chart.planets.find(p => p.body === aspect.b);
  const colorVar = ASPECT_COLOR_VAR[aspect.aspect.name] ?? "--aspect-neutral";
  const isApplying = aspect.aspect.orb < 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <span className="text-2xl" style={{ color: `hsl(var(${colorVar}))` }}>{ASPECT_GLYPH[aspect.aspect.name] ?? ""}</span>
            {planetDisplay(aspect.a)} {aspect.aspect.name} {planetDisplay(aspect.b)}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {meaning.angle} · orb {aspect.aspect.orb.toFixed(2)}°{isApplying ? " · tight" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            {pA && (
              <button
                onClick={() => { onOpenChange(false); onSelectPlanet?.(pA); }}
                className="flex-1 rounded-lg border border-border/40 bg-card/50 p-2.5 text-left hover:border-primary/40 hover:bg-card transition-colors"
              >
                <p className="text-[10px] text-muted-foreground">Planet</p>
                <p className="text-sm">{PLANET_GLYPH[pA.body]} {planetDisplay(pA.body)}</p>
                <p className="text-[11px] text-muted-foreground">in {pA.sign}{pA.house ? ` · H${pA.house}` : ""}</p>
              </button>
            )}
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            {pB && (
              <button
                onClick={() => { onOpenChange(false); onSelectPlanet?.(pB); }}
                className="flex-1 rounded-lg border border-border/40 bg-card/50 p-2.5 text-left hover:border-primary/40 hover:bg-card transition-colors"
              >
                <p className="text-[10px] text-muted-foreground">Planet</p>
                <p className="text-sm">{PLANET_GLYPH[pB.body]} {planetDisplay(pB.body)}</p>
                <p className="text-[11px] text-muted-foreground">in {pB.sign}{pB.house ? ` · H${pB.house}` : ""}</p>
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{meaning.title}</Badge>
            <Badge variant="outline">{meaning.angle}</Badge>
            {isApplying && <Badge variant="outline" className="text-primary border-primary/40">Tight orb</Badge>}
          </div>

          <div className="rounded-lg border border-border/50 bg-card/50 p-3 space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">The energy</p>
            <p className="leading-snug">{meaning.vibe}</p>
          </div>

          {pA && pB && (
            <div className="rounded-lg border border-border/50 bg-card/50 p-3 space-y-1.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">For you</p>
              <p className="leading-snug">This is {pairFlavor(pA.body as string, pB.body as string, aspect.aspect.name)}</p>
            </div>
          )}

          {meaning.gift && (
            <div className="rounded-lg border border-border/50 bg-card/50 p-3 space-y-1.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Gift</p>
              <p className="leading-snug">{meaning.gift}</p>
            </div>
          )}
          {meaning.growth && (
            <div className="rounded-lg border border-border/50 bg-card/50 p-3 space-y-1.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Growth edge</p>
              <p className="leading-snug">{meaning.growth}</p>
            </div>
          )}

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide text-primary flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Journal prompt
            </p>
            <p className="leading-snug">
              When have I felt my {planetDisplay(aspect.a)} and {planetDisplay(aspect.b)} working together — and what was the result?
            </p>
          </div>

          {pA && pB && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { onOpenChange(false); onSelectPlanet?.(pA); }}>
                Open {planetDisplay(pA.body)}
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { onOpenChange(false); onSelectPlanet?.(pB); }}>
                Open {planetDisplay(pB.body)}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}