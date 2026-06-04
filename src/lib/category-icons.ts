import {
  Wrench, Wind, Trees, Droplets, WashingMachine, Car, Zap, Flame, ShieldCheck,
  Hammer, Sparkles, Bug, Bath, Sofa, Trash2, type LucideIcon,
} from "lucide-react";

export type CategoryStyle = {
  icon: LucideIcon;
  tone: string;       // text + bg classes for the icon tile
  gradient: string;   // card gradient
  ring: string;       // ring color
};

const MAP: { match: RegExp; style: CategoryStyle }[] = [
  { match: /hvac|air|filter|furnace|heat|ac|cool/i, style: { icon: Wind, tone: "bg-sky-100/80 text-sky-700", gradient: "from-sky-100/70 to-sky-50/40", ring: "ring-sky-200/60" } },
  { match: /lawn|garden|yard|tree|hedge|grass|outdoor/i, style: { icon: Trees, tone: "bg-lime-100/80 text-lime-700", gradient: "from-lime-100/70 to-lime-50/40", ring: "ring-lime-200/60" } },
  { match: /plumb|water|leak|drain|pipe|faucet/i, style: { icon: Droplets, tone: "bg-cyan-100/80 text-cyan-700", gradient: "from-cyan-100/70 to-cyan-50/40", ring: "ring-cyan-200/60" } },
  { match: /appli|washer|dryer|fridge|dishwasher|oven/i, style: { icon: WashingMachine, tone: "bg-violet-100/80 text-violet-700", gradient: "from-violet-100/70 to-violet-50/40", ring: "ring-violet-200/60" } },
  { match: /car|vehicle|auto|tire|oil/i, style: { icon: Car, tone: "bg-stone-100/80 text-stone-700", gradient: "from-stone-100/70 to-stone-50/40", ring: "ring-stone-200/60" } },
  { match: /electric|outlet|wiring|bulb|light/i, style: { icon: Zap, tone: "bg-amber-100/80 text-amber-700", gradient: "from-amber-100/70 to-amber-50/40", ring: "ring-amber-200/60" } },
  { match: /fire|smoke|alarm|extinguisher/i, style: { icon: Flame, tone: "bg-rose-100/80 text-rose-700", gradient: "from-rose-100/70 to-rose-50/40", ring: "ring-rose-200/60" } },
  { match: /security|lock|alarm|camera/i, style: { icon: ShieldCheck, tone: "bg-emerald-100/80 text-emerald-700", gradient: "from-emerald-100/70 to-emerald-50/40", ring: "ring-emerald-200/60" } },
  { match: /repair|fix|handy/i, style: { icon: Hammer, tone: "bg-orange-100/80 text-orange-700", gradient: "from-orange-100/70 to-orange-50/40", ring: "ring-orange-200/60" } },
  { match: /clean|wash|polish/i, style: { icon: Sparkles, tone: "bg-fuchsia-100/80 text-fuchsia-700", gradient: "from-fuchsia-100/70 to-fuchsia-50/40", ring: "ring-fuchsia-200/60" } },
  { match: /pest|bug|rodent/i, style: { icon: Bug, tone: "bg-yellow-100/80 text-yellow-700", gradient: "from-yellow-100/70 to-yellow-50/40", ring: "ring-yellow-200/60" } },
  { match: /bath|toilet|shower/i, style: { icon: Bath, tone: "bg-violet-100/80 text-violet-700", gradient: "from-violet-100/70 to-violet-50/40", ring: "ring-violet-200/60" } },
  { match: /furniture|sofa|chair/i, style: { icon: Sofa, tone: "bg-stone-100/80 text-stone-700", gradient: "from-stone-100/70 to-stone-50/40", ring: "ring-stone-200/60" } },
  { match: /trash|garbage|recycle/i, style: { icon: Trash2, tone: "bg-zinc-100/80 text-zinc-700", gradient: "from-zinc-100/70 to-zinc-50/40", ring: "ring-zinc-200/60" } },
];

const DEFAULT_STYLE: CategoryStyle = {
  icon: Wrench,
  tone: "bg-muted text-foreground/70",
  gradient: "from-card to-card/60",
  ring: "ring-border/60",
};

export function categoryStyle(category?: string | null): CategoryStyle {
  if (!category) return DEFAULT_STYLE;
  const hit = MAP.find(m => m.match.test(category));
  return hit?.style ?? DEFAULT_STYLE;
}