import {
  Map, Leaf, Heart, Home, Folder, Sparkles, Briefcase, BookOpen, Camera,
  Music, Palette, Code2, Rocket, Star, Flag, Flame, Sun, Moon, Cloud,
  Coffee, Compass, Gift, Globe, Hammer, Lightbulb, ShoppingCart, Users,
  Calendar, CheckSquare, Pencil, Plane, Tent, Utensils, Wand2, Smile,
  Mountain, Trees, Flower2, Droplets, type LucideIcon,
} from "lucide-react";
import type { Project } from "@/lib/types";

const ICON_MAP: Record<string, LucideIcon> = {
  map: Map, leaf: Leaf, heart: Heart, home: Home, house: Home, folder: Folder,
  sparkles: Sparkles, sparkle: Sparkles, briefcase: Briefcase, work: Briefcase,
  book: BookOpen, reading: BookOpen, camera: Camera, photo: Camera,
  music: Music, palette: Palette, art: Palette, code: Code2, dev: Code2,
  rocket: Rocket, launch: Rocket, star: Star, flag: Flag, flame: Flame, fire: Flame,
  sun: Sun, moon: Moon, cloud: Cloud, coffee: Coffee, compass: Compass,
  gift: Gift, globe: Globe, travel: Globe, hammer: Hammer, build: Hammer,
  idea: Lightbulb, lightbulb: Lightbulb, shop: ShoppingCart, shopping: ShoppingCart,
  cart: ShoppingCart, grocery: ShoppingCart, team: Users, people: Users, family: Users,
  calendar: Calendar, task: CheckSquare, pencil: Pencil, write: Pencil, edit: Pencil,
  plane: Plane, trip: Plane, tent: Tent, camp: Tent, food: Utensils, meals: Utensils,
  magic: Wand2, smile: Smile, mountain: Mountain, tree: Trees, trees: Trees,
  flower: Flower2, water: Droplets,
};

// Match any unicode emoji / pictograph (covers most emoji ranges).
const EMOJI_RE = /\p{Extended_Pictographic}/u;

export function resolveProjectIcon(raw?: string | null): LucideIcon | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  if (EMOJI_RE.test(raw)) return null;
  return ICON_MAP[key] ?? null;
}

/** Compute a tint color (hex or hsl()) for the icon tile bg from project.color, with fallback. */
export function projectAccent(project: Pick<Project, "color">): string {
  return project.color?.trim() || "hsl(40 80% 65%)";
}

/**
 * Render the project's icon glyph: a Lucide icon when the name matches,
 * otherwise the raw emoji/text, with a sensible default leaf.
 */
export function ProjectIconGlyph({
  project,
  className = "h-5 w-5",
  fallback = "🌱",
}: {
  project: Pick<Project, "icon" | "color">;
  className?: string;
  fallback?: string;
}) {
  const Icon = resolveProjectIcon(project.icon);
  if (Icon) return <Icon className={className} />;
  if (project.icon && project.icon.trim()) {
    return <span className="leading-none">{project.icon}</span>;
  }
  return <span className="leading-none">{fallback}</span>;
}

/** Compute a soft background + readable foreground from a project's color. */
export function projectIconTileStyle(
  project: Pick<Project, "color">,
  opts?: { bgAlpha?: number },
): { background: string; color: string } {
  const c = project.color?.trim();
  if (!c) {
    return { background: "hsl(40 80% 92%)", color: "hsl(40 60% 28%)" };
  }
  const bgAlpha = opts?.bgAlpha ?? 0.18;
  // If it's a hex color, apply alpha via color-mix; else assume css color.
  const isHex = /^#([0-9a-f]{3,8})$/i.test(c);
  const bg = isHex
    ? `color-mix(in srgb, ${c} ${Math.round(bgAlpha * 100)}%, transparent)`
    : c;
  return { background: bg, color: c };
}