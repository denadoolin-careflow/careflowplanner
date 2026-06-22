import {
  Tag as TagIcon, Sparkle, Heart, Star, Flag, Bookmark,
  Leaf, Sun, Moon, Compass, Flame, Cloud,
  Feather, Lightbulb, Rocket, Gem,
  Home, Briefcase, Baby, GraduationCap, ShoppingBag, Plane,
  Coffee, Music, BookOpen, Brush, Camera, MapPin, Smile,
  Pill, Stethoscope, Dumbbell, CalendarDays, Clock,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  tag: TagIcon, sparkle: Sparkle, heart: Heart, star: Star, flag: Flag, bookmark: Bookmark,
  leaf: Leaf, sun: Sun, moon: Moon, compass: Compass, flame: Flame, cloud: Cloud,
  feather: Feather, lightbulb: Lightbulb, rocket: Rocket, gem: Gem,
  home: Home, briefcase: Briefcase, baby: Baby, graduation: GraduationCap, shopping: ShoppingBag, plane: Plane,
  coffee: Coffee, music: Music, book: BookOpen, brush: Brush, camera: Camera, "map-pin": MapPin, smile: Smile,
  pill: Pill, stethoscope: Stethoscope, dumbbell: Dumbbell, calendar: CalendarDays, clock: Clock,
};

export function tagIconFor(name?: string): LucideIcon {
  if (!name) return TagIcon;
  return MAP[name.toLowerCase()] ?? TagIcon;
}

export const TAG_ICON_OPTIONS = Object.keys(MAP);

/** Themed groups for the picker UI. Order is render order. */
export const TAG_ICON_GROUPS: Array<{ label: string; icons: string[] }> = [
  { label: "Essentials",    icons: ["tag", "star", "heart", "flag", "bookmark", "sparkle", "lightbulb", "gem"] },
  { label: "Home & Family", icons: ["home", "baby", "coffee", "shopping", "brush", "music"] },
  { label: "Health",        icons: ["pill", "stethoscope", "dumbbell", "leaf", "feather", "smile"] },
  { label: "Work & Study",  icons: ["briefcase", "graduation", "book", "calendar", "clock", "rocket"] },
  { label: "Play & Travel", icons: ["plane", "map-pin", "camera", "compass", "flame", "sun"] },
  { label: "Sky",           icons: ["moon", "cloud"] },
];