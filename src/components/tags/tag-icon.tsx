import {
  Tag as TagIcon, Sparkle, Heart, Star, Flag, Bookmark,
  Leaf, Sun, Moon, Compass, Flame, Cloud,
  Feather, Lightbulb, Rocket, Gem,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  tag: TagIcon, sparkle: Sparkle, heart: Heart, star: Star, flag: Flag, bookmark: Bookmark,
  leaf: Leaf, sun: Sun, moon: Moon, compass: Compass, flame: Flame, cloud: Cloud,
  feather: Feather, lightbulb: Lightbulb, rocket: Rocket, gem: Gem,
};

export function tagIconFor(name?: string): LucideIcon {
  if (!name) return TagIcon;
  return MAP[name.toLowerCase()] ?? TagIcon;
}

export const TAG_ICON_OPTIONS = Object.keys(MAP);